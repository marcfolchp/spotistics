import { ProcessedListeningData, ListeningFrequency, TopTrack, TopArtist, TimePattern, DayPattern } from '@/types';
import { format, getHours, getDay } from 'date-fns';

/**
 * Aggregate listening data by date
 */
export function aggregateByDate(
  data: ProcessedListeningData[],
  groupBy: 'day' | 'month' | 'year' = 'day'
): ListeningFrequency[] {
  const grouped = new Map<string, { playCount: number; totalDuration: number }>();

  data.forEach((item) => {
    let key: string;
    switch (groupBy) {
      case 'day':
        key = format(item.playedAt, 'yyyy-MM-dd');
        break;
      case 'month':
        key = format(item.playedAt, 'yyyy-MM');
        break;
      case 'year':
        key = format(item.playedAt, 'yyyy');
        break;
    }

    const existing = grouped.get(key) || { playCount: 0, totalDuration: 0 };
    grouped.set(key, {
      playCount: existing.playCount + 1,
      totalDuration: existing.totalDuration + item.durationMs,
    });
  });

  return Array.from(grouped.entries())
    .map(([date, stats]) => ({
      date: new Date(date),
      playCount: stats.playCount,
      totalDuration: stats.totalDuration,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get top tracks by play count
 * Returns simplified format for storage
 */
export function getTopTracks(data: ProcessedListeningData[], limit: number = 10): TopTrack[] {
  const trackMap = new Map<string, { trackName: string; artistName: string; playCount: number; totalDuration: number }>();

  data.forEach((item) => {
    const key = `${item.trackName}|||${item.artistName}`;
    const existing = trackMap.get(key) || {
      trackName: item.trackName,
      artistName: item.artistName,
      playCount: 0,
      totalDuration: 0,
    };

    trackMap.set(key, {
      ...existing,
      playCount: existing.playCount + 1,
      totalDuration: existing.totalDuration + item.durationMs,
    });
  });

  return Array.from(trackMap.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit)
    .map((item) => ({
      trackName: item.trackName,
      artistName: item.artistName,
      playCount: item.playCount,
      totalDuration: item.totalDuration,
    }));
}

/**
 * Get top artists by play count
 * Returns simplified format for storage
 */
export function getTopArtists(data: ProcessedListeningData[], limit: number = 10): TopArtist[] {
  const artistMap = new Map<string, { artistName: string; playCount: number; totalDuration: number }>();

  data.forEach((item) => {
    const artistName = item.artistName || 'Unknown';
    const existing = artistMap.get(artistName) || {
      artistName,
      playCount: 0,
      totalDuration: 0,
    };

    artistMap.set(artistName, {
      ...existing,
      playCount: existing.playCount + 1,
      totalDuration: existing.totalDuration + item.durationMs,
    });
  });

  return Array.from(artistMap.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit)
    .map((item) => ({
      artistName: item.artistName,
      playCount: item.playCount,
      totalDuration: item.totalDuration,
    }));
}

/**
 * Get listening patterns by hour of day
 */
export function getTimePatterns(data: ProcessedListeningData[]): TimePattern[] {
  const hourMap = new Map<number, number>();

  data.forEach((item) => {
    const hour = getHours(item.playedAt);
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  });

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    playCount: hourMap.get(hour) || 0,
  }));
}

/**
 * Get listening patterns by day of week
 */
export function getDayPatterns(data: ProcessedListeningData[]): DayPattern[] {
  const dayMap = new Map<number, number>();

  data.forEach((item) => {
    const day = getDay(item.playedAt); // 0 = Sunday, 6 = Saturday
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    dayName: dayNames[day],
    playCount: dayMap.get(day) || 0,
  }));
}

