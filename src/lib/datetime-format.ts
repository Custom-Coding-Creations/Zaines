const dateFormatterUtc = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

const dateTimeFormatterUtc = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

const timeFormatterUtc = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

export function formatDateUtc(value: string | number | Date): string {
  return dateFormatterUtc.format(new Date(value));
}

export function formatDateTimeUtc(value: string | number | Date): string {
  return dateTimeFormatterUtc.format(new Date(value));
}

export function formatTimeUtc(value: string | number | Date): string {
  return timeFormatterUtc.format(new Date(value));
}
