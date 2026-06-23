import * as React from 'react';
import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './_components/Layout';

interface IncidentNotificationProps {
  customerName?: string;
  petName?: string;
  bookingNumber?: string;
  summary?: string;
  dashboardUrl?: string;
}

export function IncidentNotification({
  customerName = 'there',
  petName = 'your pet',
  bookingNumber,
  summary = 'We wanted to keep you informed about a minor incident during your pet\'s stay.',
  dashboardUrl = 'https://zainesstayandplay.com/dashboard',
}: IncidentNotificationProps) {
  return (
    <EmailLayout preview={`Important update about ${petName}'s stay`}>
      <Heading style={h1}>Important update about {petName}</Heading>
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        We want to keep you fully informed about {petName}'s stay{bookingNumber ? ` (booking ${bookingNumber})` : ''}.
      </Text>
      <Text style={body}>{summary}</Text>
      <Text style={text}>
        {petName} is being well cared for and we will continue to monitor the situation closely. Please don't hesitate to reach out if you have any questions.
      </Text>
      <Button href={dashboardUrl} style={button}>
        View Booking Details
      </Button>
      <Text style={mutedText}>
        You can always reach us by phone at (315) 765-7297 if you'd like to speak with us directly.
      </Text>
    </EmailLayout>
  );
}

const h1 = { fontSize: '24px', fontWeight: '700', color: '#18212a', margin: '0 0 16px' };
const text = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' };
const body = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
  padding: '16px',
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #d97706',
  borderRadius: '4px',
};
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

export default IncidentNotification;
