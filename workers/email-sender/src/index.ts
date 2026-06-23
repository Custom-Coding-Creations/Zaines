/**
 * Cloudflare Email Worker
 * 
 * This Worker handles sending emails via Resend API.
 * It provides an API endpoint that your Next.js app can call to send emails.
 */

export interface Env {
  RESEND_API_KEY: string; // Resend API key
  EMAIL_WORKER_SECRET: string; // Secret key for authentication
}

interface EmailAttachment {
  filename: string;
  content: string; // base64
  content_type: string;
}

interface EmailRequest {
  from: string;
  to: string | string[];
  cc?: string[];
  reply_to?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Health check endpoint
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'Zaines Email Worker',
        version: '1.0.0' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only allow POST requests for sending
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    if (token !== env.EMAIL_WORKER_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const emailData: EmailRequest = await request.json();

      // Validate required fields
      if (!emailData.from || !emailData.to || !emailData.subject || !emailData.html) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: from, to, subject, html' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Send email using Resend API
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          ...(emailData.text ? { text: emailData.text } : {}),
          ...(emailData.cc?.length ? { cc: emailData.cc } : {}),
          ...(emailData.reply_to ? { reply_to: emailData.reply_to } : {}),
          ...(emailData.attachments?.length ? { attachments: emailData.attachments } : {}),
        }),
      });

      const resendData = await resendResponse.json() as any;

      if (!resendResponse.ok) {
        throw new Error(resendData.message || 'Failed to send email via Resend');
      }

      const response: EmailResponse = {
        success: true,
        messageId: resendData.id,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Email send error:', error);
      
      const response: EmailResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
