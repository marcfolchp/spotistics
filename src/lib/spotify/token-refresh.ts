import { cookies } from 'next/headers';
import { refreshAccessToken } from './auth';

/**
 * Get access token, refreshing if necessary
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  if (!accessToken) {
    return null;
  }

  // TODO: Check if token is expired and refresh if needed
  // For now, return the access token
  // In production, you should check expiration and refresh automatically

  return accessToken;
}

/**
 * Refresh access token if expired
 */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  if (!refreshToken) {
    return null;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const { accessToken, expiresIn } = await refreshAccessToken(
      refreshToken,
      clientId,
      clientSecret
    );

    // Update cookie with new access token
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    cookieStore.set('spotify_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

