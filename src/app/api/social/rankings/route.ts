import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getFriends } from '@/lib/supabase/social';
import { getUserDataSummary } from '@/lib/supabase/storage';
import { getAggregation } from '@/lib/supabase/aggregations-storage';
import { getDateRangeForTimeRange, filterDataByDateRange, type TimeRange } from '@/lib/utils/date-ranges';
import type { ListeningFrequency } from '@/types';
import { createSupabaseServerClient } from '@/lib/supabase/client';

export interface FriendRanking {
  userId: string;
  displayName: string | null;
  profileImageUrl: string | null;
  totalListeningTime: number; // in milliseconds
  totalTracks: number;
  totalArtists: number;
  rank: number;
}

/**
 * GET /api/social/rankings
 * Get rankings for friends based on listening stats
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from Spotify profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const timeRange = (searchParams.get('timeRange') || 'week') as TimeRange;
    const rankingType = searchParams.get('type') || 'listeningTime'; // 'listeningTime', 'tracks', 'artists'

    // Get friends
    const friends = await getFriends(userId);

    if (friends.length === 0) {
      return NextResponse.json({
        rankings: [],
        userRanking: null,
        message: 'No friends found. Add friends to see rankings!',
      }, { status: 200 }); // Return 200 with empty data instead of error
    }

    // Get date range for filtering
    const dateRange = getDateRangeForTimeRange(timeRange);

    // Calculate rankings for all friends + current user
    const allUserIds = [userId, ...friends.map((f) => f.user_id)];
    const rankings: FriendRanking[] = [];

    for (const friendUserId of allUserIds) {
      try {
        let totalListeningTime = 0;
        let totalTracks = 0;
        let totalArtists = 0;

        if (timeRange === 'all') {
          // Use user_data_summary for "all time" - much faster!
          const summary = await getUserDataSummary(friendUserId);
          if (summary) {
            totalListeningTime = summary.total_listening_time_ms || 0;
            totalTracks = summary.total_tracks || 0;
            totalArtists = summary.total_artists || 0;
          }
        } else {
          // For specific time ranges, use date_frequency aggregation filtered by date range
          const dateFrequency = await getAggregation<ListeningFrequency>(
            friendUserId,
            'date_frequency',
            'day'
          );

          if (dateFrequency && dateFrequency.length > 0) {
            // Filter by date range - ListeningFrequency has date as Date or string
            const filteredFrequency = dateFrequency.filter((f) => {
              const itemDate = typeof f.date === 'string' ? new Date(f.date) : f.date;
              return itemDate >= dateRange.start && itemDate <= dateRange.end;
            });

            // Calculate totals from filtered data
            totalListeningTime = filteredFrequency.reduce(
              (sum, item) => sum + (item.totalDuration || 0),
              0
            );
            totalTracks = filteredFrequency.reduce(
              (sum, item) => sum + (item.playCount || 0),
              0
            );

            // For unique artists count, we need to query the database
            // Use a DISTINCT query to get unique artists count efficiently
            const supabase = createSupabaseServerClient();
            const { data: artistsData } = await supabase
              .from('listening_data')
              .select('artist_name')
              .eq('user_id', friendUserId)
              .gte('played_at', dateRange.start.toISOString())
              .lte('played_at', dateRange.end.toISOString());

            // Count unique artists
            if (artistsData) {
              const uniqueArtists = new Set(artistsData.map((item) => item.artist_name));
              totalArtists = uniqueArtists.size;
            }
          } else {
            // Fallback: Use efficient COUNT queries instead of fetching all data
            const supabase = createSupabaseServerClient();
            
            // Get total tracks count
            const { count: tracksCount } = await supabase
              .from('listening_data')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', friendUserId)
              .gte('played_at', dateRange.start.toISOString())
              .lte('played_at', dateRange.end.toISOString());

            totalTracks = tracksCount || 0;

            // Get unique artists count - need to fetch and count distinct
            const { data: artistsData } = await supabase
              .from('listening_data')
              .select('artist_name')
              .eq('user_id', friendUserId)
              .gte('played_at', dateRange.start.toISOString())
              .lte('played_at', dateRange.end.toISOString());

            if (artistsData) {
              const uniqueArtists = new Set(artistsData.map((item) => item.artist_name));
              totalArtists = uniqueArtists.size;
            }

            // Get total listening time using SUM
            const { data: timeData } = await supabase
              .from('listening_data')
              .select('duration_ms')
              .eq('user_id', friendUserId)
              .gte('played_at', dateRange.start.toISOString())
              .lte('played_at', dateRange.end.toISOString());

            totalListeningTime = timeData?.reduce((sum, item) => sum + (item.duration_ms || 0), 0) || 0;
          }
        }

        // Get user profile info
        let displayName: string | null = null;
        let profileImageUrl: string | null = null;

        if (friendUserId === userId) {
          displayName = profile.display_name || null;
          profileImageUrl = profile.images && profile.images.length > 0 
            ? profile.images[0].url 
            : null;
        } else {
          const friend = friends.find((f) => f.user_id === friendUserId);
          if (friend) {
            displayName = friend.display_name;
            profileImageUrl = friend.profile_image_url;
          }
        }

        rankings.push({
          userId: friendUserId,
          displayName,
          profileImageUrl,
          totalListeningTime,
          totalTracks,
          totalArtists,
          rank: 0, // Will be set after sorting
        });
      } catch (error) {
        console.error(`Error calculating ranking for user ${friendUserId}:`, error);
        // Skip this user if there's an error
      }
    }

    // Sort by ranking type
    let sortedRankings: FriendRanking[];
    switch (rankingType) {
      case 'tracks':
        sortedRankings = rankings.sort((a, b) => b.totalTracks - a.totalTracks);
        break;
      case 'artists':
        sortedRankings = rankings.sort((a, b) => b.totalArtists - a.totalArtists);
        break;
      case 'listeningTime':
      default:
        sortedRankings = rankings.sort((a, b) => b.totalListeningTime - a.totalListeningTime);
        break;
    }

    // Assign ranks
    sortedRankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    // Find current user's ranking
    const userRanking = sortedRankings.find((r) => r.userId === userId) || null;

    return NextResponse.json({
      rankings: sortedRankings,
      userRanking,
      timeRange,
      rankingType,
    });
  } catch (error: any) {
    console.error('Error getting rankings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get rankings' },
      { status: 500 }
    );
  }
}

