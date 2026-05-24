'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error('[dashboard] Route error boundary triggered:', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-xl font-semibold text-foreground">Dashboard temporarily unavailable</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We hit an unexpected error while loading your dashboard. Please try again.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => reset()} className="focus-ring">
          Try again
        </Button>
        <Button asChild variant="outline" className="focus-ring">
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>
    </div>
  );
}
