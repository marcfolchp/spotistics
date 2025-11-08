import { createSupabaseServerClient } from './client';
import type { ListeningFrequency, TimePattern, DayPattern, TopTrack, TopArtist } from '@/types';

type AggregationType = 'date_frequency' | 'time_pattern' | 'day_pattern' | 'top_tracks' | 'top_artists';

interface AggregationRecord {
  user_id: string;
  aggregation_type: AggregationType;
  group_by?: string;
  data: any;
}

/**
 * Store pre-computed aggregations in Supabase
 */
export async function storeAggregation(
  userId: string,
  type: AggregationType,
  data: ListeningFrequency[] | TimePattern[] | DayPattern[] | TopTrack[] | TopArtist[],
  groupBy?: 'day' | 'month' | 'year'
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const record: AggregationRecord = {
    user_id: userId,
    aggregation_type: type,
    group_by: groupBy,
    data: data,
  };

  // For upsert, we need to handle null group_by properly
  // First try to delete existing record, then insert
  const deleteQuery = supabase
    .from('listening_aggregations')
    .delete()
    .eq('user_id', userId)
    .eq('aggregation_type', type);
  
  if (groupBy) {
    deleteQuery.eq('group_by', groupBy);
  } else {
    deleteQuery.is('group_by', null);
  }
  
  await deleteQuery;

  // Now insert the new record
  const { error } = await supabase
    .from('listening_aggregations')
    .insert(record);

  if (error) {
    console.error(`Error storing ${type} aggregation:`, error);
    throw new Error(`Failed to store aggregation: ${error.message}`);
  }
}

/**
 * Get pre-computed aggregation from Supabase
 */
export async function getAggregation<T>(
  userId: string,
  type: AggregationType,
  groupBy?: 'day' | 'month' | 'year'
): Promise<T[] | null> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from('listening_aggregations')
    .select('data')
    .eq('user_id', userId)
    .eq('aggregation_type', type);

  if (groupBy) {
    query = query.eq('group_by', groupBy);
  } else {
    query = query.is('group_by', null);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No data found
      return null;
    }
    // Check if table doesn't exist (error code 42P01)
    if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
      console.warn(`Aggregations table might not exist yet: ${error.message}`);
      return null;
    }
    console.error(`Error fetching ${type} aggregation:`, error);
    return null;
  }

  return data?.data || null;
}

/**
 * Delete all aggregations for a user (when re-uploading data)
 */
export async function deleteUserAggregations(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('listening_aggregations')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting aggregations:', error);
    throw new Error(`Failed to delete aggregations: ${error.message}`);
  }
}

/**
 * Store all aggregations at once (for efficiency)
 */
export async function storeAllAggregations(
  userId: string,
  aggregations: {
    dateFrequency?: { day: ListeningFrequency[]; month: ListeningFrequency[]; year: ListeningFrequency[] };
    timePattern?: TimePattern[];
    dayPattern?: DayPattern[];
    topTracks?: TopTrack[];
    topArtists?: TopArtist[];
  }
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const records: AggregationRecord[] = [];

  // Date frequency aggregations
  if (aggregations.dateFrequency) {
    if (aggregations.dateFrequency.day) {
      records.push({
        user_id: userId,
        aggregation_type: 'date_frequency',
        group_by: 'day',
        data: aggregations.dateFrequency.day,
      });
    }
    if (aggregations.dateFrequency.month) {
      records.push({
        user_id: userId,
        aggregation_type: 'date_frequency',
        group_by: 'month',
        data: aggregations.dateFrequency.month,
      });
    }
    if (aggregations.dateFrequency.year) {
      records.push({
        user_id: userId,
        aggregation_type: 'date_frequency',
        group_by: 'year',
        data: aggregations.dateFrequency.year,
      });
    }
  }

  // Time pattern
  if (aggregations.timePattern) {
    records.push({
      user_id: userId,
      aggregation_type: 'time_pattern',
      data: aggregations.timePattern,
    });
  }

  // Day pattern
  if (aggregations.dayPattern) {
    records.push({
      user_id: userId,
      aggregation_type: 'day_pattern',
      data: aggregations.dayPattern,
    });
  }

  // Top tracks
  if (aggregations.topTracks) {
    records.push({
      user_id: userId,
      aggregation_type: 'top_tracks',
      data: aggregations.topTracks,
    });
  }

  // Top artists
  if (aggregations.topArtists) {
    records.push({
      user_id: userId,
      aggregation_type: 'top_artists',
      data: aggregations.topArtists,
    });
  }

  if (records.length === 0) {
    return;
  }

  // Delete existing aggregations for this user first
  const deleteResult = await supabase
    .from('listening_aggregations')
    .delete()
    .eq('user_id', userId);

  // Check if table exists, if not, log warning but don't fail
  if (deleteResult.error) {
    if (deleteResult.error.message?.includes('does not exist') || deleteResult.error.message?.includes('relation') || deleteResult.error.code === '42P01') {
      console.warn('Aggregations table does not exist yet. Please create it in Supabase. See docs/supabase-setup.md');
      // Don't throw - allow upload to complete without aggregations
      return;
    }
  }

  // Insert all new records
  const { error } = await supabase
    .from('listening_aggregations')
    .insert(records);

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
      console.warn('Aggregations table does not exist yet. Please create it in Supabase. See docs/supabase-setup.md');
      // Don't throw - allow upload to complete without aggregations
      return;
    }
    console.error('Error storing aggregations:', error);
    throw new Error(`Failed to store aggregations: ${error.message}`);
  }
}

