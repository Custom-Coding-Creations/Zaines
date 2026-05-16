'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar skeleton - desktop only */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="space-y-1 sticky top-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Mobile nav skeleton */}
        <div className="lg:hidden -mx-4 px-4 flex gap-2 overflow-x-auto pb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 shrink-0 rounded-lg" />
          ))}
        </div>

        {/* Content area skeleton */}
        <div className="flex-1 space-y-6">
          {/* Card skeletons */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg border border-border bg-card p-6 space-y-4',
              )}
            >
              {/* Card header */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>

              {/* Card content - form fields */}
              <div className="space-y-4 pt-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Save buttons skeleton */}
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
