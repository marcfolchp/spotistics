import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { searchUsers, getPublicUsers } from '@/lib/supabase/social';

/**
 * GET /api/social/search
 * Search for users by display name
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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    console.log(`[Search API] Searching for: "${query}"`);

    let users;
    if (query.trim()) {
      users = await searchUsers(query.trim(), limit);
      console.log(`[Search API] Found ${users.length} users`);
    } else {
      // If no query, return public users for discovery
      users = await getPublicUsers(limit);
      console.log(`[Search API] Returning ${users.length} public users`);
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search users' },
      { status: 500 }
    );
  }
}

