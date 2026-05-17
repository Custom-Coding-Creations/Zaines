import { describe, expect, it } from 'vitest';
import { scorePlayGroupCompatibility } from '@/lib/play-groups/compatibility';

describe('play group compatibility scoring', () => {
  it('returns low confidence when no assessment exists', () => {
    const result = scorePlayGroupCompatibility(
      {
        weight: 35,
        assessment: null,
      },
      {
        sizeCategory: 'mixed',
        energyLevel: 'moderate',
      },
    );

    expect(result.score).toBe(45);
  });

  it('penalizes size and energy mismatches', () => {
    const result = scorePlayGroupCompatibility(
      {
        weight: 70,
        assessment: {
          overallResult: 'approved',
          sizeCompatibility: 'medium_and_small',
          energyLevel: 'low',
          reactivityLevel: 4,
          validUntil: null,
        },
      },
      {
        sizeCategory: 'large',
        energyLevel: 'high',
      },
    );

    expect(result.score).toBeLessThan(80);
    expect(result.reason).toContain('assessment avoids large-only groups');
  });

  it('keeps top score for strong fit', () => {
    const result = scorePlayGroupCompatibility(
      {
        weight: 22,
        assessment: {
          overallResult: 'approved',
          sizeCompatibility: 'any',
          energyLevel: 'moderate',
          reactivityLevel: 2,
          validUntil: null,
        },
      },
      {
        sizeCategory: 'small',
        energyLevel: 'moderate',
      },
    );

    expect(result.score).toBe(100);
    expect(result.reason).toBe('Strong behavioral fit');
  });
});
