/* eslint-disable @typescript-eslint/no-explicit-any */
/* Worker to process emailQueue using BullMQ. Requires REDIS_URL env var. */

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('REDIS_URL is not set. Worker exiting.');
    process.exit(1);
  }

  // Lazy import so repo can run without bullmq installed when not used
  const { Worker } = (await import('bullmq')) as any;

  // Load notifications helper (which exposes sendEmailViaResend indirectly via functions)
  const notifications = (await import('../src/lib/notifications')) as any;

  async function deliverRawEmail(entry: any) {
    if (!process.env.RESEND_API_KEY || !entry?.to || !entry?.subject || !entry?.html) {
      return;
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: entry.from || process.env.EMAIL_FROM || 'noreply@pawfectstays.com',
        to: entry.to,
        subject: entry.subject,
        html: entry.html,
      }),
    });
  }

  const worker = new Worker('emailQueue', async (job: any) => {
    const entry = job.data.entry;
    if (!entry || !entry.type) return;

    try {
      // Use internal sendEmailViaResend by calling sendBookingConfirmation/payments
      if (entry.type === 'booking_confirmation') {
        await notifications.sendBookingConfirmation({ user: { email: entry.to, name: '' }, bookingNumber: entry.bookingId || 'n/a', status: 'queued' });
      } else if (entry.type === 'payment_notification') {
        await notifications.sendPaymentNotification(entry.bookingId || 'unknown', entry.status === 'success' ? 'success' : 'failure', { user: { email: entry.to } });
      } else if (
        entry.type === 'automated_reminder' ||
        entry.type === 'report_card_notification' ||
        entry.type === 'incident_notification'
      ) {
        await deliverRawEmail(entry);
      }
      return Promise.resolve();
    } catch (err) {
      console.error('Failed to process job', err);
      throw err;
    }
  }, { connection: { url: redisUrl } });

  worker.on('completed', (job: any) => {
    console.log('Job completed', job.id);
  });

  worker.on('failed', (job: any, err: any) => {
    console.error('Job failed', job.id, err);
  });

  console.log('Worker started, processing emailQueue...');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
