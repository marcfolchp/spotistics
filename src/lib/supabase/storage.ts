import { createSupabaseServerClient } from './client';
import type { ProcessedListeningData } from '@/types';

/**
 * Store processed listening data in Supabase
 */
export async function storeListeningData(
  userId: string,
  data: ProcessedListeningData[],
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  if (!data || data.length === 0) {
    console.warn('No data to store');
    return;
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (clientError: any) {
    console.error('Failed to create Supabase client:', clientError);
    throw new Error(`Database connection failed: ${clientError.message}`);
  }

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
  console.log(`Inserting ${rows.length} rows in ${totalBatches} batches into listening_data table...`);
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      const { error } = await supabase
        .from('listening_data')
        .insert(batch);

      if (error) {
        console.error(`Error inserting batch ${batchNumber}/${totalBatches}:`, error);
        console.error(`Error code:`, error.code);
        console.error(`Error hint:`, error.hint);
        console.error(`Error details:`, JSON.stringify(error, null, 2));
        console.error(`Batch size:`, batch.length);
        console.error(`Batch sample (first row):`, JSON.stringify(batch[0], null, 2));
        throw new Error(`Failed to store data: ${error.message || 'Unknown error'} (code: ${error.code || 'N/A'})`);
      }
      
      console.log(`[Batch ${batchNumber}] Successfully inserted ${batch.length} rows`);
      
      // Update progress
      const progress = Math.floor((batchNumber / totalBatches) * 100);
      const message = `Storing data... ${batchNumber}/${totalBatches} batches (${Math.min(i + batch.length, rows.length)}/${rows.length} tracks)`;
      
      if (onProgress) {
        onProgress(progress, message);
      }
      
      if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
        console.log(`Inserted batch ${batchNumber}/${totalBatches} (${i + batch.length}/${rows.length} rows)`);
      }
    } catch (batchError: any) {
      console.error(`[Batch ${batchNumber}] Error:`, batchError);
      throw batchError;
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

/**
 * Store recent tracks with full metadata for dashboard display
 * Keeps only the most recent 100 tracks per user
 */
export async function storeRecentTracks(
  userId: string,
  tracks: Array<{ track: any; playedAt: Date }>
): Promise<void> {
  const supabase = createSupabaseServerClient();

  // Prepare data for insertion
  const rows = tracks.map(({ track, playedAt }) => ({
    user_id: userId,
    track_data: {
      ...track,
      playedAt: playedAt.toISOString(),
    },
    played_at: playedAt.toISOString(),
  }));

  // Delete existing recent tracks for this user (we'll replace them all)
  const { error: deleteError } = await supabase
    .from('recent_tracks')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting old recent tracks:', deleteError);
    // Continue anyway - the trigger will clean up
  }

  // Insert new tracks (limit to 100 most recent)
  const tracksToInsert = rows.slice(0, 100);
  
  if (tracksToInsert.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('recent_tracks')
    .insert(tracksToInsert);

  if (error) {
    console.error('[Recent Tracks] Error storing recent tracks:', error);
    console.error('[Recent Tracks] Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to store recent tracks: ${error.message}`);
  }

  console.log(`[Recent Tracks] Successfully stored ${tracksToInsert.length} recent tracks for user ${userId}`);
}

/**
 * Get recent tracks for a user (for dashboard display)
 * Returns up to 100 most recent tracks with full metadata
 */
export async function getRecentTracks(
  userId: string,
  limit: number = 100
): Promise<Array<{ track: any; playedAt: Date }>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('recent_tracks')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Check if table doesn't exist (common error code)
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn(`[Recent Tracks] Table 'recent_tracks' does not exist. Please run the SQL from docs/supabase-recent-tracks-table.md`);
      throw new Error('RECENT_TRACKS_TABLE_NOT_FOUND');
    }
    console.error('Error fetching recent tracks:', error);
    throw new Error(`Failed to fetch recent tracks: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Convert database rows to track objects
  return data.map((row) => {
    const trackData = row.track_data as any;
    const playedAt = new Date(row.played_at);
    
    // Extract playedAt from track_data if it exists, otherwise use row.played_at
    const track = { ...trackData };
    if (track.playedAt) {
      delete track.playedAt; // Remove from track object, we'll use the Date separately
    }
    
    return {
      track,
      playedAt,
    };
  });
}

