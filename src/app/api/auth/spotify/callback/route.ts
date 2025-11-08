import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/spotify/auth';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/spotify/callback
 * Handle Spotify OAuth2 callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code', request.url)
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/login?error=config', request.url)
    );
  }

  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(
      code,
      redirectUri,
      clientId,
      clientSecret
    );

    console.log('Token exchange successful');

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get the base URL from the request (use actual request origin, not redirect URI)
    const baseUrl = new URL(request.url);
    const origin = `${baseUrl.protocol}//${baseUrl.host}`;
    
    console.log('Request origin:', origin);
    console.log('Redirect URI:', redirectUri);
    console.log('Using request origin for redirect:', origin);

    // Set cookies with tokens
    const cookieStore = await cookies();
    
    // Create response with redirect using the actual request origin
    // This ensures production URLs work correctly
    const response = NextResponse.redirect(new URL('/dashboard', origin));
    
    // Set cookies on the response directly
    response.cookies.set('spotify_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    if (refreshToken) {
      response.cookies.set('spotify_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      });

      // Store refresh token in Supabase for background sync
      try {
        const { storeUserRefreshToken } = await import('@/lib/supabase/tokens');
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          await storeUserRefreshToken(profile.id, refreshToken);
          console.log(`Stored refresh token for user ${profile.id}`);
        }
      } catch (error) {
        console.error('Error storing refresh token in Supabase:', error);
        // Don't fail the login if storing token fails
      }
    }

    console.log('Cookies set on response, redirecting to dashboard');
    console.log('Redirect URL:', new URL('/dashboard', origin).toString());

    return response;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    const baseUrl = new URL(request.url);
    const origin = `${baseUrl.protocol}//${baseUrl.host}`;
    return NextResponse.redirect(
      new URL('/login?error=token_exchange_failed', origin)
    );
  }
}

