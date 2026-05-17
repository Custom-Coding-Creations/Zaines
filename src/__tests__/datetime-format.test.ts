import { describe, expect, it } from 'vitest';
import { formatDateTimeUtc, formatDateUtc, formatTimeUtc } from '@/lib/datetime-format';

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

describe('datetime-format', () => {
  it('formats dates in UTC deterministically', () => {
    expect(formatDateUtc('2026-01-02T23:59:59.000Z')).toBe('1/2/2026');
    expect(formatDateUtc('2026-01-02T00:00:00.000Z')).toBe('1/2/2026');
  });

  it('formats date-times in UTC deterministically', () => {
    const output = normalize(formatDateTimeUtc('2026-01-02T03:04:05.000Z'));
    expect(output).toBe('1/2/2026, 3:04:05 AM');
  });

  it('formats times in UTC deterministically', () => {
    const output = normalize(formatTimeUtc('2026-01-02T15:06:07.000Z'));
    expect(output).toBe('3:06:07 PM');
  });
});
