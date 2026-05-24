/**
 * Loyalty Tier Badge Component
 * 
 * Displays loyalty tier status, progress to next tier, and perks.
 * Supports both the legacy referral-system tiers (bronze/silver/gold/platinum)
 * and the Paw Points tiers (pup/good_dog/top_dog/vip).
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Crown,
  Star,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  LOYALTY_TIERS, 
  getNextTierProgress,
  type LoyaltyTier 
} from "@/lib/loyalty/referral-system";

// Legacy props (backward compat) — uses referral-system tiers
interface LoyaltyTierBadgeLegacyProps {
  tier: LoyaltyTier;
  lifetimeSpend: number;
  // Real data overrides (optional — future use)
  balance?: never;
  nextTierThreshold?: never;
  className?: string;
}

// Real data props — uses Paw Points tiers (pup/good_dog/top_dog/vip)
interface LoyaltyTierBadgeRealProps {
  tier: LoyaltyTier | 'pup' | 'good_dog' | 'top_dog' | 'vip';
  balance: number;
  nextTierThreshold: number | null;
  lifetimeSpend?: never;
  className?: string;
}

type LoyaltyTierBadgeProps = LoyaltyTierBadgeLegacyProps | LoyaltyTierBadgeRealProps;

// Map Paw Points tiers to closest legacy tier for styling
const PAW_TIER_MAP: Record<string, LoyaltyTier> = {
  pup: 'bronze',
  good_dog: 'silver',
  top_dog: 'gold',
  vip: 'platinum',
};

const TIER_ICONS = {
  bronze: Trophy,
  silver: Star,
  gold: Crown,
  platinum: Sparkles,
};

const TIER_STYLES = {
  bronze: "bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/30",
  silver: "bg-[#C0C0C0]/10 text-[#71717A] border-[#C0C0C0]/30",
  gold: "bg-[#FFD700]/10 text-[#CA8A04] border-[#FFD700]/30",
  platinum: "bg-[#E5E4E2]/10 text-[#52525B] border-[#E5E4E2]/30",
};

const PAW_TIER_LABELS: Record<string, string> = {
  pup: 'Pup',
  good_dog: 'Good Dog',
  top_dog: 'Top Dog',
  vip: 'VIP',
};

export function LoyaltyTierBadge(props: LoyaltyTierBadgeProps) {
  const { className } = props;

  // Real data mode
  if ('balance' in props && props.balance !== undefined) {
    const { balance, nextTierThreshold, tier } = props;
    const displayTier = PAW_TIER_MAP[tier] ?? (tier as LoyaltyTier);
    const Icon = TIER_ICONS[displayTier] ?? Trophy;
    const label = PAW_TIER_LABELS[tier] ?? tier;
    const progressPercent = nextTierThreshold && nextTierThreshold > 0
      ? Math.min(100, Math.round((balance / nextTierThreshold) * 100))
      : 100;

    return (
      <Card className={cn("paw-card", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", TIER_STYLES[displayTier])}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-xl">{label} Tier</CardTitle>
                <CardDescription>{balance.toLocaleString()} Paw Points</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={TIER_STYLES[displayTier]}>
              {label.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {nextTierThreshold !== null ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Progress to next tier
                </span>
                <span className="font-semibold">{balance} / {nextTierThreshold}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          ) : (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-sm font-semibold text-primary">
                🎉 You&apos;ve reached VIP — the highest tier!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Legacy mode (uses lifetimeSpend + referral-system tiers)
  const { tier, lifetimeSpend } = props as LoyaltyTierBadgeLegacyProps;
  const tierConfig = LOYALTY_TIERS[tier];
  const nextTierInfo = getNextTierProgress({ currentTier: tier, lifetimeSpend });
  const Icon = TIER_ICONS[tier];

  return (
    <Card className={cn("paw-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                TIER_STYLES[tier]
              )}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-xl capitalize">{tier} Tier</CardTitle>
              <CardDescription>
                {tierConfig.pointsMultiplier}x points on every purchase
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={TIER_STYLES[tier]}>
            {tier.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Tier Progress */}
        {nextTierInfo.nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Progress to {nextTierInfo.nextTier}
              </span>
              <span className="font-semibold">
                ${lifetimeSpend} / ${LOYALTY_TIERS[nextTierInfo.nextTier].minLifetimeSpend}
              </span>
            </div>
            <Progress value={nextTierInfo.progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Spend ${nextTierInfo.amountNeeded} more to unlock {nextTierInfo.nextTier} benefits
            </p>
          </div>
        )}

        {tier === "platinum" && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <p className="text-sm font-semibold text-primary">
              🎉 You&apos;ve reached the highest tier! Enjoy exclusive platinum perks.
            </p>
          </div>
        )}

        {/* Tier Perks */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">Your Benefits:</h4>
          <ul className="space-y-2">
            {tierConfig.perks.map((perk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-primary">✓</span>
                <span className="text-muted-foreground">{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

