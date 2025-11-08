import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedToken } from '@/lib/api/middleware';
import { getUserDataSummary } from '@/lib/supabase/storage';
import { getAggregation } from '@/lib/supabase/aggregations-storage';
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

    // Try to fetch aggregations, but handle errors gracefully (table might not exist yet)
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
      console.warn('Error fetching aggregations (table might not exist yet):', error);
      // Continue with null values - will return empty arrays
    }

    // Limit top tracks/artists to 10 for display
    const topTracksLimited = topTracks ? topTracks.slice(0, 10) : [];
    const topArtistsLimited = topArtists ? topArtists.slice(0, 10) : [];

    console.log(`Fetched pre-computed data: ${frequencyData?.length || 0} date groups, ${topTracksLimited.length} top tracks`);

    return NextResponse.json({
      summary,
      frequencyData: frequencyData || [],
      timePatterns: timePatterns || [],
      dayPatterns: dayPatterns || [],
      topTracks: topTracksLimited,
      topArtists: topArtistsLimited,
      totalCount: summary?.total_tracks || 0,
    });
  } catch (error: any) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

