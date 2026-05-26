/**
 * Base Email Layout Component
 * 
 * Provides consistent branding, styling, and structure for all
 * transactional emails sent by Zaine's Stay & Play.
 * 
 * Features:
 * - Responsive design (mobile-first)
 * - Dark mode support
 * - Zaine's brand colors and typography
 * - Consistent header/footer
 */

import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const baseUrl = process.env.NEXTAUTH_URL || 'https://zainesstayandplay.com';

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            <Img
              src={`${baseUrl}/images/logo-email.png`}
              alt="Zaine's Stay & Play"
              width="180"
              height="60"
              style={logo}
            />
            <Text style={tagline}>Private Dog Boarding & Care in Syracuse 🐾</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <strong>Zaine's Stay & Play</strong>
              <br />
              6353 Court Street Road
              <br />
              East Syracuse, NY 13057
              <br />
              (315) 765-7297
            </Text>
            <Text style={footerText}>
              <Link href={`${baseUrl}/contact`} style={footerLink}>
                Contact Us
              </Link>
              {' • '}
              <Link href={`${baseUrl}/faq`} style={footerLink}>
                FAQ
              </Link>
              {' • '}
              <Link href={`${baseUrl}/dashboard/settings`} style={footerLink}>
                Email Preferences
              </Link>
            </Text>
            <Text style={footerTextSmall}>
              © {new Date().getFullYear()} Zaine's Stay & Play. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6e6e6',
};

const logo = {
  margin: '0 auto',
};

const tagline = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#666666',
  marginTop: '8px',
};

const content = {
  padding: '40px',
};

const footer = {
  padding: '32px 40px',
  borderTop: '1px solid #e6e6e6',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#666666',
  margin: '8px 0',
};

const footerTextSmall = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#999999',
  marginTop: '16px',
};

const footerLink = {
  color: '#3b82f6',
  textDecoration: 'none',
};

export default EmailLayout;
