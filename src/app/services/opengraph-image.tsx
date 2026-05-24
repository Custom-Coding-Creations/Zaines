import { ImageResponse } from 'next/og';
import { getSeoRuntimeConfig } from '@/lib/seo';

export const runtime = 'edge';
export const alt = "Dog Boarding Services - Zaine's Stay and Play, Syracuse NY";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TERRACOTTA = '#E07856';
const NAVY = '#1E3A5F';
const SAGE = '#A8C696';
const CREAM = '#FDF6EE';

export default async function ServicesOgImage() {
  let siteName = "Zaine's Stay & Play";

  try {
    const seo = await getSeoRuntimeConfig();
    siteName = seo.siteName;
  } catch {
    // use default
  }

  const fredoka = await fetch(
    'https://fonts.gstatic.com/s/fredokaone/v14/k3kUo8kEI-tA1RRcTZGmTmHBA6aF8Bf9.woff2',
  )
    .then((r) => r.arrayBuffer())
    .catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: CREAM,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent circles */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: SAGE,
            opacity: 0.18,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: TERRACOTTA,
            opacity: 0.12,
          }}
        />

        {/* Navy top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: NAVY }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: '100%', background: TERRACOTTA }} />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 80px',
            flex: 1,
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 20 }}>🏠</div>

          <div
            style={{
              fontSize: 22,
              color: TERRACOTTA,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Dog Boarding Services
          </div>

          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.1,
              marginBottom: 20,
              fontFamily: 'Fredoka One, sans-serif',
            }}
          >
            {siteName}
          </div>

          <div style={{ fontSize: 24, color: '#444', marginBottom: 32, maxWidth: 640 }}>
            Standard, Deluxe &amp; Luxury Suites · Daily Photo Updates · Owner On-Site 24/7
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
            }}
          >
            {['Standard Suite', 'Deluxe Suite', 'Luxury Suite'].map((tier) => (
              <div
                key={tier}
                style={{
                  background: NAVY,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {tier}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fredoka
        ? [{ name: 'Fredoka One', data: fredoka, weight: 400 as const }]
        : [],
    },
  );
}
