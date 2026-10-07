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

export function timeUntil(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return '';
  const days = Math.round(diff / 86400000);
  if (diff < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}
