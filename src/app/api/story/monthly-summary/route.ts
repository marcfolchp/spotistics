import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken } from '@/lib/api/middleware';
import { getListeningDataByDateRange } from '@/lib/supabase/storage';
import { getTopTracks, getTopArtists } from '@/lib/data-processing/aggregate';
import { getTopArtists as getSpotifyTopArtists, getTopTracks as getSpotifyTopTracks } from '@/lib/spotify/api';
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

    // Get top tracks and artists from uploaded data (fallback)
    const topTracksFromData = getTopTracks(monthData, 5);
    const topArtistsFromData = getTopArtists(monthData, 5);

    // Try to get top artist and track from Spotify API (last 4 weeks - short_term)
    // This ensures we get single, clean artist names instead of comma-separated ones
    let topTrack: AggregatedTopTrack | null = null;
    let topArtist: AggregatedTopArtist | null = null;
    let topTrackImage: string | null = null;
    let topArtistImage: string | null = null;

    try {
      // Fetch top artists from Spotify API (last 4 weeks)
      const spotifyTopArtists = await getSpotifyTopArtists(authResult.token, 'short_term', 10);
      if (spotifyTopArtists && spotifyTopArtists.length > 0) {
        const spotifyArtist = spotifyTopArtists[0];
        // Use Spotify's top artist (single, clean name)
        topArtist = {
          artistName: spotifyArtist.name,
          playCount: 0, // We don't have play count from Spotify API
          totalDuration: 0,
        };
        // Get artist image
        if (spotifyArtist.images && spotifyArtist.images.length > 0) {
          topArtistImage = spotifyArtist.images[1]?.url || spotifyArtist.images[0]?.url || null;
        }
      }

      // Fetch top tracks from Spotify API (last 4 weeks)
      const spotifyTopTracks = await getSpotifyTopTracks(authResult.token, 'short_term', 10);
      if (spotifyTopTracks && spotifyTopTracks.length > 0) {
        const spotifyTrack = spotifyTopTracks[0];
        // Use Spotify's top track (single, clean name)
        // Get the primary artist (first artist in the artists array)
        const primaryArtist = spotifyTrack.artists && spotifyTrack.artists.length > 0 
          ? spotifyTrack.artists[0].name 
          : 'Unknown Artist';
        
        topTrack = {
          trackName: spotifyTrack.name,
          artistName: primaryArtist,
          playCount: 0, // We don't have play count from Spotify API
          totalDuration: 0,
        };
        // Get track image
        if (spotifyTrack.album?.images && spotifyTrack.album.images.length > 0) {
          topTrackImage = spotifyTrack.album.images[1]?.url || spotifyTrack.album.images[0]?.url || null;
        }
      }
    } catch (error) {
      console.error('Error fetching top artists/tracks from Spotify API:', error);
      // Fall back to data-based calculation if Spotify API fails
    }

    // Fallback to data-based top track/artist if Spotify API didn't work
    if (!topTrack && topTracksFromData.length > 0) {
      topTrack = topTracksFromData[0];
      // Try to fetch image for fallback track
      try {
        const trackSearch = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${topTrack.trackName} ${topTrack.artistName}`)}&type=track&limit=1`,
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
            topTrackImage = spotifyTrack.album.images[1]?.url || spotifyTrack.album.images[0]?.url || null;
          }
        }
      } catch (err) {
        console.error('Error fetching fallback track image:', err);
      }
    }

    if (!topArtist && topArtistsFromData.length > 0) {
      // For fallback, try to extract single artist name if it's comma-separated
      const artistName = topArtistsFromData[0].artistName;
      // If artist name contains comma, take the first one
      const singleArtistName = artistName.includes(',') 
        ? artistName.split(',')[0].trim() 
        : artistName;
      
      topArtist = {
        artistName: singleArtistName,
        playCount: topArtistsFromData[0].playCount,
        totalDuration: topArtistsFromData[0].totalDuration,
      };
      // Try to fetch image for fallback artist
      try {
        const artistSearch = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(singleArtistName)}&type=artist&limit=1`,
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
            topArtistImage = spotifyArtist.images[1]?.url || spotifyArtist.images[0]?.url || null;
          }
        }
      } catch (err) {
        console.error('Error fetching fallback artist image:', err);
      }
    }

    // Ensure we have at least one track and artist
    const finalTopTracks = topTrack ? [topTrack, ...topTracksFromData.slice(1)] : topTracksFromData;
    const finalTopArtists = topArtist ? [topArtist, ...topArtistsFromData.slice(1)] : topArtistsFromData;

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
      topTracks: finalTopTracks,
      topArtists: finalTopArtists,
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

