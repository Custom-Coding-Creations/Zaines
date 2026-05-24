import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { LoyaltyProgramSettings } from '@/types/admin';

type LoyaltyDashboardWidgetProps = {
  balance: number;
  tier: string;
  loyaltySettings: LoyaltyProgramSettings;
};

const TIER_LABELS: Record<string, string> = {
  pup: 'Pup',
  good_dog: 'Good Dog',
  top_dog: 'Top Dog',
  vip: 'VIP',
};

const TIER_STYLES: Record<string, string> = {
  pup: 'text-muted-foreground',
  good_dog: 'text-[#92580C]',
  top_dog: 'text-[#CA8A04]',
  vip: 'text-primary',
};

function getNextTierProgress(
  tier: string,
  balance: number,
  settings: LoyaltyProgramSettings,
): { nextLabel: string | null; pointsNeeded: number; percent: number } {
  const tiers = [
    { key: 'pup', threshold: 0 },
    { key: 'good_dog', threshold: settings.tierThresholds.goodDog },
    { key: 'top_dog', threshold: settings.tierThresholds.topDog },
    { key: 'vip', threshold: settings.tierThresholds.vip },
  ];
  const idx = tiers.findIndex((t) => t.key === tier);
  if (idx === -1 || idx === tiers.length - 1) {
    return { nextLabel: null, pointsNeeded: 0, percent: 100 };
  }
  const current = tiers[idx];
  const next = tiers[idx + 1];
  const range = next.threshold - current.threshold;
  const percent = range > 0 ? Math.min(100, Math.round(((balance - current.threshold) / range) * 100)) : 100;
  return {
    nextLabel: TIER_LABELS[next.key] ?? next.key,
    pointsNeeded: Math.max(0, next.threshold - balance),
    percent,
  };
}

export function LoyaltyDashboardWidget({
  balance,
  tier,
  loyaltySettings,
}: LoyaltyDashboardWidgetProps) {
  const { nextLabel, pointsNeeded, percent } = getNextTierProgress(tier, balance, loyaltySettings);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-base font-medium">Paw Points</h3>
        </div>
        <span className={cn('text-sm font-semibold', TIER_STYLES[tier] ?? TIER_STYLES['pup'])}>
          {TIER_LABELS[tier] ?? tier}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold tabular-nums">{balance.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">
        points · ${(balance / loyaltySettings.redemptionRate).toFixed(2)} value
      </p>

      {nextLabel ? (
        <div className="mt-3 space-y-1">
          <Progress value={percent} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {pointsNeeded} pts to {nextLabel}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs font-semibold text-primary">🌟 VIP — highest tier!</p>
      )}

      <Link
        href="/dashboard/wallet"
        className="mt-3 inline-block text-sm text-primary hover:underline"
      >
        View rewards →
      </Link>
    </div>
  );
}
