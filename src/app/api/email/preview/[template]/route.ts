import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import BookingConfirmation from '@/emails/BookingConfirmation';
import PhotoDigest from '@/emails/PhotoDigest';
import PaymentReceipt from '@/emails/PaymentReceipt';
import WelcomeEmail from '@/emails/WelcomeEmail';
import VaccineExpiryReminder from '@/emails/VaccineExpiryReminder';
import PasswordReset from '@/emails/PasswordReset';
import BookingClaim from '@/emails/BookingClaim';
import OwnerNotification from '@/emails/OwnerNotification';
import IncidentNotification from '@/emails/IncidentNotification';
import ReportCard from '@/emails/ReportCard';
import AutomatedReminder from '@/emails/AutomatedReminder';

const AVAILABLE = [
  'booking-confirmation',
  'photo-digest',
  'payment-receipt',
  'welcome',
  'vaccine-expiry',
  'password-reset',
  'booking-claim',
  'owner-notification',
  'incident-notification',
  'report-card',
  'automated-reminder',
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ template: string }> }
) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Email previews only available in development mode' },
      { status: 403 }
    );
  }

  const { template } = await params;

  let html: string;
  try {
    switch (template) {
      case 'booking-confirmation':
        html = await render(BookingConfirmation({
          customerName: 'Sarah Johnson',
          bookingNumber: 'ZSP-20260601-001',
          checkInDate: '2026-06-15',
          checkOutDate: '2026-06-17',
          suiteType: 'Deluxe Suite',
          suitePrice: 85,
          nights: 2,
          petNames: ['Buddy', 'Max'],
          subtotal: 195,
          tax: 15.6,
          total: 210.6,
          addOns: [{ name: 'Extra Walk', price: 10 }, { name: 'Nail Trim', price: 15 }],
        }));
        break;
      case 'photo-digest':
        html = await render(PhotoDigest({
          customerName: 'Sarah Johnson',
          petName: 'Buddy',
          date: new Date().toISOString(),
          bookingNumber: 'ZSP-20260601-001',
          photos: [
            { url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600', caption: 'Playing in the yard!', timestamp: new Date().toISOString() },
            { url: 'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=600', caption: 'Relaxing', timestamp: new Date().toISOString() },
          ],
        }));
        break;
      case 'payment-receipt':
        html = await render(PaymentReceipt({
          customerName: 'Sarah Johnson',
          receiptNumber: 'RCT-20260601-001',
          paymentDate: new Date().toISOString(),
          bookingNumber: 'ZSP-20260601-001',
          paymentMethod: 'Visa',
          lastFourDigits: '4242',
          items: [{ description: 'Deluxe Suite (2 nights)', quantity: 2, unitPrice: 85, total: 170 }],
          subtotal: 170,
          tax: 13.6,
          total: 183.6,
        }));
        break;
      case 'welcome':
        html = await render(WelcomeEmail({ customerName: 'Sarah Johnson' }));
        break;
      case 'vaccine-expiry':
        html = await render(VaccineExpiryReminder({
          customerName: 'Sarah',
          petName: 'Buddy',
          vaccineType: 'Rabies',
          expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          daysUntilExpiry: 7,
        }));
        break;
      case 'password-reset':
        html = await render(PasswordReset({
          firstName: 'Sarah',
          resetUrl: 'https://zainesstayandplay.com/reset-password?token=preview',
          expiryMinutes: 60,
        }));
        break;
      case 'booking-claim':
        html = await render(BookingClaim({
          firstName: 'Sarah',
          bookingNumber: 'PB-20260622-0001',
          claimUrl: 'https://zainesstayandplay.com/claim?token=preview',
          expiryHours: 48,
        }));
        break;
      case 'owner-notification':
        html = await render(OwnerNotification({
          bookingNumber: 'PB-20260622-0001',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah@example.com',
          petNames: ['Buddy'],
          checkInDate: 'June 25, 2026',
          checkOutDate: 'June 28, 2026',
          suiteType: 'Deluxe Suite',
          total: '$255.00',
          detailsUrl: 'https://zainesstayandplay.com/admin/bookings/preview',
        }));
        break;
      case 'incident-notification':
        html = await render(IncidentNotification({
          customerName: 'Sarah',
          petName: 'Buddy',
          summary: 'Buddy had a minor scrape on his paw during playtime. He is comfortable and being monitored.',
          dashboardUrl: 'https://zainesstayandplay.com/dashboard',
        }));
        break;
      case 'report-card':
        html = await render(ReportCard({
          customerName: 'Sarah',
          petName: 'Buddy',
          highlights: ['Ate all meals with great enthusiasm', 'Played well with the group', 'Slept through the night'],
          dashboardUrl: 'https://zainesstayandplay.com/dashboard',
        }));
        break;
      case 'automated-reminder':
        html = await render(AutomatedReminder({
          customerName: 'Sarah',
          petName: 'Buddy',
          reminderType: 'check_in',
          checkInDate: 'June 25, 2026',
          dashboardUrl: 'https://zainesstayandplay.com/dashboard',
        }));
        break;
      default:
        return NextResponse.json(
          { error: 'Template not found', available: AVAILABLE },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Error rendering email template:', error);
    return NextResponse.json(
      { error: 'Failed to render template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
