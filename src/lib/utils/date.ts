import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Get date range for a day
 */
export function getDayRange(date: Date | string): { start: Date; end: Date } {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return {
    start: startOfDay(dateObj),
    end: endOfDay(dateObj),
  };
}

/**
 * Get date range for a month
 */
export function getMonthRange(date: Date | string): { start: Date; end: Date } {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return {
    start: startOfMonth(dateObj),
    end: endOfMonth(dateObj),
  };
}

/**
 * Get date range for a year
 */
export function getYearRange(date: Date | string): { start: Date; end: Date } {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return {
    start: startOfYear(dateObj),
    end: endOfYear(dateObj),
  };
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format duration to hours and minutes
 */
export function formatDurationHours(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

