import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSentFriendRequests } from '@/lib/supabase/social';

/**
 * GET /api/social/friend-request/sent
 * Get sent friend requests for the authenticated user
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

    const requests = await getSentFriendRequests(userId);

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error getting sent friend requests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sent friend requests' },
      { status: 500 }
    );
  }
}

