/**
 * Date range utilities for filtering analytics data
 */

export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get date range for a given time range option
 */
export function getDateRangeForTimeRange(timeRange: TimeRange): DateRange {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  let start: Date;

  switch (timeRange) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    
    case 'week':
      // Get start of current week (Monday)
      const dayOfWeek = now.getDay();
      // Monday is 1, Sunday is 0
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayDate = new Date(now);
      mondayDate.setDate(now.getDate() - daysFromMonday);
      mondayDate.setHours(0, 0, 0, 0);
      start = mondayDate;
      break;
    
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    
    case 'all':
    default:
      // Use a very old date for "all time"
      start = new Date(1970, 0, 1, 0, 0, 0, 0);
      break;
  }

  return { start, end };
}

/**
 * Filter data by date range
 */
export function filterDataByDateRange<T extends { playedAt: Date }>(
  data: T[],
  dateRange: DateRange
): T[] {
  return data.filter((item) => {
    const playedAt = item.playedAt.getTime();
    const startTime = dateRange.start.getTime();
    const endTime = dateRange.end.getTime();
    return playedAt >= startTime && playedAt <= endTime;
  });
}

/**
 * Get display label for time range
 */
export function getTimeRangeLabel(timeRange: TimeRange): string {
  switch (timeRange) {
    case 'today':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'year':
      return 'This Year';
    case 'all':
      return 'All Time';
    default:
      return 'All Time';
  }
}

