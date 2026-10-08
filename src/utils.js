const pad = (n) => String(n).padStart(2, '0');

/** ISO string -> value for <input type="datetime-local"> in the admin's local time. */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Same GitHub "blob" -> "raw" rewrite the mobile app applies, so the preview matches. */
export function normalizeImageUrl(url) {
  return (url || '')
    .trim()
    .replace(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)$/i, 'https://raw.githubusercontent.com/$1/$2/$3');
}

function eventDateDayDifference(iso) {
  const eventDate = new Date(iso);
  if (Number.isNaN(eventDate.getTime())) return null;

  const dateParts = (date) => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    return Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  };
  const eventParts = dateParts(eventDate);
  const todayParts = dateParts(new Date());
  const eventDay = Date.UTC(eventParts.year, eventParts.month - 1, eventParts.day);
  const today = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
  return Math.round((eventDay - today) / 86400000);
}

export function statusFromStartDate(iso) {
  const dayDifference = eventDateDayDifference(iso);
  if (dayDifference === null) return null;
  if (dayDifference > 0) return 'coming';
  if (dayDifference === 0) return 'ongoing';
  return 'archived';
}

export function timeUntil(iso) {
  const days = eventDateDayDifference(iso);
  if (days === null) return '';
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}
