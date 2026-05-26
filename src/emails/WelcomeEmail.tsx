/**
 * Welcome Email Template
 * 
 * Sent to new customers after account creation.
 * Introduces Zaine's services and guides next steps.
 */

import * as React from 'react';
import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './_components/Layout';

interface WelcomeEmailProps {
  customerName: string;
}

export function WelcomeEmail({
  customerName = 'New Friend',
}: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to Zaine's Stay & Play! 🐾">
      <Heading style={h1}>Welcome to the Pack! 🎉</Heading>
      
      <Text style={paragraph}>
        Hi {customerName},
      </Text>
      
      <Text style={paragraph}>
        Thank you for joining Zaine's Stay & Play — private, owner-led dog care in Syracuse.
        We're thrilled to welcome you and your furry family member to our pack.
      </Text>

      {/* What Makes Us Special */}
      <Section style={card}>
        <Heading as="h2" style={h2}>
          Why Choose Zaine's?
        </Heading>
        <ul style={list}>
          <li style={listItem}>
            <strong>🏡 Private Suites</strong> — Limited-capacity stays for personalized attention
          </li>
          <li style={listItem}>
            <strong>👀 Owner On-Site</strong> — Direct supervision, no outsourcing, just care from people who love dogs
          </li>
          <li style={listItem}>
            <strong>📸 Photo Updates</strong> — Daily pictures so you never miss a moment
          </li>
          <li style={listItem}>
            <strong>🧼 Safe & Clean</strong> — No harsh chemicals, camera-monitored safety
          </li>
          <li style={listItem}>
            <strong>👨‍👩‍👧‍👦 Family Dogs Together</strong> — Same-family dogs can share a suite (when approved)
          </li>
        </ul>
      </Section>

      {/* Next Steps */}
      <Section style={instructionsCard}>
        <Heading as="h2" style={h2}>
          🚀 Getting Started
        </Heading>
        <Text style={paragraph}>
          Ready to book your pup's first stay? Here's what to do:
        </Text>
        <ol style={numberedList}>
          <li style={listItem}>
            <strong>Add your pet's profile</strong> — Tell us about your furry friend
          </li>
          <li style={listItem}>
            <strong>Upload vaccination records</strong> — Rabies, DHPP, and Bordetella required
          </li>
          <li style={listItem}>
            <strong>Choose your dates</strong> — Select check-in and check-out
          </li>
          <li style={listItem}>
            <strong>Pick your suite</strong> — Standard, Deluxe, or Luxury
          </li>
          <li style={listItem}>
            <strong>Confirm & pay</strong> — Secure payment, transparent pricing
          </li>
        </ol>
      </Section>

      {/* CTA */}
      <Section style={buttonSection}>
        <Button
          href={`${process.env.NEXTAUTH_URL}/book`}
          style={button}
        >
          Book Your First Stay
        </Button>
      </Section>

      {/* Support */}
      <Text style={paragraph}>
        Have questions? We're here to help!
      </Text>
      <ul style={contactList}>
        <li style={listItem}>
          📞 Call us: <a href="tel:3157657297" style={link}>(315) 765-7297</a>
        </li>
        <li style={listItem}>
          📧 Email: <a href="mailto:jgibbs@zainesstayandplay.com" style={link}>jgibbs@zainesstayandplay.com</a>
        </li>
        <li style={listItem}>
          🌐 Visit: <a href={`${process.env.NEXTAUTH_URL}/faq`} style={link}>FAQ & Resources</a>
        </li>
      </ul>

      <Text style={paragraph}>
        We can't wait to meet your pup! 🐾
      </Text>

      <Text style={signature}>
        Welcome to the family,
        <br />
        The Zaine's Team
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;

// Styles
const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: '700',
  lineHeight: '40px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '0 0 16px',
};

const paragraph = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const card = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
};

const instructionsCard = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
  border: '2px solid #3b82f6',
};

const list = {
  margin: '0',
  paddingLeft: '20px',
};

const numberedList = {
  margin: '0 0 16px',
  paddingLeft: '20px',
};

const listItem = {
  color: '#333333',
  fontSize: '15px',
  lineHeight: '24px',
  marginBottom: '12px',
};

const contactList = {
  margin: '0 0 24px',
  paddingLeft: '0',
  listStyleType: 'none',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
};

const signature = {
  color: '#666666',
  fontSize: '15px',
  fontStyle: 'italic',
  margin: '24px 0 0',
  lineHeight: '24px',
};
