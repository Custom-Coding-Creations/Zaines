import { ImageResponse } from 'next/og';
import { getSeoRuntimeConfig } from '@/lib/seo';

export const runtime = 'edge';
export const alt = "Zaine's Stay and Play - Premium Dog Boarding in Syracuse, NY";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand colors
const TERRACOTTA = '#E07856';
const NAVY = '#1E3A5F';
const SAGE = '#A8C696';
const CREAM = '#FDF6EE';

export default async function OgImage() {
  let siteName = "Zaine's Stay & Play";
  let rating = '5.0';
  let reviewCount = '47';

  try {
    const seo = await getSeoRuntimeConfig();
    siteName = seo.siteName;
  } catch {
    // use defaults
  }

  // Load fonts
  const [fredoka, nunito] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/fredokaone/v14/k3kUo8kEI-tA1RRcTZGmTmHBA6aF8Bf9.woff2').then(
      (r) => r.arrayBuffer(),
    ).catch(() => null),
    fetch('https://fonts.gstatic.com/s/nunitosans/v15/pe0TMImSLYBIv1o4X1M8cce4OdVisMz5nZRqy6cmmmU3t2FQWEAe.woff2').then(
      (r) => r.arrayBuffer(),
    ).catch(() => null),
  ]);

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
          fontFamily: 'Nunito Sans, sans-serif',
        }}
      >
        {/* Background accent blobs */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: TERRACOTTA,
            opacity: 0.15,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: SAGE,
            opacity: 0.2,
          }}
        />

        {/* Navy top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: NAVY,
          }}
        />

        {/* Paw prints decoration */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 60,
            fontSize: 72,
            opacity: 0.12,
          }}
        >
          🐾
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 60,
            fontSize: 56,
            opacity: 0.1,
          }}
        >
          🐾
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '60px 80px',
            flex: 1,
          }}
        >
          {/* Dog icon */}
          <div
            style={{
              fontSize: 64,
              marginBottom: 24,
            }}
          >
            🐕
          </div>

          {/* Business name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.1,
              marginBottom: 16,
              fontFamily: 'Fredoka One, sans-serif',
            }}
          >
            {siteName}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: TERRACOTTA,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            Where Every Day is a Paw-ty™
          </div>

          {/* Location + rating row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: NAVY,
                color: '#fff',
                borderRadius: 40,
                padding: '10px 24px',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              📍 Syracuse, NY
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#FEF9C3',
                color: '#92400E',
                borderRadius: 40,
                padding: '10px 24px',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              ⭐ {rating} · {reviewCount}+ reviews
            </div>
          </div>

          {/* Bottom tagline */}
          <div
            style={{
              marginTop: 32,
              fontSize: 18,
              color: '#555',
              maxWidth: 600,
              lineHeight: 1.5,
            }}
          >
            Private boutique dog boarding · Owner always on-site · Limited suites
          </div>
        </div>

        {/* Terracotta right accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 12,
            height: '100%',
            background: TERRACOTTA,
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(fredoka
          ? [{ name: 'Fredoka One', data: fredoka, weight: 400 as const }]
          : []),
        ...(nunito
          ? [{ name: 'Nunito Sans', data: nunito, weight: 400 as const }]
          : []),
      ],
    },
  );
}
