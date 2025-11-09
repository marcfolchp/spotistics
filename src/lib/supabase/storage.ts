import { createSupabaseServerClient } from './client';
import type { ProcessedListeningData } from '@/types';

/**
 * Store processed listening data in Supabase
 */
export async function storeListeningData(
  userId: string,
  data: ProcessedListeningData[]
): Promise<void> {
  const supabase = createSupabaseServerClient();

  // Prepare data for insertion
  const rows = data.map((item) => ({
    user_id: userId,
    track_name: item.trackName,
    artist_name: item.artistName,
    played_at: item.playedAt.toISOString(),
    duration_ms: item.durationMs,
    source: item.source,
  }));

  // Insert data in batches (Supabase has a limit of 1000 rows per insert)
  const batchSize = 1000;
  const totalBatches = Math.ceil(rows.length / batchSize);
  console.log(`Inserting ${rows.length} rows in ${totalBatches} batches...`);
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    const { error } = await supabase
      .from('listening_data')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${batchNumber}/${totalBatches}:`, error);
      throw new Error(`Failed to store data: ${error.message}`);
    }
    
    if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
      console.log(`Inserted batch ${batchNumber}/${totalBatches} (${i + batch.length}/${rows.length} rows)`);
    }
  }
  
  console.log(`Successfully inserted all ${rows.length} rows`);
}

/**
 * Get listening data for a user
 */
export async function getListeningData(
  userId: string,
  limit?: number,
  offset?: number
): Promise<ProcessedListeningData[]> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from('listening_data')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  if (offset) {
    query = query.range(offset, offset + (limit || 1000) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listening data:', error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Convert database rows to ProcessedListeningData
  return data.map((row) => ({
    trackName: row.track_name,
    artistName: row.artist_name,
    playedAt: new Date(row.played_at),
    durationMs: row.duration_ms,
    source: row.source,
    trackId: undefined,
    artistId: undefined,
  }));
}

/**
 * Get all listening data for a user (for analytics)
 * Supabase has a default limit of 1000 rows, so we need to paginate
 */
export async function getAllListeningData(userId: string): Promise<ProcessedListeningData[]> {
  const supabase = createSupabaseServerClient();

  const allData: ProcessedListeningData[] = [];
  const pageSize = 1000; // Supabase default limit
  let offset = 0;
  let hasMore = true;

  console.log(`Fetching all listening data for user ${userId}...`);

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('listening_data')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching listening data:', error);
      throw new Error(`Failed to fetch data: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    // Convert database rows to ProcessedListeningData
    const processed = data.map((row) => ({
      trackName: row.track_name,
      artistName: row.artist_name,
      playedAt: new Date(row.played_at),
      durationMs: row.duration_ms,
      source: row.source,
      trackId: undefined,
      artistId: undefined,
    }));

    allData.push(...processed);
    offset += pageSize;

    // Check if we've fetched all data
    if (data.length < pageSize || (count !== null && offset >= count)) {
      hasMore = false;
    }

    if (offset % 10000 === 0) {
      console.log(`Fetched ${allData.length} rows so far...`);
    }
  }

  console.log(`Fetched total of ${allData.length} listening records`);

  return allData;
}

/**
 * Get listening data filtered by date range (much faster than fetching all and filtering)
 * Supabase has a default limit of 1000 rows, so we need to paginate
 */
export async function getListeningDataByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ProcessedListeningData[]> {
  const supabase = createSupabaseServerClient();

  const allData: ProcessedListeningData[] = [];
  const pageSize = 1000; // Supabase default limit
  let offset = 0;
  let hasMore = true;

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  console.log(`Fetching listening data for user ${userId} from ${startISO} to ${endISO}...`);

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('listening_data')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('played_at', startISO)
      .lte('played_at', endISO)
      .order('played_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching listening data:', error);
      throw new Error(`Failed to fetch data: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    // Convert database rows to ProcessedListeningData
    const processed = data.map((row) => ({
      trackName: row.track_name,
      artistName: row.artist_name,
      playedAt: new Date(row.played_at),
      durationMs: row.duration_ms,
      source: row.source,
      trackId: undefined,
      artistId: undefined,
    }));

    allData.push(...processed);
    offset += pageSize;

    // Check if we've fetched all data
    if (data.length < pageSize || (count !== null && offset >= count)) {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allData.length} listening records for date range`);

  return allData;
}

/**
 * Store or update user data summary
 */
export async function storeUserDataSummary(
  userId: string,
  summary: {
    totalTracks: number;
    totalArtists: number;
    totalListeningTime: number;
    dateRangeStart: Date;
    dateRangeEnd: Date;
  }
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('user_data_summary')
    .upsert({
      user_id: userId,
      total_tracks: summary.totalTracks,
      total_artists: summary.totalArtists,
      total_listening_time_ms: summary.totalListeningTime,
      date_range_start: summary.dateRangeStart.toISOString(),
      date_range_end: summary.dateRangeEnd.toISOString(),
      uploaded_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error storing user data summary:', error);
    throw new Error(`Failed to store summary: ${error.message}`);
  }
}

/**
 * Get user data summary
 */
export async function getUserDataSummary(userId: string) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('user_data_summary')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No data found
      return null;
    }
    console.error('Error fetching user data summary:', error);
    throw new Error(`Failed to fetch summary: ${error.message}`);
  }

  return data;
}

/**
 * Delete all listening data for a user
 */
export async function deleteUserListeningData(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('listening_data')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting listening data:', error);
    throw new Error(`Failed to delete data: ${error.message}`);
  }
}

