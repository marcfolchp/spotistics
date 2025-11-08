import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken, handleSpotifyError } from '@/lib/api/middleware';
import { getTopTracks } from '@/lib/spotify/api';

/**
 * GET /api/spotify/top-tracks
 * Get user's top tracks
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedToken();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const searchParams = request.nextUrl.searchParams;
  const timeRange = (searchParams.get('time_range') || 'medium_term') as 'short_term' | 'medium_term' | 'long_term';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const tracks = await getTopTracks(authResult.token, timeRange, limit);
    return NextResponse.json(tracks);
  } catch (error: any) {
    return handleSpotifyError(error);
  }
}

