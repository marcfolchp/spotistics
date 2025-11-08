import { createSupabaseServerClient } from './client';
import type { ListeningFrequency, TimePattern, DayPattern, AggregatedTopTrack, AggregatedTopArtist } from '@/types';

/**
 * Get aggregated listening data by date (much faster than fetching all rows)
 * Uses optimized query that only fetches date and duration fields
 */
export async function getListeningFrequencyByDate(
  userId: string,
  groupBy: 'day' | 'month' | 'year' = 'day'
): Promise<ListeningFrequency[]> {
  const supabase = createSupabaseServerClient();

  // Use fallback method (manual aggregation with minimal fields)
  // This is still much faster than fetching all rows
  return await getListeningFrequencyFallback(supabase, userId, groupBy);
}

/**
 * Fallback: Fetch ALL data in chunks and aggregate in memory
 * Paginates through all data to ensure we get everything
 */
async function getListeningFrequencyFallback(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  groupBy: 'day' | 'month' | 'year'
): Promise<ListeningFrequency[]> {
  // Fetch ALL data in chunks (Supabase has 1000 row limit per query)
  const allData: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  console.log(`Fetching all listening data for aggregation (user: ${userId})...`);

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('listening_data')
      .select('played_at, duration_ms', { count: 'exact' })
      .eq('user_id', userId)
      .order('played_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching listening data:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...data);
    offset += pageSize;

    // Check if we've fetched all data
    if (data.length < pageSize || (count !== null && offset >= count)) {
      hasMore = false;
    }

    if (offset % 10000 === 0) {
      console.log(`Fetched ${allData.length} rows for aggregation...`);
    }
  }

  console.log(`Total rows fetched for aggregation: ${allData.length}`);

  // Aggregate in memory (much faster with just 2 fields)
  const grouped = new Map<string, { playCount: number; totalDuration: number }>();
  
  allData.forEach((row) => {
    const date = new Date(row.played_at);
    let key: string;
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
    }

    const existing = grouped.get(key) || { playCount: 0, totalDuration: 0 };
    grouped.set(key, {
      playCount: existing.playCount + 1,
      totalDuration: existing.totalDuration + (row.duration_ms || 0),
    });
  });

  return Array.from(grouped.entries())
    .map(([dateStr, stats]) => ({
      date: new Date(dateStr + (groupBy === 'day' ? '' : groupBy === 'month' ? '-01' : '-01-01')),
      playCount: stats.playCount,
      totalDuration: stats.totalDuration,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get time patterns (hour of day) - optimized
 * Fetches ALL data in chunks to ensure accuracy
 */
export async function getTimePatternsOptimized(userId: string): Promise<TimePattern[]> {
  const supabase = createSupabaseServerClient();

  // Fetch ALL data in chunks (Supabase has 1000 row limit per query)
  const allData: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('listening_data')
      .select('played_at', { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching time patterns:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...data);
    offset += pageSize;

    // Check if we've fetched all data
    if (data.length < pageSize || (count !== null && offset >= count)) {
      hasMore = false;
    }
  }

  // Aggregate by hour
  const hourCounts = new Map<number, number>();
  
  allData.forEach((row) => {
    const hour = new Date(row.played_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    playCount: hourCounts.get(hour) || 0,
  }));
}

/**
 * Get day patterns (day of week) - optimized
 * Fetches ALL data in chunks to ensure accuracy
 */
export async function getDayPatternsOptimized(userId: string): Promise<DayPattern[]> {
  const supabase = createSupabaseServerClient();

  // Fetch ALL data in chunks (Supabase has 1000 row limit per query)
  const allData: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('listening_data')
      .select('played_at', { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching day patterns:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...data);
    offset += pageSize;

    // Check if we've fetched all data
    if (data.length < pageSize || (count !== null && offset >= count)) {
      hasMore = false;
    }
  }

  // Aggregate by day of week (0 = Sunday, 6 = Saturday)
  const dayCounts = new Map<number, number>();
  
  allData.forEach((row) => {
    const day = new Date(row.played_at).getDay();
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    dayName: dayNames[day],
    playCount: dayCounts.get(day) || 0,
  }));
}

/**
 * Get top tracks - optimized
 * Fetches ALL data in chunks to ensure accurate top tracks
 */
export async function getTopTracksOptimized(userId: string, limit: number = 10): Promise<AggregatedTopTrack[]> {
  const supabase = createSupabaseServerClient();

  // Fetch ALL data in chunks (Supabase has 1000 row limit per query)
  const allData: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('listening_data')
      .select('track_name, artist_name, duration_ms', { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching top tracks:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...data);
    offset += pageSize;

    // Check if we've fetched all data
    if (data.length < pageSize || (count !== null && offset >= count)) {
      hasMore = false;
    }
  }

  // Aggregate in memory
  const trackMap = new Map<string, { trackName: string; artistName: string; playCount: number; totalDuration: number }>();
  
  allData.forEach((row) => {
    const key = `${row.track_name}|||${row.artist_name}`;
    const existing = trackMap.get(key) || {
      trackName: row.track_name,
      artistName: row.artist_name,
      playCount: 0,
      totalDuration: 0,
    };
    
    trackMap.set(key, {
      ...existing,
      playCount: existing.playCount + 1,
      totalDuration: existing.totalDuration + (row.duration_ms || 0),
    });
  });

  return Array.from(trackMap.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit)
    .map((track) => ({
      trackName: track.trackName,
      artistName: track.artistName,
      playCount: track.playCount,
      totalDuration: track.totalDuration,
    }));
}

/**
 * Get top artists - optimized
 * Fetches ALL data in chunks to ensure accurate top artists
 */
export async function getTopArtistsOptimized(userId: string, limit: number = 10): Promise<AggregatedTopArtist[]> {
  const supabase = createSupabaseServerClient();

  // Fetch ALL data in chunks (Supabase has 1000 row limit per query)
  const allData: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('listening_data')
      .select('artist_name, duration_ms', { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching top artists:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...data);
    offset += pageSize;

    // Check if we've fetched all data
    if (data.length < pageSize || (count !== null && offset >= count)) {
      hasMore = false;
    }
  }

  // Aggregate in memory
  const artistMap = new Map<string, { artistName: string; playCount: number; totalDuration: number }>();
  
  allData.forEach((row) => {
    const artistName = row.artist_name || 'Unknown';
    const existing = artistMap.get(artistName) || {
      artistName,
      playCount: 0,
      totalDuration: 0,
    };
    
    artistMap.set(artistName, {
      ...existing,
      playCount: existing.playCount + 1,
      totalDuration: existing.totalDuration + (row.duration_ms || 0),
    });
  });

  return Array.from(artistMap.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit)
    .map((artist) => ({
      artistName: artist.artistName,
      playCount: artist.playCount,
      totalDuration: artist.totalDuration,
    }));
}

