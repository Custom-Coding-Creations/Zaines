import * as React from 'react';
import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './_components/Layout';

type ReminderType = 'check_in' | 'pick_up' | 'rebook' | 'vaccine' | 'assessment';

const REMINDER_COPY: Record<ReminderType, { subject: string; body: string; cta: string }> = {
  check_in: {
    subject: "Your pet's stay starts soon — here's what to bring",
    body: "Just a friendly reminder that your pet's stay is coming up! Please make sure to bring their food, any medications, and vaccination records if you haven't shared them with us yet.",
    cta: "View Booking Details",
  },
  pick_up: {
    subject: "Pick-up reminder for today",
    body: "Just a reminder that today is pick-up day! Please ensure someone is available during your scheduled pick-up window. We look forward to seeing you.",
    cta: "View Booking Details",
  },
  rebook: {
    subject: "We'd love to see your pup again",
    body: "It's been a while since your last visit and we'd love to have your pup back! Check availability for their next stay.",
    cta: "Check Availability",
  },
  vaccine: {
    subject: "Vaccination records need updating",
    body: "One or more of your pet's vaccination records are expiring soon. Please upload updated records to your dashboard to ensure your pet can continue to stay with us.",
    cta: "Update Records",
  },
  assessment: {
    subject: "Assessment reminder",
    body: "Your pet's assessment is coming up. Please make sure they are up to date on all vaccinations and that you've completed any required forms.",
    cta: "View Details",
  },
};

interface AutomatedReminderProps {
  customerName?: string;
  petName?: string;
  reminderType?: ReminderType;
  checkInDate?: string;
  dashboardUrl?: string;
}

export function AutomatedReminder({
  customerName = 'there',
  petName = 'your dog',
  reminderType = 'check_in',
  checkInDate,
  dashboardUrl = 'https://zainesstayandplay.com/dashboard',
}: AutomatedReminderProps) {
  const copy = REMINDER_COPY[reminderType];
  return (
    <EmailLayout preview={`${copy.subject} — ${petName}`}>
      <Heading style={h1}>{copy.subject}</Heading>
      <Text style={text}>Hi {customerName},</Text>
      {checkInDate && (
        <Text style={dateChip}>
          📅 {checkInDate}
        </Text>
      )}
      <Text style={text}>{copy.body}</Text>
      <Button href={dashboardUrl} style={button}>
        {copy.cta}
      </Button>
      <Text style={mutedText}>
        Questions? Call us at (315) 765-7297.
      </Text>
    </EmailLayout>
  );
}

const h1 = { fontSize: '22px', fontWeight: '700', color: '#18212a', margin: '0 0 16px' };
const text = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' };
const dateChip = {
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600',
  color: '#1d4ed8',
  backgroundColor: '#dbeafe',
  padding: '6px 14px',
  borderRadius: '20px',
  margin: '0 0 16px',
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

export default AutomatedReminder;
