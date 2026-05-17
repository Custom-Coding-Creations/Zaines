import { NextRequest, NextResponse } from 'next/server';
import { getFinanceTransactions } from '@/lib/api/admin-finance';
import { requireFinanceAccess } from '@/lib/api/admin-finance-auth';

type ParsedDate = { value?: Date; invalid: boolean };

function parseDate(value: string | null, boundary: 'start' | 'end'): ParsedDate {
  if (!value) return { invalid: false };

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = dateOnly
    ? new Date(`${value}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`)
    : new Date(value);

  if (Number.isNaN(parsed.getTime())) return { invalid: true };
  return { value: parsed, invalid: false };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireFinanceAccess('read');
    if (access.response) return access.response;

    const { searchParams } = new URL(request.url);
    const startDate = parseDate(searchParams.get('startDate'), 'start');
    const endDate = parseDate(searchParams.get('endDate'), 'end');

    if (startDate.invalid || endDate.invalid) {
      return NextResponse.json(
        { error: 'Invalid date parameter' },
        { status: 400 },
      );
    }

    const data = await getFinanceTransactions({
      startDate: startDate.value,
      endDate: endDate.value,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching finance transactions:', error);
    return NextResponse.json(
      {
        error: 'Finance transaction service unavailable',
        code: 'FINANCE_TRANSACTIONS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
