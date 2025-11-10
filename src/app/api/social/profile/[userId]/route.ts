import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTopArtistsOptimized, getTopTracksOptimized } from '@/lib/supabase/aggregations';
import { getListeningDataByDateRange, getListeningData } from '@/lib/supabase/storage';
import { getUserProfile, getFriendRequest, areFriends } from '@/lib/supabase/social';
import { getUserProfile as getSpotifyUserProfile } from '@/lib/spotify/api';
import { calculateRelatabilityScore, getGenreDistribution } from '@/lib/utils/relatability';
import { getAggregation } from '@/lib/supabase/aggregations-storage';
import type { AggregatedTopArtist, AggregatedTopTrack } from '@/types';

/**
 * GET /api/social/profile/[userId]
 * Get user profile stats (favorite artist, song, genre, minutes last month)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get current user's Spotify profile to get their user ID
    const currentUserSpotify = await getSpotifyUserProfile(accessToken);
    const currentUserId = currentUserSpotify.id;

    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate date range for this month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch data for this month
    const thisMonthData = await getListeningDataByDateRange(userId, thisMonthStart, thisMonthEnd);

    // Calculate minutes listened this month
    const totalMinutes = Math.floor(
      thisMonthData.reduce((sum, d) => sum + d.durationMs, 0) / 60000
    );

    // Get top artist and track from aggregated data (much faster!)
    const [topArtistsAgg, topTracksAgg] = await Promise.all([
      getAggregation<AggregatedTopArtist>(userId, 'top_artists'),
      getAggregation<AggregatedTopTrack>(userId, 'top_tracks'),
    ]);

    // Fallback to optimized functions if aggregations not available
    const [topArtists, topTracks] = await Promise.all([
      topArtistsAgg && topArtistsAgg.length > 0
        ? topArtistsAgg
        : await getTopArtistsOptimized(userId, 1),
      topTracksAgg && topTracksAgg.length > 0
        ? topTracksAgg
        : await getTopTracksOptimized(userId, 1),
    ]);

    const favoriteArtist = topArtists[0]?.artistName || 'Unknown';
    const favoriteTrackName = topTracks[0]?.trackName || 'Unknown';
    const favoriteTrackArtist = topTracks[0]?.artistName || 'Unknown';
    const favoriteTrack = favoriteTrackName !== 'Unknown' 
      ? `${favoriteTrackName} by ${favoriteTrackArtist}`
      : 'Unknown';

    // Fetch images for favorite artist and track from Spotify API (parallel)
    let favoriteArtistImage: string | null = null;
    let favoriteTrackImage: string | null = null;

    try {
      const imagePromises: Promise<void>[] = [];

      // Search for favorite artist
      if (favoriteArtist !== 'Unknown') {
        imagePromises.push(
          fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(favoriteArtist)}&type=artist&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )
            .then(async (response) => {
              if (response.ok) {
                const data = await response.json();
                const spotifyArtist = data.artists?.items?.[0];
                if (spotifyArtist?.images && spotifyArtist.images.length > 0) {
                  favoriteArtistImage = spotifyArtist.images[spotifyArtist.images.length - 1]?.url || null;
                }
              }
            })
            .catch((error) => {
              console.error('Error fetching artist image:', error);
            })
        );
      }

      // Search for favorite track
      if (favoriteTrackName !== 'Unknown' && favoriteTrackArtist !== 'Unknown') {
        imagePromises.push(
          fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${favoriteTrackName} ${favoriteTrackArtist}`)}&type=track&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )
            .then(async (response) => {
              if (response.ok) {
                const data = await response.json();
                const spotifyTrack = data.tracks?.items?.[0];
                if (spotifyTrack?.album?.images && spotifyTrack.album.images.length > 0) {
                  favoriteTrackImage = spotifyTrack.album.images[spotifyTrack.album.images.length - 1]?.url || null;
                }
              }
            })
            .catch((error) => {
              console.error('Error fetching track image:', error);
            })
        );
      }

      // Wait for all image fetches in parallel
      await Promise.all(imagePromises);
    } catch (error) {
      console.error('Error fetching images from Spotify:', error);
      // Continue without images if search fails
    }

    // Get top genre from profile user's listening data (use aggregated data!)
    let favoriteGenre = 'Unknown';
    try {
      // Use aggregated top artists (much faster!)
      const topArtistsForGenre = topArtistsAgg && topArtistsAgg.length > 0
        ? topArtistsAgg.slice(0, 5) // Only need top 5 for genre
        : (await getTopArtistsOptimized(userId, 5)).slice(0, 5);
      
      if (topArtistsForGenre.length > 0) {
        // Try to get genres from Spotify API by searching for artists (parallel!)
        const genreMap = new Map<string, number>();
        
        // Search for all top artists in parallel
        const genrePromises = topArtistsForGenre.map(async (artist) => {
          try {
            const searchResponse = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist.artistName)}&type=artist&limit=1`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
            
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              const spotifyArtist = searchData.artists?.items?.[0];
              
              if (spotifyArtist?.genres && spotifyArtist.genres.length > 0) {
                spotifyArtist.genres.forEach((genre: string) => {
                  const normalizedGenre = genre.toLowerCase().trim();
                  // Weight by artist play count
                  const weight = artist.playCount;
                  genreMap.set(normalizedGenre, (genreMap.get(normalizedGenre) || 0) + weight);
                });
              }
            }
          } catch (error) {
            // Continue if search fails
            console.error(`Error searching for artist ${artist.artistName}:`, error);
          }
        });

        // Wait for all genre searches in parallel
        await Promise.all(genrePromises);

        // Get the most common genre
        if (genreMap.size > 0) {
          const sortedGenres = Array.from(genreMap.entries())
            .sort((a, b) => b[1] - a[1]);
          favoriteGenre = sortedGenres[0][0];
          // Capitalize first letter of each word
          favoriteGenre = favoriteGenre
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          // Fallback: use top artist name
          favoriteGenre = favoriteArtist;
        }
      } else {
        favoriteGenre = favoriteArtist;
      }
    } catch (error) {
      console.error('Error calculating favorite genre:', error);
      // Fallback: use top artist name
      favoriteGenre = favoriteArtist;
    }

    // Calculate relatability KPI (compare genres for the year) - use aggregated data!
    // Run this in parallel with other operations to speed up overall response
    const relatabilityPromise = (async () => {
      try {
        // Get aggregated top artists for both users (much faster than fetching all data!)
        const [currentUserTopArtistsAgg, profileUserTopArtistsAgg] = await Promise.all([
          getAggregation<AggregatedTopArtist>(currentUserId, 'top_artists'),
          getAggregation<AggregatedTopArtist>(userId, 'top_artists'),
        ]);

        // Fallback to optimized functions if aggregations not available
        const [currentUserTopArtists, profileUserTopArtists] = await Promise.all([
          currentUserTopArtistsAgg && currentUserTopArtistsAgg.length > 0
            ? currentUserTopArtistsAgg.slice(0, 10).map(a => ({ artistName: a.artistName, playCount: a.playCount }))
            : (await getTopArtistsOptimized(currentUserId, 10)).map(a => ({ artistName: a.artistName, playCount: a.playCount })),
          profileUserTopArtistsAgg && profileUserTopArtistsAgg.length > 0
            ? profileUserTopArtistsAgg.slice(0, 10).map(a => ({ artistName: a.artistName, playCount: a.playCount }))
            : (await getTopArtistsOptimized(userId, 10)).map(a => ({ artistName: a.artistName, playCount: a.playCount })),
        ]);

        // Get genre distributions for both users (parallel)
        const [currentUserGenres, profileUserGenres] = await Promise.all([
          getGenreDistribution(currentUserTopArtists, accessToken),
          getGenreDistribution(profileUserTopArtists, accessToken),
        ]);

        // Calculate relatability score
        return calculateRelatabilityScore(currentUserGenres, profileUserGenres);
      } catch (error) {
        console.error('Error calculating relatability score:', error);
        return 0;
      }
    })();

    // Wait for relatability score calculation
    const relatabilityScore = await relatabilityPromise;

    // Get last listened track
    let lastTrack: { trackName: string; artistName: string; playedAt: string; imageUrl: string | null } | null = null;
    try {
      const recentTracks = await getListeningData(userId, 1);
      if (recentTracks.length > 0) {
        const mostRecent = recentTracks[0];
        let trackImage: string | null = null;

        // Search for track image from Spotify API
        try {
          const trackSearchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${mostRecent.trackName} ${mostRecent.artistName}`)}&type=track&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (trackSearchResponse.ok) {
            const trackSearchData = await trackSearchResponse.json();
            const spotifyTrack = trackSearchData.tracks?.items?.[0];
            if (spotifyTrack?.album?.images && spotifyTrack.album.images.length > 0) {
              // Use the smallest image (most appropriate for display)
              trackImage = spotifyTrack.album.images[spotifyTrack.album.images.length - 1]?.url || null;
            }
          }
        } catch (error) {
          console.error('Error fetching last track image:', error);
          // Continue without image if search fails
        }

        lastTrack = {
          trackName: mostRecent.trackName,
          artistName: mostRecent.artistName,
          playedAt: mostRecent.playedAt.toISOString(),
          imageUrl: trackImage,
        };
      }
    } catch (error) {
      console.error('Error fetching last track:', error);
      // Continue without last track if fetch fails
    }

    // Check friend status
    let friendStatus: 'none' | 'pending' | 'accepted' | 'received' = 'none';
    let friendRequestId: string | null = null;

    try {
      // Check if they are already friends
      const isFriend = await areFriends(currentUserId, userId);
      if (isFriend) {
        friendStatus = 'accepted';
      } else {
        // Check for pending friend request
        const friendRequest = await getFriendRequest(currentUserId, userId);
        if (friendRequest) {
          if (friendRequest.status === 'pending') {
            if (friendRequest.from_user_id === currentUserId) {
              friendStatus = 'pending';
              friendRequestId = friendRequest.id;
            } else {
              friendStatus = 'received';
              friendRequestId = friendRequest.id;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking friend status:', error);
      // Default to 'none' if check fails
    }

    return NextResponse.json({
      user: userProfile,
      stats: {
        favoriteArtist,
        favoriteTrack,
        favoriteGenre,
        minutesThisMonth: totalMinutes,
        relatabilityScore,
        favoriteArtistImage,
        favoriteTrackImage,
      },
      lastTrack,
      friendStatus,
      friendRequestId,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

