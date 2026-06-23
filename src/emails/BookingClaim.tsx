import * as React from 'react';
import { Button, Heading, Link, Text } from '@react-email/components';
import { EmailLayout } from './_components/Layout';

interface BookingClaimProps {
  firstName?: string;
  bookingNumber?: string;
  claimUrl?: string;
  expiryHours?: number;
}

export function BookingClaim({
  firstName = 'there',
  bookingNumber = 'PB-20260622-0001',
  claimUrl = 'https://zainesstayandplay.com/claim',
  expiryHours = 48,
}: BookingClaimProps) {
  return (
    <EmailLayout preview={`Claim booking ${bookingNumber} in your Zaine's Stay & Play dashboard`}>
      <Heading style={h1}>Your booking is ready to claim</Heading>
      <Text style={text}>Hi {firstName},</Text>
      <Text style={text}>
        A booking ({bookingNumber}) has been created for you. Click below to create your account and access all the details, photos, and updates for your pet's stay.
      </Text>
      <Button href={claimUrl} style={button}>
        Claim Booking
      </Button>
      <Text style={mutedText}>
        This link expires in {expiryHours} hours. After that, contact us directly to get access to your booking.
      </Text>
      <Text style={mutedText}>
        Or copy and paste this URL:{' '}
        <Link href={claimUrl} style={link}>{claimUrl}</Link>
      </Text>
    </EmailLayout>
  );
}

const h1 = { fontSize: '24px', fontWeight: '700', color: '#18212a', margin: '0 0 16px' };
const text = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' };
const mutedText = { fontSize: '13px', lineHeight: '1.5', color: '#6b7280', margin: '16px 0 0' };
const button = {
  display: 'inline-block',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '15px',
  textDecoration: 'none',
  margin: '8px 0 16px',
};
const link = { color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all' as const };

export default BookingClaim;
