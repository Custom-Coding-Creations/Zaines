'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Crown, Sparkles, TrendingUp, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoyaltyProgramSettings } from '@/types/admin';
import type { LoyaltyTransaction } from '@/lib/loyalty/paw-points';

type PawPointsWidgetProps = {
  balance: number;
  tier: string;
  transactions: LoyaltyTransaction[];
  loyaltySettings: LoyaltyProgramSettings;
};

const TIER_CONFIG: Record<
  string,
  { label: string; icon: typeof Trophy; style: string }
> = {
  pup: {
    label: 'Pup',
    icon: Star,
    style: 'bg-muted text-muted-foreground border-border',
  },
  good_dog: {
    label: 'Good Dog',
    icon: Trophy,
    style: 'bg-[#CD7F32]/10 text-[#92580C] border-[#CD7F32]/30',
  },
  top_dog: {
    label: 'Top Dog',
    icon: Crown,
    style: 'bg-[#FFD700]/10 text-[#CA8A04] border-[#FFD700]/30',
  },
  vip: {
    label: 'VIP',
    icon: Sparkles,
    style: 'bg-primary/10 text-primary border-primary/30',
  },
};

function getNextTierInfo(
  tier: string,
  balance: number,
  settings: LoyaltyProgramSettings,
): { nextTierLabel: string | null; pointsNeeded: number; progressPercent: number } {
  const tiers = [
    { key: 'pup', threshold: 0 },
    { key: 'good_dog', threshold: settings.tierThresholds.goodDog },
    { key: 'top_dog', threshold: settings.tierThresholds.topDog },
    { key: 'vip', threshold: settings.tierThresholds.vip },
  ];
  const idx = tiers.findIndex((t) => t.key === tier);
  if (idx === -1 || idx === tiers.length - 1) {
    return { nextTierLabel: null, pointsNeeded: 0, progressPercent: 100 };
  }
  const current = tiers[idx];
  const next = tiers[idx + 1];
  const pointsNeeded = Math.max(0, next.threshold - balance);
  const range = next.threshold - current.threshold;
  const progress = range > 0 ? Math.min(100, ((balance - current.threshold) / range) * 100) : 100;
  return {
    nextTierLabel: TIER_CONFIG[next.key]?.label ?? next.key,
    pointsNeeded,
    progressPercent: Math.round(progress),
  };
}

function formatTransactionReason(reason: string): string {
  return reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PawPointsWidget({
  balance,
  tier,
  transactions,
  loyaltySettings,
}: PawPointsWidgetProps) {
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeemResult, setRedeemResult] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG['pup'];
  const Icon = tierConfig.icon;
  const { nextTierLabel, pointsNeeded, progressPercent } = getNextTierInfo(
    tier,
    balance,
    loyaltySettings,
  );

  const dollarValue = (balance / loyaltySettings.redemptionRate).toFixed(2);
  const minPoints = loyaltySettings.minRedemptionPoints;
  const canRedeem = balance >= minPoints;

  const handleRedeem = async () => {
    const pts = parseInt(redeemPoints, 10);
    if (isNaN(pts) || pts < minPoints) return;
    setIsRedeeming(true);
    setRedeemResult(null);
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pts }),
      });
      if (res.ok) {
        setRedeemResult(
          `🎉 Redeemed ${pts} points ($${(pts / loyaltySettings.redemptionRate).toFixed(2)} discount). Your code: PAWPTS-${pts}`,
        );
      } else {
        setRedeemResult('Unable to redeem points. Please try again.');
      }
    } catch {
      setRedeemResult('Network error. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border',
                  tierConfig.style,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base">Paw Points</CardTitle>
                <CardDescription>Your loyalty rewards balance</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={cn('text-sm font-semibold', tierConfig.style)}>
              {tierConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance */}
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <p className="text-4xl font-bold tabular-nums">{balance.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              points · worth <span className="font-semibold text-foreground">${dollarValue}</span>
            </p>
          </div>

          {/* Tier progress */}
          {nextTierLabel && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Progress to {nextTierLabel}
                </span>
                <span className="font-medium text-xs">{pointsNeeded} pts to go</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
          {!nextTierLabel && (
            <p className="text-center text-sm font-semibold text-primary">
              🌟 You&apos;ve reached VIP — the highest tier!
            </p>
          )}

          {/* Redeem button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={!canRedeem} variant="default">
                <Gift className="mr-2 h-4 w-4" />
                Redeem Points
                {!canRedeem && (
                  <span className="ml-2 text-xs opacity-70">
                    (need {minPoints} pts)
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redeem Paw Points</DialogTitle>
                <DialogDescription>
                  {loyaltySettings.redemptionRate} points = $1 off your next booking.
                  Minimum redemption: {minPoints} points.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="redeem-input">Points to redeem</Label>
                  <Input
                    id="redeem-input"
                    type="number"
                    min={minPoints}
                    max={balance}
                    placeholder={String(minPoints)}
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                  />
                  {redeemPoints && !isNaN(parseInt(redeemPoints, 10)) && (
                    <p className="text-xs text-muted-foreground">
                      = ${(parseInt(redeemPoints, 10) / loyaltySettings.redemptionRate).toFixed(2)} discount
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={handleRedeem}
                  disabled={isRedeeming || !redeemPoints || parseInt(redeemPoints, 10) < minPoints}
                >
                  {isRedeeming ? 'Processing…' : 'Redeem'}
                </Button>
                {redeemResult && (
                  <p className="text-sm text-center text-muted-foreground">{redeemResult}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatTransactionReason(tx.reason)}
                    {tx.description && (
                      <span className="block text-xs opacity-70">{tx.description}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      tx.points > 0 ? 'text-green-600' : 'text-destructive',
                    )}
                  >
                    {tx.points > 0 ? '+' : ''}
                    {tx.points}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
