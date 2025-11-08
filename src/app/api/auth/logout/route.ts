import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/logout
 * Logout user and clear session
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Get user ID before deleting cookies
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  let userId: string | null = null;

  if (accessToken) {
    try {
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        userId = profile.id;
      }
    } catch (error) {
      console.error('Error fetching user profile for logout:', error);
    }
  }

  // Delete refresh token from Supabase
  if (userId) {
    try {
      const { deleteUserRefreshToken } = await import('@/lib/supabase/tokens');
      await deleteUserRefreshToken(userId);
      console.log(`Deleted refresh token for user ${userId}`);
    } catch (error) {
      console.error('Error deleting refresh token from Supabase:', error);
      // Don't fail logout if deleting token fails
    }
  }

  // Clear Spotify tokens
  cookieStore.delete('spotify_access_token');
  cookieStore.delete('spotify_refresh_token');

  return NextResponse.json({ success: true });
}

