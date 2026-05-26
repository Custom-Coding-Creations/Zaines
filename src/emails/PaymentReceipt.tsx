/**
 * Payment Receipt Email Template
 * 
 * Invoice-style receipt sent after payment completion.
 * Includes itemized charges and payment method details.
 */

import * as React from 'react';
import {
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

interface PaymentReceiptProps {
  customerName: string;
  receiptNumber: string;
  paymentDate: string;
  bookingNumber: string;
  paymentMethod: string;
  lastFourDigits: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}

export function PaymentReceipt({
  customerName = 'Valued Customer',
  receiptNumber = 'RCT-12345',
  paymentDate = new Date().toISOString(),
  bookingNumber = 'ZSP-12345',
  paymentMethod = 'Visa',
  lastFourDigits = '4242',
  items = [],
  subtotal = 170,
  tax = 13.6,
  total = 183.6,
}: PaymentReceiptProps) {
  const formattedDate = format(new Date(paymentDate), 'MMMM d, yyyy');

  return (
    <EmailLayout preview={`Receipt ${receiptNumber} - ${formatCurrency(total)}`}>
      <Heading style={h1}>Payment Receipt</Heading>
      
      <Text style={paragraph}>
        Hi {customerName},
      </Text>
      
      <Text style={paragraph}>
        Thank you for your payment! Here's your receipt for booking {bookingNumber}.
      </Text>

      {/* Receipt Header */}
      <Section style={receiptHeader}>
        <Row>
          <Column>
            <Text style={receiptLabel}>Receipt Number</Text>
            <Text style={receiptValue}>{receiptNumber}</Text>
          </Column>
          <Column>
            <Text style={receiptLabel}>Payment Date</Text>
            <Text style={receiptValue}>{formattedDate}</Text>
          </Column>
        </Row>
        <Row style={{ marginTop: '16px' }}>
          <Column>
            <Text style={receiptLabel}>Payment Method</Text>
            <Text style={receiptValue}>
              {paymentMethod} •••• {lastFourDigits}
            </Text>
          </Column>
          <Column>
            <Text style={receiptLabel}>Booking Number</Text>
            <Text style={receiptValue}>{bookingNumber}</Text>
          </Column>
        </Row>
      </Section>

      {/* Itemized Charges */}
      <Section style={invoiceTable}>
        <Heading as="h2" style={h2}>
          Charges
        </Heading>
        <Hr style={hr} />
        
        {/* Table Header */}
        <Row style={tableHeader}>
          <Column style={{ ...tableHeaderCell, width: '50%' }}>Description</Column>
          <Column style={{ ...tableHeaderCell, width: '15%', textAlign: 'center' }}>Qty</Column>
          <Column style={{ ...tableHeaderCell, width: '17.5%', textAlign: 'right' }}>Unit Price</Column>
          <Column style={{ ...tableHeaderCell, width: '17.5%', textAlign: 'right' }}>Total</Column>
        </Row>
        
        {/* Items */}
        {items.map((item, index) => (
          <Row key={index} style={tableRow}>
            <Column style={{ ...tableCell, width: '50%' }}>{item.description}</Column>
            <Column style={{ ...tableCell, width: '15%', textAlign: 'center' }}>{item.quantity}</Column>
            <Column style={{ ...tableCell, width: '17.5%', textAlign: 'right' }}>
              {formatCurrency(item.unitPrice)}
            </Column>
            <Column style={{ ...tableCell, width: '17.5%', textAlign: 'right' }}>
              {formatCurrency(item.total)}
            </Column>
          </Row>
        ))}
        
        <Hr style={hr} />
        
        {/* Subtotal */}
        <Row style={totalRow}>
          <Column style={{ width: '82.5%', textAlign: 'right' }}>Subtotal</Column>
          <Column style={{ width: '17.5%', textAlign: 'right' }}>{formatCurrency(subtotal)}</Column>
        </Row>
        
        {/* Tax */}
        <Row style={totalRow}>
          <Column style={{ width: '82.5%', textAlign: 'right' }}>Tax (8%)</Column>
          <Column style={{ width: '17.5%', textAlign: 'right' }}>{formatCurrency(tax)}</Column>
        </Row>
        
        <Hr style={hr} />
        
        {/* Total */}
        <Row style={grandTotalRow}>
          <Column style={{ ...grandTotalLabel, width: '82.5%' }}>Total Paid</Column>
          <Column style={{ ...grandTotalValue, width: '17.5%' }}>{formatCurrency(total)}</Column>
        </Row>
      </Section>

      {/* Footer Note */}
      <Section style={noteCard}>
        <Text style={noteText}>
          <strong>Need a copy for your records?</strong> You can download a PDF version of this receipt from your{' '}
          <a href={`${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingNumber}`} style={link}>
            booking dashboard
          </a>.
        </Text>
      </Section>

      <Text style={paragraph}>
        Questions about this charge? Contact us at{' '}
        <a href="tel:3156571332" style={link}>
          (315) 765-7297
        </a>{' '}
        or reply to this email.
      </Text>

      <Text style={signature}>
        The Zaine's Team
      </Text>
    </EmailLayout>
  );
}

export default PaymentReceipt;

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
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const paragraph = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const receiptHeader = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
};

const receiptLabel = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
};

const receiptValue = {
  color: '#1a1a1a',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
};

const invoiceTable = {
  backgroundColor: '#ffffff',
  border: '1px solid #e6e6e6',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '12px 0',
};

const tableHeader = {
  marginBottom: '8px',
};

const tableHeaderCell = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const tableRow = {
  marginBottom: '8px',
};

const tableCell = {
  color: '#333333',
  fontSize: '14px',
  padding: '4px 0',
};

const totalRow = {
  marginBottom: '8px',
  fontSize: '14px',
  color: '#333333',
};

const grandTotalRow = {
  marginTop: '12px',
};

const grandTotalLabel = {
  fontSize: '17px',
  fontWeight: '700',
  color: '#1a1a1a',
  textAlign: 'right' as const,
};

const grandTotalValue = {
  fontSize: '17px',
  fontWeight: '700',
  color: '#1a1a1a',
  textAlign: 'right' as const,
};

const noteCard = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
};

const noteText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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
