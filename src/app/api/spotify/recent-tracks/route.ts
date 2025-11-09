import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken, handleSpotifyError } from '@/lib/api/middleware';
import { getRecentlyPlayedWithTimestamps } from '@/lib/spotify/api';

/**
 * GET /api/spotify/recent-tracks
 * Get user's recently played tracks with timestamps
 * Fetches directly from Spotify API
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedToken();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const tracksWithTimestamps = await getRecentlyPlayedWithTimestamps(authResult.token, limit);
    
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

