import * as React from 'react';
import { Button, Heading, Link, Text } from '@react-email/components';
import { EmailLayout } from './_components/Layout';

interface PasswordResetProps {
  firstName?: string;
  resetUrl?: string;
  expiryMinutes?: number;
}

export function PasswordReset({
  firstName = 'there',
  resetUrl = 'https://zainesstayandplay.com/reset-password',
  expiryMinutes = 60,
}: PasswordResetProps) {
  return (
    <EmailLayout preview={`Reset your Zaine's Stay & Play password`}>
      <Heading style={h1}>Reset your password</Heading>
      <Text style={text}>Hi {firstName},</Text>
      <Text style={text}>
        We received a request to reset the password for your Zaine's Stay & Play account. Click the button below to choose a new password.
      </Text>
      <Button href={resetUrl} style={button}>
        Reset Password
      </Button>
      <Text style={mutedText}>
        This link expires in {expiryMinutes} minutes. If you didn't request a password reset, you can safely ignore this email — your account is secure.
      </Text>
      <Text style={mutedText}>
        Or copy and paste this URL into your browser:{' '}
        <Link href={resetUrl} style={link}>{resetUrl}</Link>
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

export default PasswordReset;
