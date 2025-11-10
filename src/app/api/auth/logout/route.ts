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
  cookieStore.delete('spotify_export_summary');

  // Create response and set cookies to expire (to ensure they're cleared)
  const response = NextResponse.json({ success: true });
  
  // Explicitly set cookies to expire in the past to ensure they're cleared
  response.cookies.set('spotify_access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
  
  response.cookies.set('spotify_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
  
  response.cookies.set('spotify_export_summary', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });

  return response;
}

