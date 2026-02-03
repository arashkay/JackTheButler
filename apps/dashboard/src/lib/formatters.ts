/**
 * Shared formatting utilities for dates, times, and currencies.
 */

/**
 * Format a date string as "Jan 1, 2024"
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string as "Mon, Jan 1"
 */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string as "10:30 AM"
 */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string as "Jan 1, 10:30 AM"
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Translation function type for i18n support
 */
type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

/**
 * Format a date as relative time: "Just now", "5m ago", "2h ago", "3d ago"
 * Falls back to date string for older dates.
 * Pass a translation function (t) for i18n support.
 */
export function formatTimeAgo(dateStr: string, t?: TranslateFunction): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (t) {
    if (seconds < 60) return t('time.justNow');
    if (seconds < 3600) return t('time.minutesAgo', { count: Math.floor(seconds / 60) });
    if (seconds < 86400) return t('time.hoursAgo', { count: Math.floor(seconds / 3600) });
    if (seconds < 604800) return t('time.daysAgo', { count: Math.floor(seconds / 86400) });
  } else {
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Format a number as currency: "$1,234"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
