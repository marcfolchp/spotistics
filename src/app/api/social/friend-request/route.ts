import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingFriendRequests,
  getFriendRequest,
  cancelFriendRequest,
} from '@/lib/supabase/social';
import { createSupabaseServerClient } from '@/lib/supabase/client';

/**
 * POST /api/social/friend-request
 * Send a friend request
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
    const fromUserId = profile.id;

    const body = await request.json();
    const { toUserId } = body;

    if (!toUserId) {
      return NextResponse.json(
        { error: 'toUserId is required' },
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    const friendRequest = await sendFriendRequest(fromUserId, toUserId);

    return NextResponse.json({ friendRequest });
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send friend request' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/social/friend-request
 * Accept or reject a friend request
 */
export async function PATCH(request: NextRequest) {
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
    const { requestId, action } = body; // action: 'accept' | 'reject'

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'requestId and action are required' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      await acceptFriendRequest(requestId);
    } else if (action === 'reject') {
      await rejectFriendRequest(requestId);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating friend request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update friend request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/friend-request
 * Get pending friend requests for the authenticated user
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

    const requests = await getPendingFriendRequests(userId);

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error getting pending friend requests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get friend requests' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/friend-request
 * Cancel/retract a sent friend request
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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      );
    }

    // Get the friend request to verify ownership
    const supabase = createSupabaseServerClient();
    const { data: friendRequest, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !friendRequest) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      );
    }

    // Verify that the user sent this request
    if (friendRequest.from_user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only cancel requests you sent' },
        { status: 403 }
      );
    }

    await cancelFriendRequest(requestId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error canceling friend request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel friend request' },
      { status: 500 }
    );
  }
}

