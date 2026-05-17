import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueAutomatedReminders, generateAutomatedReminders } from '@/lib/reminders';
import { getCorrelationId, errorResponse, logServerFailure } from '@/lib/security/api';
import { logSecurityEvent } from '@/lib/security/logging';

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return bearer === configuredSecret || headerSecret === configuredSecret;
}

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  if (!isAuthorized(request)) {
    return errorResponse({
      status: 401,
      errorCode: 'CRON_UNAUTHORIZED',
      message: 'Cron authorization failed.',
      retryable: false,
      correlationId,
    });
  }

  try {
    const generation = await generateAutomatedReminders();
    const dispatch = await dispatchDueAutomatedReminders(100);

    logSecurityEvent({
      route: '/api/cron/reminders',
      event: 'REMINDERS_CRON_RAN',
      correlationId,
      context: {
        generated: generation.generated,
        dispatched: dispatch.dispatched,
        queued: dispatch.queued,
      },
    });

    return NextResponse.json({
      success: true,
      correlationId,
      data: {
        generated: generation.generated,
        dispatched: dispatch.dispatched,
        queued: dispatch.queued,
      },
    });
  } catch (error) {
    logServerFailure('/api/cron/reminders', 'REMINDERS_CRON_FAILED', correlationId, error);
    return errorResponse({
      status: 500,
      errorCode: 'REMINDERS_CRON_FAILED',
      message: 'Reminder cron execution failed.',
      retryable: true,
      correlationId,
    });
  }
}
