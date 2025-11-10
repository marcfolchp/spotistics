import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getFriends, areFriends, removeFriend } from '@/lib/supabase/social';

/**
 * GET /api/social/friends
 * Get all friends for the authenticated user
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

    const friends = await getFriends(userId);

    return NextResponse.json({ friends });
  } catch (error: any) {
    console.error('Error getting friends:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get friends' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/friends/check
 * Check if two users are friends
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json(
        { error: 'friendId is required' },
        { status: 400 }
      );
    }

    const isFriend = await areFriends(userId, friendId);

    return NextResponse.json({ areFriends: isFriend });
  } catch (error: any) {
    console.error('Error checking friendship:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check friendship' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/friends
 * Remove a friend
 */
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json(
        { error: 'friendId is required' },
        { status: 400 }
      );
    }

    if (userId === friendId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself as a friend' },
        { status: 400 }
      );
    }

    await removeFriend(userId, friendId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing friend:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove friend' },
      { status: 500 }
    );
  }
}

