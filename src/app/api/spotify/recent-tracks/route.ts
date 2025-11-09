import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken, handleSpotifyError } from '@/lib/api/middleware';
import { getRecentlyPlayedWithTimestamps } from '@/lib/spotify/api';

/**
 * GET /api/spotify/recent-tracks
 * Get user's recently played tracks with timestamps
 * Returns fresh data from Spotify API (no caching)
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedToken();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const searchParams = request.nextUrl.searchParams;
  // Increase default limit to 100 to catch more recent tracks
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  try {
    console.log(`[Recent Tracks API] Fetching ${limit} recently played tracks...`);
    const tracksWithTimestamps = await getRecentlyPlayedWithTimestamps(authResult.token, limit);
    console.log(`[Recent Tracks API] Fetched ${tracksWithTimestamps.length} tracks`);
    
    // Return tracks with timestamps as ISO strings for JSON serialization
    const tracks = tracksWithTimestamps.map(({ track, playedAt }) => ({
      ...track,
      playedAt: playedAt.toISOString(),
    }));
    
    // Return with no-cache headers to ensure fresh data
    const response = NextResponse.json(tracks);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    return handleSpotifyError(error);
  }
}

