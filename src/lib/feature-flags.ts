/**
 * Feature Flags Configuration
 *
 * Defines feature flags for A/B testing and gradual rollouts.
 * This module is framework-agnostic and remains API-compatible for callers.
 *
 * Usage:
 * import { getFeatureFlag } from '@/lib/feature-flags';
 * const isEnabled = await getFeatureFlag('new-checkout-flow');
 */

export type FeatureFlagKey =
  | 'new-checkout-flow'
  | 'suite-recommendation-ai'
  | 'photo-gallery-infinite-scroll'
  | 'booking-calendar-v2'
  | 'loyalty-program'
  | 'referral-program';

export interface FeatureFlag {
  key: FeatureFlagKey;
  name: string;
  description: string;
  defaultValue: boolean;
  rolloutPercentage?: number; // 0-100
}

/**
 * Feature flag definitions
 */
export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlag> = {
  'new-checkout-flow': {
    key: 'new-checkout-flow',
    name: 'New Checkout Flow',
    description: 'Streamlined 3-step checkout with embedded payment',
    defaultValue: false,
    rolloutPercentage: 50, // A/B test: 50% of users
  },
  'suite-recommendation-ai': {
    key: 'suite-recommendation-ai',
    name: 'AI Suite Recommendations',
    description: 'ML-powered suite recommendations based on pet preferences',
    defaultValue: false,
    rolloutPercentage: 0, // Not yet rolled out
  },
  'photo-gallery-infinite-scroll': {
    key: 'photo-gallery-infinite-scroll',
    name: 'Photo Gallery Infinite Scroll',
    description: 'Replace pagination with infinite scroll on gallery page',
    defaultValue: false,
    rolloutPercentage: 25, // Limited rollout
  },
  'booking-calendar-v2': {
    key: 'booking-calendar-v2',
    name: 'Booking Calendar V2',
    description: 'New calendar UI with multi-pet booking support',
    defaultValue: false,
    rolloutPercentage: 10, // Early testing
  },
  'loyalty-program': {
    key: 'loyalty-program',
    name: 'Loyalty Program',
    description: 'Points-based loyalty rewards for repeat customers',
    defaultValue: false,
    rolloutPercentage: 0, // Future feature
  },
  'referral-program': {
    key: 'referral-program',
    name: 'Referral Program',
    description: 'Refer-a-friend discount program',
    defaultValue: false,
    rolloutPercentage: 100, // Fully rolled out
  },
};

/**
 * Get feature flag value for a user
 * Uses consistent hashing based on user ID or session ID
 */
export function getFeatureFlag(
  flagKey: FeatureFlagKey,
  userId?: string,
  sessionId?: string
): boolean {
  const flag = FEATURE_FLAGS[flagKey];

  const rollout = flag.rolloutPercentage;
  if (rollout === undefined) {
    return flag.defaultValue;
  }
  if (rollout <= 0) return false;
  if (rollout >= 100) return true;

  // Use consistent hashing to determine flag value
  const identifier = userId || sessionId || 'anonymous';
  const hash = simpleHash(identifier + flagKey);
  const userPercentage = hash % 100;

  return userPercentage < rollout;
}

/**
 * Get all feature flags for a user
 */
export function getAllFeatureFlags(
  userId?: string,
  sessionId?: string
): Record<FeatureFlagKey, boolean> {
  const flags = {} as Record<FeatureFlagKey, boolean>;

  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    flags[key] = getFeatureFlag(key, userId, sessionId);
  }

  return flags;
}

/**
 * Simple hash function for consistent bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * React hook for feature flags (client-side)
 */
export function useFeatureFlag(
  flagKey: FeatureFlagKey,
  userId?: string
): boolean {
  if (typeof window === 'undefined') {
    return FEATURE_FLAGS[flagKey].defaultValue;
  }

  // Get session ID from localStorage or generate one
  let sessionId = '';
  try {
    sessionId = localStorage.getItem('session_id') || '';
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(7);
      localStorage.setItem('session_id', sessionId);
    }
  } catch {
    sessionId = 'anonymous';
  }

  return getFeatureFlag(flagKey, userId, sessionId);
}
