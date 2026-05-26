export interface PremiumReceiptData {
  bookingId: string;
  bookingNumber: string;
  status: string;
  checkIn: string;
  checkOut: string;
  suite: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  petNames: string[];
  customerName: string;
  customerEmail: string;
  supportPhone?: string;
  supportEmail?: string;
  generatedAt?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function renderPremiumReceiptHtml(data: PremiumReceiptData): string {
  const currency = data.currency.toUpperCase();
  const generatedAt = data.generatedAt || new Date().toISOString();
  const petLabel = data.petNames.length > 0 ? data.petNames.join(", ") : "Guest pets";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Invoice ${escapeHtml(data.bookingNumber)} | Zaine's Stay & Play</title>
    <style>
      :root {
        --ink: #18212a;
        --muted: #4e5a67;
        --line: #d8dde3;
        --brand: #0f766e;
        --surface: #f5f8fb;
        --paper: #ffffff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(120deg, #ecf4f7, #f8fbfd);
        color: var(--ink);
        font-family: "Spectral", "Georgia", serif;
        padding: 24px;
      }
      .invoice {
        max-width: 760px;
        margin: 0 auto;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
      }
      .hero {
        background: linear-gradient(135deg, #0f766e, #0b5f70);
        color: #fff;
        padding: 28px;
      }
      .hero h1 {
        margin: 0;
        font-size: 30px;
        letter-spacing: 0.3px;
      }
      .hero p {
        margin: 8px 0 0;
        opacity: 0.9;
        font-size: 15px;
      }
      .section {
        padding: 24px 28px;
        border-top: 1px solid var(--line);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 20px;
      }
      .label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.9px;
        color: var(--muted);
      }
      .value {
        font-size: 16px;
        margin-top: 2px;
      }
      .totals {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 16px;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .totals-row:last-child {
        margin-bottom: 0;
        border-top: 1px solid var(--line);
        padding-top: 10px;
        font-weight: 700;
        font-size: 17px;
      }
      .pill {
        display: inline-block;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 12px;
        color: var(--muted);
        margin-right: 8px;
      }
      .footer {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.45;
      }
      @media print {
        body { background: #fff; padding: 0; }
        .invoice { border-radius: 0; border: none; max-width: 100%; }
      }
    </style>
  </head>
  <body>
    <article class="invoice">
      <header class="hero">
        <h1>Zaine's Stay & Play</h1>
        <p>Luxury Boarding Invoice</p>
      </header>

      <section class="section">
        <div class="grid">
          <div>
            <div class="label">Invoice Number</div>
            <div class="value">${escapeHtml(data.bookingNumber)}</div>
          </div>
          <div>
            <div class="label">Generated</div>
            <div class="value">${escapeHtml(formatDate(generatedAt))}</div>
          </div>
          <div>
            <div class="label">Guest</div>
            <div class="value">${escapeHtml(data.customerName)}</div>
          </div>
          <div>
            <div class="label">Email</div>
            <div class="value">${escapeHtml(data.customerEmail)}</div>
          </div>
          <div>
            <div class="label">Check In</div>
            <div class="value">${escapeHtml(formatDate(data.checkIn))}</div>
          </div>
          <div>
            <div class="label">Check Out</div>
            <div class="value">${escapeHtml(formatDate(data.checkOut))}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="grid">
          <div>
            <div class="label">Suite</div>
            <div class="value">${escapeHtml(data.suite)}</div>
          </div>
          <div>
            <div class="label">Pet Guests</div>
            <div class="value">${escapeHtml(petLabel)}</div>
          </div>
        </div>
        <div style="margin-top: 14px;">
          <span class="pill">Status: ${escapeHtml(data.status)}</span>
          <span class="pill">Currency: ${escapeHtml(currency)}</span>
        </div>
      </section>

      <section class="section">
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${escapeHtml(formatCurrency(data.subtotal, currency))}</span>
          </div>
          <div class="totals-row">
            <span>Tax</span>
            <span>${escapeHtml(formatCurrency(data.tax, currency))}</span>
          </div>
          <div class="totals-row">
            <span>Total</span>
            <span>${escapeHtml(formatCurrency(data.total, currency))}</span>
          </div>
        </div>
      </section>

      <section class="section footer">
        <p>Payments are processed securely through Stripe. No raw card data is stored by Zaine's Stay & Play.</p>
        <p>Support: ${escapeHtml(data.supportPhone || "(315) 765-7297")} | ${escapeHtml(data.supportEmail || "jgibbs@zainesstayandplay.com")}</p>
      </section>
    </article>
  </body>
</html>`;
}
