import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { staffMemberSchema } from '@/lib/validations/staff';
import type { ApiResponse } from '@/types/admin';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const staff = await prisma.staffMember.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        schedules: {
          orderBy: { date: 'asc' },
          take: 5,
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: staff } as ApiResponse<typeof staff>);
  } catch (error) {
    console.error('Failed to load staff', error);
    return NextResponse.json({ error: 'Failed to load staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = (await request.json()) as unknown;
    const parsed = staffMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const created = await prisma.staffMember.create({
      data: {
        userId: payload.userId,
        role: payload.role,
        phone: payload.phone,
        hireDate: payload.hireDate ? new Date(payload.hireDate) : null,
        certifications: payload.certifications,
        emergencyContact: payload.emergencyContact,
        notes: payload.notes,
        isActive: payload.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: created } as ApiResponse<typeof created>,
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create staff member', error);
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
  }
}
