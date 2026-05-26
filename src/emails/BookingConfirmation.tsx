/**
 * Booking Confirmation Email Template
 * 
 * Sent immediately after successful booking payment.
 * Includes order summary, suite details, check-in instructions.
 */

import * as React from 'react';
import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import { EmailLayout } from './_components/Layout';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface BookingConfirmationProps {
  customerName: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  suiteType: string;
  suitePrice: number;
  nights: number;
  petNames: string[];
  subtotal: number;
  tax: number;
  total: number;
  addOns?: Array<{ name: string; price: number }>;
}

export function BookingConfirmation({
  customerName = 'Valued Customer',
  bookingNumber = 'ZSP-12345',
  checkInDate = '2026-06-01',
  checkOutDate = '2026-06-03',
  suiteType = 'Deluxe Suite',
  suitePrice = 85,
  nights = 2,
  petNames = ['Buddy'],
  subtotal = 170,
  tax = 13.6,
  total = 183.6,
  addOns = [],
}: BookingConfirmationProps) {
  const checkIn = format(new Date(checkInDate), 'EEEE, MMMM d, yyyy');
  const checkOut = format(new Date(checkOutDate), 'EEEE, MMMM d, yyyy');

  return (
    <EmailLayout preview={`Booking confirmed! ${bookingNumber} • ${checkIn}`}>
      {/* Hero Section */}
      <Heading style={h1}>🎉 Your Booking is Confirmed!</Heading>
      <Text style={paragraph}>
        Hi {customerName},
      </Text>
      <Text style={paragraph}>
        Great news! Your reservation at Zaine's Stay & Play is confirmed. We can't wait to pamper{' '}
        {petNames.join(', ')}!
      </Text>

      {/* Booking Details Card */}
      <Section style={card}>
        <Heading as="h2" style={h2}>
          Booking Details
        </Heading>
        <Hr style={hr} />
        
        <Row style={detailRow}>
          <Column style={detailLabel}>Booking Number:</Column>
          <Column style={detailValue}>{bookingNumber}</Column>
        </Row>
        
        <Row style={detailRow}>
          <Column style={detailLabel}>Check-In:</Column>
          <Column style={detailValue}>{checkIn}</Column>
        </Row>
        
        <Row style={detailRow}>
          <Column style={detailLabel}>Check-Out:</Column>
          <Column style={detailValue}>{checkOut}</Column>
        </Row>
        
        <Row style={detailRow}>
          <Column style={detailLabel}>Suite:</Column>
          <Column style={detailValue}>{suiteType}</Column>
        </Row>
        
        <Row style={detailRow}>
          <Column style={detailLabel}>Pet(s):</Column>
          <Column style={detailValue}>{petNames.join(', ')}</Column>
        </Row>
      </Section>

      {/* Pricing Summary */}
      <Section style={card}>
        <Heading as="h2" style={h2}>
          Payment Summary
        </Heading>
        <Hr style={hr} />
        
        <Row style={pricingRow}>
          <Column style={pricingLabel}>
            {suiteType} ({nights} night{nights > 1 ? 's' : ''})
          </Column>
          <Column style={pricingValue}>{formatCurrency(suitePrice * nights)}</Column>
        </Row>
        
        {addOns && addOns.map((addOn, index) => (
          <Row key={index} style={pricingRow}>
            <Column style={pricingLabel}>{addOn.name}</Column>
            <Column style={pricingValue}>{addOn.price > 0 ? formatCurrency(addOn.price) : "Included"}</Column>
          </Row>
        ))}
        
        <Hr style={hr} />
        
        <Row style={pricingRow}>
          <Column style={pricingLabel}>Subtotal</Column>
          <Column style={pricingValue}>{formatCurrency(subtotal)}</Column>
        </Row>
        
        <Row style={pricingRow}>
          <Column style={pricingLabel}>Tax (8%)</Column>
          <Column style={pricingValue}>{formatCurrency(tax)}</Column>
        </Row>
        
        <Hr style={hr} />
        
        <Row style={pricingRow}>
          <Column style={pricingLabelBold}>Total Paid</Column>
          <Column style={pricingValueBold}>{formatCurrency(total)}</Column>
        </Row>
      </Section>

      {/* Check-In Instructions */}
      <Section style={instructionsCard}>
        <Heading as="h2" style={h2}>
          📋 Check-In Instructions
        </Heading>
        <Text style={paragraph}>
          <strong>Arrival Time:</strong> Between 6:00 AM - 8:00 PM
          <br />
          <strong>What to Bring:</strong>
        </Text>
        <ul style={list}>
          <li style={listItem}>Current vaccination records (if not already uploaded)</li>
          <li style={listItem}>Your pet's favorite food (we'll store it for you)</li>
          <li style={listItem}>Any medications with instructions</li>
          <li style={listItem}>Comfort items (favorite toy, blanket)</li>
        </ul>
        <Text style={paragraph}>
          <strong>Address:</strong> 6353 Court Street Road, East Syracuse, NY 13057
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button
          href={`${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingNumber}`}
          style={button}
        >
          View Booking Details
        </Button>
      </Section>

      {/* Support Section */}
      <Section>
        <Text style={paragraph}>
          Have questions? We're here to help! Call us at{' '}
          <a href="tel:3156571332" style={link}>
            (315) 765-7297
          </a>{' '}
          or reply to this email.
        </Text>
        <Text style={paragraph}>
          Looking forward to welcoming {petNames.join(', ')}! 🐾
        </Text>
        <Text style={signature}>
          The Zaine's Team
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default BookingConfirmation;

// Styles
const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
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

const hr = {
  borderColor: '#e6e6e6',
  margin: '16px 0',
};

const detailRow = {
  marginBottom: '12px',
};

const detailLabel = {
  color: '#666666',
  fontSize: '14px',
  fontWeight: '500',
  width: '40%',
};

const detailValue = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
};

const pricingRow = {
  marginBottom: '8px',
};

const pricingLabel = {
  color: '#333333',
  fontSize: '15px',
};

const pricingValue = {
  color: '#333333',
  fontSize: '15px',
  textAlign: 'right' as const,
};

const pricingLabelBold = {
  ...pricingLabel,
  fontSize: '17px',
  fontWeight: '700',
};

const pricingValueBold = {
  ...pricingValue,
  fontSize: '17px',
  fontWeight: '700',
  color: '#1a1a1a',
};

const list = {
  margin: '0 0 16px',
  paddingLeft: '20px',
};

const listItem = {
  color: '#333333',
  fontSize: '15px',
  lineHeight: '24px',
  marginBottom: '8px',
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
  padding: '12px 32px',
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
};
