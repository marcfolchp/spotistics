import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/session
 * Check if user is authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token');

    // Debug: Log all cookies
    const allCookies = cookieStore.getAll();
    console.log('All cookies:', allCookies.map(c => c.name));

    if (!accessToken || !accessToken.value) {
      console.log('No access token found in cookies');
      console.log('Request URL:', request.url);
      console.log('Request headers:', Object.fromEntries(request.headers.entries()));
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    console.log('Access token found, user is authenticated');
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

