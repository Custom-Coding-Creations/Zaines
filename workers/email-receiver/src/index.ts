import PostalMime from "postal-mime";

export interface Env {
  FORWARD_TO: string;
  APP_URL: string;
  INBOUND_WEBHOOK_SECRET: string;
}

interface InboundPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  receivedAt: string;
}

async function parseAndPost(
  rawBytes: ArrayBuffer,
  fallbackFrom: string,
  to: string,
  env: Env,
): Promise<void> {
  let payload: InboundPayload;
  try {
    const parsed = await new PostalMime().parse(rawBytes);
    const fromAddress = parsed.from?.address ?? fallbackFrom;
    const fromDisplay = parsed.from?.name
      ? `${parsed.from.name} <${fromAddress}>`
      : fromAddress;
    payload = {
      from: fromDisplay,
      to,
      subject: parsed.subject ?? "(no subject)",
      html: parsed.html ?? (parsed.text ? `<pre>${parsed.text}</pre>` : ""),
      receivedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[email-receiver] postal-mime parse failed", err);
    payload = {
      from: fallbackFrom,
      to,
      subject: "(parse failed — check Gmail for content)",
      html: "<p>Email body could not be parsed. See the forwarded copy in Gmail.</p>",
      receivedAt: new Date().toISOString(),
    };
  }

  const url = `${env.APP_URL.replace(/\/$/, "")}/api/email/inbound`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.INBOUND_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "(unreadable)");
      console.error(`[email-receiver] app POST ${resp.status}: ${text}`);
    } else {
      console.log("[email-receiver] inbound email logged to app");
    }
  } catch (err) {
    console.error("[email-receiver] app POST fetch failed", err);
  }
}

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    // Buffer raw MIME bytes FIRST — stream can only be consumed once,
    // and forward() may internally consume it on some runtime versions.
    const rawBytes = await new Response(message.raw).arrayBuffer();

    // Primary contract: forward to Gmail. If this throws, CF retries delivery.
    await message.forward(env.FORWARD_TO);

    // Parse + log to app in the background — never blocks the SMTP response.
    ctx.waitUntil(parseAndPost(rawBytes, message.from, message.to, env));
  },
};
