import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken } from '@/lib/api/middleware';
import { getListeningDataByDateRange } from '@/lib/supabase/storage';
import { getTopTracks, getTopArtists } from '@/lib/data-processing/aggregate';
import type { AggregatedTopTrack, AggregatedTopArtist } from '@/types';

/**
 * GET /api/story/monthly-summary
 * Get monthly summary data for Instagram story generation
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

    // Calculate current month date range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch data for current month
    const monthData = await getListeningDataByDateRange(userId, monthStart, monthEnd);

    if (monthData.length === 0) {
      return NextResponse.json({
        error: 'No data available for this month',
      }, { status: 404 });
    }

    // Calculate summary stats
    const totalTracks = monthData.length;
    const totalArtists = new Set(monthData.map((d) => d.artistName)).size;
    const totalListeningTime = monthData.reduce((sum, d) => sum + d.durationMs, 0);
    const totalMinutes = Math.floor(totalListeningTime / 60000);
    const totalHours = Math.floor(totalMinutes / 60);

    // Get top tracks and artists
    const topTracks = getTopTracks(monthData, 5);
    const topArtists = getTopArtists(monthData, 5);

    // Fetch images for top track and artist from Spotify API
    let topTrackImage: string | null = null;
    let topArtistImage: string | null = null;

    try {
      // Fetch top track image
      if (topTracks.length > 0) {
        const trackSearch = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${topTracks[0].trackName} ${topTracks[0].artistName}`)}&type=track&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${authResult.token}`,
            },
          }
        );

        if (trackSearch.ok) {
          const trackData = await trackSearch.json();
          const spotifyTrack = trackData.tracks?.items?.[0];
          if (spotifyTrack?.album?.images && spotifyTrack.album.images.length > 0) {
            // Use medium-sized image (usually index 1)
            topTrackImage = spotifyTrack.album.images[1]?.url || spotifyTrack.album.images[0]?.url || null;
          }
        }
      }

      // Fetch top artist image
      if (topArtists.length > 0) {
        const artistSearch = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(topArtists[0].artistName)}&type=artist&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${authResult.token}`,
            },
          }
        );

        if (artistSearch.ok) {
          const artistData = await artistSearch.json();
          const spotifyArtist = artistData.artists?.items?.[0];
          if (spotifyArtist?.images && spotifyArtist.images.length > 0) {
            // Use medium-sized image (usually index 1)
            topArtistImage = spotifyArtist.images[1]?.url || spotifyArtist.images[0]?.url || null;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching images from Spotify:', error);
      // Continue without images if search fails
    }

    // Format month name
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthNumber = now.getMonth() + 1; // 1-12 for January-December

    return NextResponse.json({
      month: monthName,
      monthNumber,
      totalTracks,
      totalArtists,
      totalMinutes,
      totalHours,
      topTracks,
      topArtists,
      topTrackImage,
      topArtistImage,
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly summary' },
      { status: 500 }
    );
  }
}

