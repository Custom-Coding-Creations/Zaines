/**
 * Vaccine Expiry Reminder Email Template
 *
 * Sent 30, 7, and 1 day(s) before a pet's vaccine expires.
 * Urges the owner to upload fresh records before the next booking.
 */

import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './_components/Layout';
import { format } from 'date-fns';

export interface VaccineExpiryReminderProps {
  customerName?: string;
  petName?: string;
  vaccineType?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  recordsUrl?: string;
}

export function VaccineExpiryReminder({
  customerName = 'there',
  petName = 'your pet',
  vaccineType = 'vaccine',
  expiryDate = new Date().toISOString(),
  daysUntilExpiry = 7,
  recordsUrl = 'https://zainesstayandplay.com/dashboard/records',
}: VaccineExpiryReminderProps) {
  const formattedExpiry = format(new Date(expiryDate), 'MMMM d, yyyy');
  const urgencyEmoji = daysUntilExpiry <= 1 ? '🚨' : daysUntilExpiry <= 7 ? '⚠️' : '📋';
  const urgencyLabel =
    daysUntilExpiry <= 1
      ? 'expires tomorrow'
      : daysUntilExpiry <= 7
        ? `expires in ${daysUntilExpiry} days`
        : `expires in ${daysUntilExpiry} days`;

  const previewText = `${urgencyEmoji} ${petName}'s ${vaccineType} ${urgencyLabel} — upload new records to keep bookings open.`;

  return (
    <EmailLayout preview={previewText}>
      <Heading style={h1}>
        {urgencyEmoji} Vaccine Expiring Soon
      </Heading>

      <Text style={paragraph}>Hi {customerName},</Text>

      <Text style={paragraph}>
        This is a reminder that <strong>{petName}</strong>'s{' '}
        <strong>{vaccineType}</strong> record is set to expire on{' '}
        <strong>{formattedExpiry}</strong> ({urgencyLabel}).
      </Text>

      <Section style={alertBox}>
        <Text style={alertText}>
          🐾 Up-to-date vaccines are required for all stays at Zaine's Stay &amp;
          Play. To avoid any disruption to upcoming bookings, please upload a
          renewed certificate as soon as possible.
        </Text>
      </Section>

      <Section style={ctaSection}>
        <Button href={recordsUrl} style={ctaButton}>
          Upload Vaccine Records
        </Button>
      </Section>

      <Hr style={hr} />

      <Text style={footerNote}>
        <strong>Required vaccines:</strong> Rabies, DHPP, and Bordetella. If
        you have any questions about accepted documentation, reply to this email
        or call us — we're happy to help.
      </Text>

      <Text style={footerNote}>
        If you've already uploaded updated records, you can ignore this reminder.
        Thank you for keeping {petName} and the whole pack safe! 🐶
      </Text>
    </EmailLayout>
  );
}

export default VaccineExpiryReminder;

/* ── Styles ── */

const h1 = {
  fontSize: '24px',
  fontWeight: '700' as const,
  lineHeight: '32px',
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333333',
  margin: '0 0 16px',
};

const alertBox = {
  backgroundColor: '#fef9c3',
  borderLeft: '4px solid #ca8a04',
  borderRadius: '4px',
  padding: '16px',
  margin: '24px 0',
};

const alertText = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#713f12',
  margin: 0,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const ctaButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '24px 0',
};

const footerNote = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#666666',
  margin: '0 0 12px',
};
