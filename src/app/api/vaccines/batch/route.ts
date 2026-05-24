import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { vaccineSchema } from '@/lib/validations/vaccine';

const batchItemSchema = vaccineSchema.extend({ petId: z.string().min(1) });

const batchRequestSchema = z.object({
  vaccines: z
    .array(batchItemSchema)
    .min(1, 'At least one vaccine is required')
    .max(50, 'Maximum 50 vaccines per batch'),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = batchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { vaccines } = parsed.data;

  // Collect unique pet IDs and verify ownership in one query
  const petIds = [...new Set(vaccines.map((v) => v.petId))];
  const ownedPets = await prisma.pet.findMany({
    where: { id: { in: petIds }, userId: session.user.id },
    select: { id: true },
  });
  const ownedPetIdSet = new Set(ownedPets.map((p) => p.id));

  const unauthorizedPets = petIds.filter((id) => !ownedPetIdSet.has(id));
  if (unauthorizedPets.length > 0) {
    return NextResponse.json(
      { error: 'One or more pets not found or not owned by you' },
      { status: 403 },
    );
  }

  // Create all vaccines in a transaction
  const created = await prisma.$transaction(
    vaccines.map(({ petId, administeredDate, expiryDate, ...rest }) =>
      prisma.vaccine.create({
        data: {
          ...rest,
          petId,
          administeredDate: new Date(administeredDate),
          expiryDate: new Date(expiryDate),
        },
        include: { pet: { select: { id: true, name: true } } },
      }),
    ),
  );

  return NextResponse.json({ vaccines: created, count: created.length }, { status: 201 });
}
