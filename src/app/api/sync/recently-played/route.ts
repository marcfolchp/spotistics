import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/lib/spotify/auth';
import { getAllRecentlyPlayed } from '@/lib/spotify/recently-played';
import { convertSpotifyTrackToProcessed } from '@/lib/data-processing/sync';
import { getListeningData, storeListeningData, getUserDataSummary, storeUserDataSummary } from '@/lib/supabase/storage';
import { getUserRefreshToken } from '@/lib/supabase/tokens';
import { getMostRecentPlayedAt, filterNewTracks } from '@/lib/data-processing/sync';
import { storeAllAggregations, deleteUserAggregations } from '@/lib/supabase/aggregations-storage';
import {
  aggregateByDate,
  getTimePatterns,
  getDayPatterns,
  getTopTracks,
  getTopArtists,
} from '@/lib/data-processing/aggregate';

/**
 * POST /api/sync/recently-played
 * Sync recently played tracks for the authenticated user
 * Can be called manually or by a cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
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

    // Sync recently played tracks for this user
    const result = await syncUserRecentlyPlayed(userId, accessToken);

    return NextResponse.json({
      success: true,
      userId,
      newTracks: result.newTracksCount,
      totalTracks: result.totalTracks,
    });
  } catch (error: any) {
    console.error('Error syncing recently played:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync recently played tracks' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/recently-played
 * Sync recently played tracks for all users (for cron job)
 * Supports Vercel Cron (x-vercel-cron header) or secret key authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Check for Vercel cron header or secret key
    const authHeader = request.headers.get('authorization');
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const secretKey = process.env.SYNC_SECRET_KEY;

    // Vercel automatically adds x-vercel-cron header for cron jobs
    // For manual triggers, use SYNC_SECRET_KEY
    const isVercelCron = vercelCronHeader !== null; // Vercel automatically secures this
    const isSecretKey = secretKey && authHeader === `Bearer ${secretKey}`;

    if (!isVercelCron && !isSecretKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all users with refresh tokens
    const { getAllUsersWithTokens } = await import('@/lib/supabase/tokens');
    const users = await getAllUsersWithTokens();

    console.log(`Syncing recently played tracks for ${users.length} users...`);

    const results = [];
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Spotify credentials not configured' },
        { status: 500 }
      );
    }

    // Sync for each user
    for (const user of users) {
      try {
        // Refresh access token
        const { accessToken } = await refreshAccessToken(
          user.refresh_token,
          clientId,
          clientSecret
        );

        // Sync recently played tracks
        const result = await syncUserRecentlyPlayed(user.user_id, accessToken);
        
        results.push({
          userId: user.user_id,
          success: true,
          newTracks: result.newTracksCount,
          totalTracks: result.totalTracks,
        });

        // Small delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`Error syncing user ${user.user_id}:`, error);
        results.push({
          userId: user.user_id,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      syncedUsers: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error syncing all users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync users' },
      { status: 500 }
    );
  }
}

/**
 * Sync recently played tracks for a specific user
 */
async function syncUserRecentlyPlayed(
  userId: string,
  accessToken: string
): Promise<{ newTracksCount: number; totalTracks: number }> {
  console.log(`Syncing recently played tracks for user ${userId}...`);

  // Get the most recent track from existing data
  // We only need the most recent one, so fetch just the first record ordered by played_at DESC
  const existingData = await getListeningData(userId, 1); // Get only the most recent track
  const mostRecentPlayedAt = getMostRecentPlayedAt(existingData);

  // Fetch recently played tracks from Spotify
  // If we have existing data, only fetch tracks after the most recent one
  const afterTimestamp = mostRecentPlayedAt ? mostRecentPlayedAt.getTime() : undefined;
  const recentlyPlayed = await getAllRecentlyPlayed(accessToken, 1000, afterTimestamp);

  if (recentlyPlayed.length === 0) {
    console.log(`No new tracks found for user ${userId}`);
    // Get total count from summary if available
    const summary = await getUserDataSummary(userId);
    const totalTracks = summary?.total_tracks || 0;
    return { newTracksCount: 0, totalTracks };
  }

  // Convert to ProcessedListeningData
  const newTracks = recentlyPlayed.map(item =>
    convertSpotifyTrackToProcessed(item.track, item.playedAt)
  );

  // For deduplication, we need to check against all existing data
  // But to avoid fetching everything, we'll use a database query to check for duplicates
  // For now, let's fetch a sample of recent tracks for deduplication
  const recentExistingData = await getListeningData(userId, 1000);
  const uniqueNewTracks = filterNewTracks(newTracks, recentExistingData);

  if (uniqueNewTracks.length === 0) {
    console.log(`No new unique tracks found for user ${userId}`);
    const summary = await getUserDataSummary(userId);
    const totalTracks = summary?.total_tracks || 0;
    return { newTracksCount: 0, totalTracks };
  }

  console.log(`Found ${uniqueNewTracks.length} new tracks for user ${userId}`);

  // Store new tracks in Supabase
  await storeListeningData(userId, uniqueNewTracks);

  // Get all data for aggregations (this is necessary for accurate aggregations)
  const { getAllListeningData } = await import('@/lib/supabase/storage');
  const allData = await getAllListeningData(userId);

  // Update aggregations
  try {
    // Delete old aggregations
    await deleteUserAggregations(userId);

    // Compute new aggregations
    const dateFrequencyDay = aggregateByDate(allData, 'day');
    const dateFrequencyMonth = aggregateByDate(allData, 'month');
    const dateFrequencyYear = aggregateByDate(allData, 'year');
    const timePatterns = getTimePatterns(allData);
    const dayPatterns = getDayPatterns(allData);
    const topTracks = getTopTracks(allData, 50);
    const topArtists = getTopArtists(allData, 50);

    // Store aggregations
    await storeAllAggregations(userId, {
      dateFrequency: {
        day: dateFrequencyDay,
        month: dateFrequencyMonth,
        year: dateFrequencyYear,
      },
      timePattern: timePatterns,
      dayPattern: dayPatterns,
      topTracks: topTracks,
      topArtists: topArtists,
    });

    console.log(`Updated aggregations for user ${userId}`);
  } catch (error) {
    console.error(`Error updating aggregations for user ${userId}:`, error);
    // Don't fail the sync if aggregations fail
  }

  // Update user data summary
  const sortedByDate = [...allData].sort((a, b) => 
    a.playedAt.getTime() - b.playedAt.getTime()
  );
  
  const oldestDate = sortedByDate.length > 0 ? sortedByDate[0].playedAt : new Date();
  const newestDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].playedAt : new Date();
  
  const totalArtists = new Set(allData.map((d) => d.artistName)).size;
  const totalListeningTime = allData.reduce((sum, d) => sum + d.durationMs, 0);

  await storeUserDataSummary(userId, {
    totalTracks: allData.length,
    totalArtists: totalArtists,
    totalListeningTime: totalListeningTime,
    dateRangeStart: oldestDate,
    dateRangeEnd: newestDate,
  });

  console.log(`Successfully synced ${uniqueNewTracks.length} new tracks for user ${userId}`);

  return {
    newTracksCount: uniqueNewTracks.length,
    totalTracks: allData.length,
  };
}

