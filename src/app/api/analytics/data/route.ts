import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedToken } from '@/lib/api/middleware';
import { getUserDataSummary, getAllListeningData, getListeningDataByDateRange } from '@/lib/supabase/storage';
import { getAggregation } from '@/lib/supabase/aggregations-storage';
import { getDateRangeForTimeRange, type TimeRange } from '@/lib/utils/date-ranges';
import {
  aggregateByDate,
  getTimePatterns,
  getDayPatterns,
  getTopTracks,
  getTopArtists,
} from '@/lib/data-processing/aggregate';
import type { ListeningFrequency, TimePattern, DayPattern, AggregatedTopTrack, AggregatedTopArtist } from '@/types';

/**
 * GET /api/analytics/data
 * Get aggregated analytics data (much faster than fetching all rows)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await getAuthenticatedToken();
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get user ID from Spotify profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${authResult.token}`,
      },
    });

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 401 }
      );
    }

    const profile = await profileResponse.json();
    const userId = profile.id;

    // Check query parameters
    const searchParams = request.nextUrl.searchParams;
    const summaryOnly = searchParams.get('summary') === 'true';
    const groupBy = (searchParams.get('groupBy') as 'day' | 'month' | 'year') || 'day';
    const timeRange = (searchParams.get('timeRange') as TimeRange) || 'week'; // Default to 'week'

    if (summaryOnly) {
      // Return summary only for faster initial load
      const summary = await getUserDataSummary(userId);
      return NextResponse.json({
        summary,
        data: [],
        totalCount: summary?.total_tracks || 0,
      });
    }

    // Fetch pre-computed aggregations from Supabase (much faster!)
    console.log(`Fetching pre-computed analytics data for user ${userId}...`);
    
    const summary = await getUserDataSummary(userId);
    
    if (!summary) {
      return NextResponse.json({
        summary: null,
        frequencyData: [],
        timePatterns: [],
        dayPatterns: [],
        topTracks: [],
        topArtists: [],
        totalCount: 0,
      });
    }

    // For "all time", use pre-computed aggregations (much faster!)
    if (timeRange === 'all') {
      console.log(`Using pre-computed aggregations for all-time data...`);
      
      // Try to fetch pre-computed aggregations
      let frequencyData: ListeningFrequency[] | null = null;
      let timePatterns: TimePattern[] | null = null;
      let dayPatterns: DayPattern[] | null = null;
      let topTracks: AggregatedTopTrack[] | null = null;
      let topArtists: AggregatedTopArtist[] | null = null;

      try {
        [frequencyData, timePatterns, dayPatterns, topTracks, topArtists] = await Promise.all([
          getAggregation<ListeningFrequency>(userId, 'date_frequency', groupBy).catch(() => null),
          getAggregation<TimePattern>(userId, 'time_pattern').catch(() => null),
          getAggregation<DayPattern>(userId, 'day_pattern').catch(() => null),
          getAggregation<AggregatedTopTrack>(userId, 'top_tracks').catch(() => null),
          getAggregation<AggregatedTopArtist>(userId, 'top_artists').catch(() => null),
        ]);
      } catch (error) {
        console.warn('Error fetching pre-computed aggregations, will compute on the fly:', error);
      }

      // If we have pre-computed aggregations, use them
      if (frequencyData && timePatterns && dayPatterns && topTracks && topArtists) {
        console.log(`Using pre-computed aggregations: ${frequencyData.length} date groups, ${topTracks.length} top tracks`);
        
        return NextResponse.json({
          summary,
          frequencyData,
          timePatterns,
          dayPatterns,
          topTracks: topTracks.slice(0, 10),
          topArtists: topArtists.slice(0, 10),
          totalCount: summary?.total_tracks || 0,
          allTimeTotalCount: summary?.total_tracks || 0,
        });
      }

      // Fallback: fetch all data and compute (slower, but works)
      console.log(`Pre-computed aggregations not available, fetching all data...`);
      const allData = await getAllListeningData(userId);
      
      const frequencyDataComputed = aggregateByDate(allData, groupBy);
      const timePatternsComputed = getTimePatterns(allData);
      const dayPatternsComputed = getDayPatterns(allData);
      const topTracksComputed = getTopTracks(allData, 50);
      const topArtistsComputed = getTopArtists(allData, 50);

      return NextResponse.json({
        summary,
        frequencyData: frequencyDataComputed,
        timePatterns: timePatternsComputed,
        dayPatterns: dayPatternsComputed,
        topTracks: topTracksComputed.slice(0, 10),
        topArtists: topArtistsComputed.slice(0, 10),
        totalCount: allData.length,
        allTimeTotalCount: summary?.total_tracks || 0,
      });
    }

    // For "year" time range, try to use pre-computed aggregations first (much faster!)
    if (timeRange === 'year') {
      console.log(`Using pre-computed aggregations for year data...`);
      
      try {
        // Try to fetch pre-computed aggregations
        const [allFrequencyData, allTimePatterns, allDayPatterns, allTopTracks, allTopArtists] = await Promise.all([
          getAggregation<ListeningFrequency>(userId, 'date_frequency', groupBy).catch(() => null),
          getAggregation<TimePattern>(userId, 'time_pattern').catch(() => null),
          getAggregation<DayPattern>(userId, 'day_pattern').catch(() => null),
          getAggregation<AggregatedTopTrack>(userId, 'top_tracks').catch(() => null),
          getAggregation<AggregatedTopArtist>(userId, 'top_artists').catch(() => null),
        ]);

        // If we have pre-computed aggregations, use them directly (no data fetching needed!)
        if (allFrequencyData && allTimePatterns && allDayPatterns && allTopTracks && allTopArtists) {
          const dateRange = getDateRangeForTimeRange(timeRange);
          
          // Filter frequency data by date range
          const frequencyData = allFrequencyData.filter((item) => {
            const itemDate = new Date(item.date).getTime();
            return itemDate >= dateRange.start.getTime() && itemDate <= dateRange.end.getTime();
          });

          // Use pre-computed aggregations directly - no data fetching!
          // Top tracks/artists and time/day patterns are already aggregated, use them as-is
          // They represent overall patterns which is what users want to see

          // Get summary stats using fast SQL queries only
          const { createSupabaseServerClient } = await import('@/lib/supabase/client');
          const supabase = createSupabaseServerClient();
          
          // Get count for the year using SQL (very fast)
          const { count: totalCount } = await supabase
            .from('listening_data')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('played_at', dateRange.start.toISOString())
            .lte('played_at', dateRange.end.toISOString());

          // For artist count, use an approximation from top artists (much faster than counting all)
          // Or we can skip it and use the summary's total_artists as approximation
          const totalArtists = allTopArtists.length > 0 ? Math.max(allTopArtists.length, summary?.total_artists || 0) : (summary?.total_artists || 0);

          // Calculate filtered summary stats from frequency data
          const totalListeningTime = frequencyData.reduce((sum, item) => sum + item.totalDuration, 0);
          
          const filteredSummary = {
            ...summary,
            total_tracks: totalCount,
            total_artists: totalArtists,
            total_listening_time_ms: totalListeningTime,
            date_range_start: dateRange.start.toISOString(),
            date_range_end: dateRange.end.toISOString(),
          };

          console.log(`Using pre-computed aggregations for year (no data fetching): ${frequencyData.length} date groups`);

          return NextResponse.json({
            summary: filteredSummary,
            frequencyData,
            timePatterns: allTimePatterns, // Use pre-computed
            dayPatterns: allDayPatterns, // Use pre-computed
            topTracks: allTopTracks.slice(0, 10), // Use pre-computed
            topArtists: allTopArtists.slice(0, 10), // Use pre-computed
            totalCount: totalCount,
            allTimeTotalCount: summary?.total_tracks || 0,
          });
        }
      } catch (error) {
        console.warn('Error using pre-computed aggregations for year, falling back to raw data:', error);
      }
    }

    // For filtered time ranges, query Supabase with date filters (much faster!)
    const dateRange = getDateRangeForTimeRange(timeRange);
    console.log(`Fetching filtered listening data for time range: ${timeRange} (${dateRange.start.toISOString()} to ${dateRange.end.toISOString()})...`);
    
    const filteredData = await getListeningDataByDateRange(userId, dateRange.start, dateRange.end);
    console.log(`Fetched ${filteredData.length} tracks for time range: ${timeRange}`);

    // Compute aggregations from filtered data
    const frequencyData = aggregateByDate(filteredData, groupBy);
    const timePatterns = getTimePatterns(filteredData);
    const dayPatterns = getDayPatterns(filteredData);
    const topTracks = getTopTracks(filteredData, 50);
    const topArtists = getTopArtists(filteredData, 50);

    // Limit top tracks/artists to 10 for display
    const topTracksLimited = topTracks.slice(0, 10);
    const topArtistsLimited = topArtists.slice(0, 10);

    // Calculate filtered summary stats
    const totalListeningTime = filteredData.reduce((sum, d) => sum + d.durationMs, 0);
    const totalArtists = new Set(filteredData.map((d) => d.artistName)).size;
    const sortedByDate = [...filteredData].sort((a, b) => 
      a.playedAt.getTime() - b.playedAt.getTime()
    );
    const oldestDate = sortedByDate.length > 0 ? sortedByDate[0].playedAt : dateRange.start;
    const newestDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].playedAt : dateRange.end;

    const filteredSummary = {
      ...summary,
      total_tracks: filteredData.length,
      total_artists: totalArtists,
      total_listening_time_ms: totalListeningTime,
      date_range_start: oldestDate.toISOString(),
      date_range_end: newestDate.toISOString(),
    };

    console.log(`Computed aggregations: ${frequencyData.length} date groups, ${topTracksLimited.length} top tracks`);

    return NextResponse.json({
      summary: filteredSummary,
      frequencyData,
      timePatterns,
      dayPatterns,
      topTracks: topTracksLimited,
      topArtists: topArtistsLimited,
      totalCount: filteredData.length,
      allTimeTotalCount: summary?.total_tracks || 0, // Include all-time count for comparison
    });
  } catch (error: any) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

