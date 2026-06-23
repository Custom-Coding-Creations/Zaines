import * as React from 'react';
import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './_components/Layout';

interface ReportCardProps {
  customerName?: string;
  petName?: string;
  bookingNumber?: string;
  highlights?: string[];
  dashboardUrl?: string;
}

export function ReportCard({
  customerName = 'there',
  petName = 'your dog',
  bookingNumber,
  highlights = ['Ate all meals with great enthusiasm', 'Played well with the group', 'Slept through the night'],
  dashboardUrl = 'https://zainesstayandplay.com/dashboard',
}: ReportCardProps) {
  return (
    <EmailLayout preview={`${petName}'s report card is ready`}>
      <Heading style={h1}>{petName}'s Report Card</Heading>
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        Here's a quick update on how {petName} is doing{bookingNumber ? ` during booking ${bookingNumber}` : ''}. Everything is going great!
      </Text>
      <div style={highlightsBox}>
        <Text style={highlightsTitle}>Highlights from today:</Text>
        {highlights.map((h, i) => (
          <Text key={i} style={highlightItem}>
            ✅ {h}
          </Text>
        ))}
      </div>
      <Button href={dashboardUrl} style={button}>
        View Full Report
      </Button>
      <Text style={mutedText}>
        Log into your dashboard to see photos and more details from {petName}'s stay.
      </Text>
    </EmailLayout>
  );
}

const h1 = { fontSize: '24px', fontWeight: '700', color: '#18212a', margin: '0 0 16px' };
const text = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' };
const highlightsBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 24px',
};
const highlightsTitle = { fontSize: '14px', fontWeight: '600', color: '#15803d', margin: '0 0 8px' };
const highlightItem = { fontSize: '14px', lineHeight: '1.5', color: '#374151', margin: '4px 0' };
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

export default ReportCard;
