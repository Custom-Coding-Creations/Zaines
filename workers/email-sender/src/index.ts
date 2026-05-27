/**
 * Cloudflare Email Worker
 * 
 * This Worker handles sending emails via Cloudflare Email Service.
 * It provides an API endpoint that your Next.js app can call to send emails.
 */

export interface Env {
  SEND_EMAIL: any; // Cloudflare Email Service binding
  API_SECRET: string; // Secret key for authentication
}

interface EmailRequest {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
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

    // Only allow POST requests
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
    if (token !== env.API_SECRET) {
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

      // Prepare email message
      const message = {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      };

      // Send email using Cloudflare Email Service
      await env.SEND_EMAIL.send(message);

      const response: EmailResponse = {
        success: true,
        messageId: crypto.randomUUID(), // Generate a unique ID for tracking
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
