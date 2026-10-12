const timezone = { timeZone: 'Asia/Manila' };
export const toCampusInputParts = (value) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    ...timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return {
    day: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
};
export const formatEventDate = (value, options = {}) => {
  return new Intl.DateTimeFormat('en-PH', {
    ...timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(value));
};
export const formatEventSchedule = (start, end) => {
  const time = (value) =>
    new Intl.DateTimeFormat('en-PH', { ...timezone, hour: 'numeric', minute: '2-digit' }).format(
      new Date(value),
    );
  return formatEventDate(start) === formatEventDate(end)
    ? `${formatEventDate(start)} · ${time(start)} – ${time(end)}`
    : `${formatEventDate(start)} · ${time(start)} – ${formatEventDate(end)} · ${time(end)}`;
};
export const organizerName = (eventOrOrganizer) => {
  const name = eventOrOrganizer?.organizerName;
  if (typeof name === 'string' && name.trim()) return name.trim();
  const organizer = eventOrOrganizer?.organizer || eventOrOrganizer;
  return (
    [organizer?.firstName, organizer?.middleName, organizer?.lastName].filter(Boolean).join(' ') ||
    'National University'
  );
};
