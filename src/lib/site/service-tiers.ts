import type { ServiceTier } from '@/types/admin';

export type CanonicalSuiteTier = 'standard' | 'deluxe' | 'luxury';

const CANONICAL_SUITE_ORDER: CanonicalSuiteTier[] = ['standard', 'deluxe', 'luxury'];

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

export function getCanonicalSuiteKey(
  tier: Pick<ServiceTier, 'id' | 'name'> | string,
): CanonicalSuiteTier | null {
  const values =
    typeof tier === 'string' ? [tier] : [tier.id, tier.name].filter(Boolean);

  for (const value of values) {
    const normalized = normalizeValue(value);

    if (normalized.includes('standard')) {
      return 'standard';
    }

    if (normalized.includes('deluxe')) {
      return 'deluxe';
    }

    if (normalized.includes('luxury')) {
      return 'luxury';
    }
  }

  return null;
}

export function getActiveSuiteTiers(serviceTiers: ServiceTier[]) {
  return serviceTiers
    .filter((tier) => tier.isActive && getCanonicalSuiteKey(tier))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getActiveCanonicalSuiteEntries(serviceTiers: ServiceTier[]) {
  return getActiveSuiteTiers(serviceTiers)
    .map((tier) => {
      const key = getCanonicalSuiteKey(tier);
      return key ? { key, tier } : null;
    })
    .filter((entry): entry is { key: CanonicalSuiteTier; tier: ServiceTier } => entry !== null)
    .sort(
      (left, right) =>
        CANONICAL_SUITE_ORDER.indexOf(left.key) -
        CANONICAL_SUITE_ORDER.indexOf(right.key),
    );
}

export function getConfiguredSuiteCount(serviceTiers: ServiceTier[]) {
  return getActiveSuiteTiers(serviceTiers).length;
}

export function getTotalConfiguredSuiteCapacity(serviceTiers: ServiceTier[]) {
  return getActiveSuiteTiers(serviceTiers).reduce(
    (total, tier) => total + Math.max(0, tier.capacity ?? 0),
    0,
  );
}

export function getCanonicalCapacityMap(serviceTiers: ServiceTier[]) {
  const entries = getActiveCanonicalSuiteEntries(serviceTiers).map(({ key, tier }) => [
    key,
    Math.max(0, tier.capacity ?? 0),
  ]);

  return Object.fromEntries(entries) as Partial<Record<CanonicalSuiteTier, number>>;
}