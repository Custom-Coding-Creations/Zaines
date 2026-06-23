import * as React from 'react';
import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './_components/Layout';

interface OwnerNotificationProps {
  bookingNumber?: string;
  customerName?: string;
  customerEmail?: string;
  petNames?: string[];
  checkInDate?: string;
  checkOutDate?: string;
  suiteType?: string;
  total?: string;
  specialRequests?: string;
  detailsUrl?: string;
}

export function OwnerNotification({
  bookingNumber = 'PB-20260622-0001',
  customerName = 'Sarah Johnson',
  customerEmail = 'sarah@example.com',
  petNames = ['Buddy'],
  checkInDate = 'June 25, 2026',
  checkOutDate = 'June 28, 2026',
  suiteType = 'Deluxe Suite',
  total = '$255.00',
  specialRequests,
  detailsUrl = 'https://zainesstayandplay.com/admin/bookings',
}: OwnerNotificationProps) {
  return (
    <EmailLayout preview={`New booking: ${bookingNumber} — ${petNames.join(', ')}`}>
      <Heading style={h1}>New Booking Received</Heading>
      <Text style={text}>A new booking has been submitted and is pending your review.</Text>

      <div style={card}>
        <Text style={cardTitle}>Booking Summary</Text>
        <Row label="Booking #" value={bookingNumber} />
        <Row label="Customer" value={`${customerName} (${customerEmail})`} />
        <Row label="Pet(s)" value={petNames.join(', ')} />
        <Row label="Suite" value={suiteType} />
        <Row label="Check-in" value={checkInDate} />
        <Row label="Check-out" value={checkOutDate} />
        <Row label="Total" value={total} bold />
        {specialRequests && <Row label="Special Requests" value={specialRequests} />}
      </div>

      <Button href={detailsUrl} style={button}>
        View in Dashboard
      </Button>
    </EmailLayout>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={row}>
      <span style={rowLabel}>{label}:</span>
      <span style={bold ? rowValueBold : rowValue}>{value}</span>
    </div>
  );
}

const h1 = { fontSize: '24px', fontWeight: '700', color: '#18212a', margin: '0 0 16px' };
const text = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 20px' };
const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '0 0 24px',
};
const cardTitle = { fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 12px' };
const row = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' };
const rowLabel = { fontSize: '14px', color: '#64748b', fontWeight: '500' };
const rowValue = { fontSize: '14px', color: '#18212a' };
const rowValueBold = { fontSize: '14px', color: '#18212a', fontWeight: '700' };
const button = {
  display: 'inline-block',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '15px',
  textDecoration: 'none',
  margin: '8px 0 0',
};

export default OwnerNotification;
