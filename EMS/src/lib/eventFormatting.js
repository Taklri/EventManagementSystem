const timezone = { timeZone: 'Asia/Manila' };
export function formatEventDate(value, options = {}) {
  return new Intl.DateTimeFormat('en-PH', { ...timezone, month: 'short', day: 'numeric', year: 'numeric', ...options }).format(new Date(value));
}
export function formatEventSchedule(start, end) {
  const time = (value) => new Intl.DateTimeFormat('en-PH', { ...timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  return formatEventDate(start) === formatEventDate(end)
    ? `${formatEventDate(start)} · ${time(start)} – ${time(end)}`
    : `${formatEventDate(start)} · ${time(start)} – ${formatEventDate(end)} · ${time(end)}`;
}
export function organizerName(organizer) {
  return [organizer?.firstName, organizer?.middleName, organizer?.lastName].filter(Boolean).join(' ') || 'National University';
}
