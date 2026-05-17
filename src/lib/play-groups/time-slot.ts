export type TimeSlotRange = {
  start: number;
  end: number;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseClockTime(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  const amPmMatch = /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(value);
  if (amPmMatch) {
    const hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const period = amPmMatch[3];
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    const normalizedHours = period === 'am'
      ? (hours === 12 ? 0 : hours)
      : (hours === 12 ? 12 : hours + 12);

    return normalizedHours * 60 + minutes;
  }

  const twentyFourHourMatch = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!twentyFourHourMatch) return null;

  const hours = Number(twentyFourHourMatch[1]);
  const minutes = Number(twentyFourHourMatch[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function parseTimeSlotRange(timeSlot: string): TimeSlotRange | null {
  const cleaned = normalizeWhitespace(timeSlot).toLowerCase();
  const normalized = cleaned.replace(/\s*-\s*/g, '-').replace(/\s+to\s+/g, 'to');
  const separator = normalized.includes('-') ? '-' : normalized.includes('to') ? 'to' : null;
  if (!separator) return null;

  const [startRaw, endRaw] = normalized.split(separator);
  if (!startRaw || !endRaw) return null;

  const start = parseClockTime(startRaw);
  const end = parseClockTime(endRaw);
  if (start === null || end === null || end <= start) return null;

  return { start, end };
}

export function shiftCoversRange(
  slot: TimeSlotRange | null,
  shiftStart: string,
  shiftEnd: string,
) {
  if (!slot) return false;

  const shiftStartMinutes = parseClockTime(shiftStart);
  const shiftEndMinutes = parseClockTime(shiftEnd);
  if (shiftStartMinutes === null || shiftEndMinutes === null || shiftEndMinutes <= shiftStartMinutes) {
    return false;
  }

  return shiftStartMinutes <= slot.start && shiftEndMinutes >= slot.end;
}

export function timeRangesOverlap(
  left: TimeSlotRange | null,
  right: TimeSlotRange | null,
) {
  if (!left || !right) return false;
  return left.start < right.end && right.start < left.end;
}
