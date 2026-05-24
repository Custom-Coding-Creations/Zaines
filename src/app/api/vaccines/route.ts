import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { vaccineSchema } from '@/lib/validations/vaccine';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const petId = searchParams.get('petId');

  // Build query based on whether petId is provided
  const whereClause = petId
    ? { pet: { id: petId, userId: session.user.id } }
    : { pet: { userId: session.user.id } };

  const vaccines = await prisma.vaccine.findMany({
    where: whereClause,
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          userId: true,
        },
      },
    },
    orderBy: { expiryDate: 'asc' },
  });

  const response = NextResponse.json({ vaccines });
  // Cache for 60 seconds; vaccines change infrequently and the list is user-scoped
  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  return response;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const { petId, ...vaccineData } = body as { petId?: string };

  if (!petId) {
    return NextResponse.json({ error: 'petId is required' }, { status: 400 });
  }

  // Verify pet ownership
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { userId: true },
  });

  if (!pet) {
    return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
  }

  if (pet.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = vaccineSchema.safeParse(vaccineData);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const vaccine = await prisma.vaccine.create({
    data: {
      ...result.data,
      petId,
      administeredDate: new Date(result.data.administeredDate),
      expiryDate: new Date(result.data.expiryDate),
    },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ vaccine }, { status: 201 });
}
