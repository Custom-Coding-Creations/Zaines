import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { validateFile } from '@/lib/file-upload';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_BORDER_STYLES = new Set(['none', 'polaroid', 'gold', 'paw']);

function normalizeTextField(value: FormDataEntryValue | null, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.slice(0, maxLength);
}

async function storeFile(file: File, folderKey: string): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const isVercelRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

  const uploadToBlob = async (token?: string): Promise<string> => {
    const { put } = await import('@vercel/blob');
    const key = `photos/${folderKey}/${Date.now()}-${file.name}`;
    const blob = token
      ? await put(key, file, { access: 'public', token })
      : await put(key, file, { access: 'public' });
    return blob.url;
  };

  if (blobToken) {
    try {
      return await uploadToBlob(blobToken);
    } catch (blobError) {
      const errorMessage =
        blobError instanceof Error ? blobError.message : 'Unknown Vercel Blob error';
      console.error(`[Photo Upload] Vercel Blob storage failed: ${errorMessage}`, {
        file: file.name,
        folderKey,
        error: blobError,
      });

      // Retry once without explicit token in hosted environments.
      if (isVercelRuntime) {
        try {
          return await uploadToBlob();
        } catch (secondaryBlobError) {
          const secondaryMessage =
            secondaryBlobError instanceof Error
              ? secondaryBlobError.message
              : 'Unknown Vercel Blob fallback error';
          throw new Error(`Photo storage service temporarily unavailable: ${secondaryMessage}`);
        }
      }

      throw new Error(`Photo storage service temporarily unavailable: ${errorMessage}`);
    }
  }

  // In Vercel runtime, local filesystem writes are not reliable/persistent.
  if (isVercelRuntime) {
    try {
      return await uploadToBlob();
    } catch (blobError) {
      const errorMessage = blobError instanceof Error ? blobError.message : 'Unknown Vercel Blob error';
      console.error(`[Photo Upload] Blob upload without token failed: ${errorMessage}`, {
        file: file.name,
        folderKey,
        error: blobError,
      });
      throw new Error('Photo storage is not configured. Please configure Vercel Blob for uploads.');
    }
  }

  // Local fallback for development/test environments.
  try {
    const localDir = path.join(process.cwd(), 'public', 'uploads', 'pet-photos');
    await mkdir(localDir, { recursive: true });

    const extension = path.extname(file.name) || '.jpg';
    const localName = `${Date.now()}-${randomUUID()}${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(localDir, localName), buffer);

    return `/uploads/pet-photos/${localName}`;
  } catch (fsError) {
    const errorMessage = fsError instanceof Error ? fsError.message : 'Unknown file system error';
    console.error(`[Photo Upload] Local file storage failed: ${errorMessage}`, {
      file: file.name,
      folderKey,
      error: fsError,
    });
    throw new Error(`Photo storage failed: ${errorMessage}`);
  }
}

async function storeInlineDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'image/jpeg';
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

export async function GET(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ photos: [] });
  }

  const bookingId = request.nextUrl.searchParams.get('bookingId')?.trim();
  const includeUnassigned = request.nextUrl.searchParams.get('includeUnassigned') === 'true';
  const take = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? '30') || 30, 100);

  const photos = await prisma.petPhoto.findMany({
    where: bookingId
      ? { bookingId }
      : includeUnassigned
        ? {
            OR: [
              {
                booking: {
                  status: 'checked_in',
                },
              },
              {
                bookingId: null,
              },
            ],
          }
        : {
            booking: {
              status: 'checked_in',
            },
          },
    include: {
      pet: {
        select: { id: true, name: true, breed: true },
      },
      booking: {
        select: { id: true, bookingNumber: true, status: true },
      },
    },
    orderBy: { uploadedAt: 'desc' },
    take,
  });

  return NextResponse.json({ photos });
}

export async function POST(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const session = authResult.session;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Parse FormData with explicit error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      const errorMessage =
        parseError instanceof Error ? parseError.message : 'Unknown FormData parsing error';
      console.error(`[Photo Upload] FormData parsing failed: ${errorMessage}`, {
        error: parseError,
      });
      return NextResponse.json(
        { error: `Unable to process photo upload: ${errorMessage}` },
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const bookingId = formData.get('bookingId');
    const petId = formData.get('petId');
    const caption = formData.get('caption');
    const message = formData.get('message');
    const sendMessage = formData.get('sendMessage');
    const decorativeBorder = formData.get('decorativeBorder');
    const decorativeEmoji = formData.get('decorativeEmoji');
    const file = formData.get('file');

    if (!petId || typeof petId !== 'string') {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const validation = validateFile(file, ALLOWED_IMAGE_TYPES, IMAGE_MAX_SIZE);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error ?? 'Invalid file' }, { status: 400 });
    }

    const normalizedBorder =
      typeof decorativeBorder === 'string' && ALLOWED_BORDER_STYLES.has(decorativeBorder)
        ? decorativeBorder
        : 'none';
    const normalizedEmoji = normalizeTextField(decorativeEmoji ?? null, 8);
    const normalizedCaption = normalizeTextField(caption ?? null, 200);
    const normalizedMessage = normalizeTextField(message ?? null, 5000);
    const shouldCreateMessage =
      typeof sendMessage === 'string' ? sendMessage === 'true' : Boolean(normalizedMessage);

    const resolvedBookingId =
      typeof bookingId === 'string' && bookingId.trim() ? bookingId.trim() : null;

    let ownerUserId: string;
    if (resolvedBookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: resolvedBookingId },
        include: {
          bookingPets: {
            select: { petId: true },
          },
        },
      });

      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      if (booking.status !== 'checked_in') {
        return NextResponse.json(
          { error: `Cannot upload photo for booking with status: ${booking.status}` },
          { status: 409 },
        );
      }

      const petRecord = await prisma.pet.findUnique({
        where: { id: petId },
        select: { userId: true },
      });

      if (!petRecord) {
        return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
      }

      const petIsOnBooking = booking.bookingPets.some((bp) => bp.petId === petId);
      const bookingHasNoPetLinks = booking.bookingPets.length === 0;
      const petBelongsToBookingOwner = petRecord.userId === booking.userId;

      if (!petIsOnBooking && !(bookingHasNoPetLinks && petBelongsToBookingOwner)) {
        return NextResponse.json(
          { error: 'Pet is not assigned to this booking' },
          { status: 409 },
        );
      }

      ownerUserId = booking.userId;
    } else {
      const pet = await prisma.pet.findUnique({
        where: { id: petId },
        select: { userId: true },
      });

      if (!pet) {
        return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
      }

      ownerUserId = pet.userId;
    }

    // Store file with error handling
    let imageUrl: string;
    try {
      const storageFolderKey = resolvedBookingId ?? `account-${ownerUserId}`;
      imageUrl = await storeFile(file, storageFolderKey);
    } catch (storageError) {
      const errorMessage =
        storageError instanceof Error ? storageError.message : 'Unknown storage error';
      console.error(`[Photo Upload] File storage failed: ${errorMessage}`, {
        petId,
        bookingId: resolvedBookingId,
        error: storageError,
      });

      // Last-resort fallback: inline Data URL storage keeps staff workflow alive
      // when Blob/local filesystem storage is temporarily unavailable.
      try {
        imageUrl = await storeInlineDataUrl(file);
      } catch (inlineError) {
        const inlineErrorMessage =
          inlineError instanceof Error ? inlineError.message : 'Unknown inline storage error';
        console.error(`[Photo Upload] Inline Data URL fallback failed: ${inlineErrorMessage}`, {
          petId,
          bookingId: resolvedBookingId,
          error: inlineError,
        });
        return NextResponse.json(
          { error: errorMessage },
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    const uploadedBy = session.user!.name ?? session.user!.email ?? session.user!.id;
    const decoratedCaption = [normalizedEmoji, normalizedCaption].filter(Boolean).join(' ');

    let messageContent = [normalizedEmoji, normalizedMessage].filter(Boolean).join(' ');
    if (shouldCreateMessage && !messageContent && decoratedCaption) {
      messageContent = `New photo update: ${decoratedCaption}`;
    }

    // Database operations with error handling
    let photo, createdMessage;
    try {
      [photo, createdMessage] = await prisma.$transaction(async (tx) => {
        const createdPhoto = await tx.petPhoto.create({
          data: {
            bookingId: resolvedBookingId,
            userId: ownerUserId,
            petId,
            imageUrl,
            caption: decoratedCaption || null,
            uploadedBy,
          },
          include: {
            pet: { select: { id: true, name: true, breed: true } },
            booking: { select: { id: true, bookingNumber: true, status: true } },
          },
        });

        if (!shouldCreateMessage || !messageContent) {
          return [createdPhoto, null] as const;
        }

        const newMessage = await tx.message.create({
          data: {
            bookingId: resolvedBookingId,
            userId: ownerUserId,
            senderType: 'staff',
            senderName: uploadedBy,
            content: messageContent,
            isRead: false,
            sentAt: new Date(),
          },
          select: {
            id: true,
            content: true,
            senderType: true,
            senderName: true,
            sentAt: true,
            isRead: true,
          },
        });

        return [createdPhoto, newMessage] as const;
      });
    } catch (dbError) {
      const errorMessage =
        dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.error(`[Photo Upload] Database operation failed: ${errorMessage}`, {
        petId,
        bookingId: resolvedBookingId,
        error: dbError,
      });
      return NextResponse.json(
        { error: `Unable to save photo: ${errorMessage}` },
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return NextResponse.json({ photo, message: createdMessage }, { status: 201 });
  } catch (unexpectedError) {
    const errorMessage =
      unexpectedError instanceof Error
        ? unexpectedError.message
        : 'Unknown unexpected error';
    console.error(`[Photo Upload] Unexpected error: ${errorMessage}`, {
      error: unexpectedError,
    });
    return NextResponse.json(
      { error: 'Photo upload failed. Please try again.' },
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
