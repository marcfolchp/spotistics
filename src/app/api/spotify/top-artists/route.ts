import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken, handleSpotifyError } from '@/lib/api/middleware';
import { getTopArtists } from '@/lib/spotify/api';

/**
 * GET /api/spotify/top-artists
 * Get user's top artists
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
    const artists = await getTopArtists(authResult.token, timeRange, limit);
    return NextResponse.json(artists);
  } catch (error: any) {
    return handleSpotifyError(error);
  }
}

