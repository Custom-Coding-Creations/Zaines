import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/api/admin-finance-auth';
import { getFinanceExceptions } from '@/lib/api/admin-finance';

export async function GET(_request: NextRequest) {
  try {
    const access = await requireFinanceAccess('read');
    if (access.response) return access.response;

    const data = await getFinanceExceptions();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching finance exceptions:', error);
    return NextResponse.json(
      {
        error: 'Finance exceptions service unavailable',
        code: 'FINANCE_EXCEPTIONS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
