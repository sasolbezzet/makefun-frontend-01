// Institutional formatting and sanitization utilities

/** Escape HTML characters to prevent XSS. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formats a numeric value as standard USD currency ($1,250 or $0.50). */
export function money(value) {
  if (value === null || value === undefined || value === '') return '$0.00';
  const n = Number(value);
  if (Number.isNaN(n)) return '$0.00';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Formats numbers with thousand separators. */
export function num(value) {
  if (value === null || value === undefined) return '0';
  const n = Number(value);
  return Number.isNaN(n) ? '0' : n.toLocaleString('en-US');
}

/** Formats ISO timestamp to human-readable UTC string. */
export function date(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return `${d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })} UTC`;
}

/** Formats time remaining or ended badge. */
export function timeLeft(iso) {
  if (!iso) return 'N/A';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Checks whether a deadline is within 24 hours. */
export function isClosingSoon(iso) {
  if (!iso) return false;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms < 86400000;
}

/** Shortens cryptographic public keys or addresses. */
export function shortAddr(addr) {
  if (!addr) return '';
  const s = String(addr);
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

/** Truncates text cleanly with ellipsis. */
export function truncate(str, len = 140) {
  if (!str) return '';
  if (str.length <= len) return str;
  return `${str.slice(0, len).trim()}…`;
}
