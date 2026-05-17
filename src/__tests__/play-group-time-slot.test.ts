import { describe, expect, it } from 'vitest';
import {
  parseTimeSlotRange,
  shiftCoversRange,
  timeRangesOverlap,
} from '@/lib/play-groups/time-slot';

describe('play-group time-slot utility', () => {
  it('parses 24-hour time slots', () => {
    expect(parseTimeSlotRange('09:00-11:30')).toEqual({ start: 540, end: 690 });
  });

  it('parses AM/PM time slots', () => {
    expect(parseTimeSlotRange('9:00 am - 11:30 am')).toEqual({ start: 540, end: 690 });
    expect(parseTimeSlotRange('1:15pm to 3:45pm')).toEqual({ start: 795, end: 945 });
  });

  it('rejects invalid slots', () => {
    expect(parseTimeSlotRange('11:00-09:00')).toBeNull();
    expect(parseTimeSlotRange('not-a-slot')).toBeNull();
  });

  it('checks shift coverage over range', () => {
    const slot = parseTimeSlotRange('09:00-11:00');
    expect(shiftCoversRange(slot, '08:00', '12:00')).toBe(true);
    expect(shiftCoversRange(slot, '10:00', '12:00')).toBe(false);
    expect(shiftCoversRange(slot, '8:00am', '12:00pm')).toBe(true);
  });

  it('detects overlap correctly', () => {
    const left = parseTimeSlotRange('09:00-11:00');
    const right = parseTimeSlotRange('10:30-12:00');
    const nonOverlap = parseTimeSlotRange('11:00-12:00');

    expect(timeRangesOverlap(left, right)).toBe(true);
    expect(timeRangesOverlap(left, nonOverlap)).toBe(false);
  });
});
