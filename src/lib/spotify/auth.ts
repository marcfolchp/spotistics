import SpotifyWebApi from 'spotify-web-api-node';

const scopes = [
  'user-read-private',
  'user-read-email',
  'user-read-recently-played',
  'user-top-read',
  'user-read-playback-position',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
];

/**
 * Generate Spotify authorization URL
 * @param redirectUri - The redirect URI for OAuth callback
 * @param clientId - Spotify client ID
 * @param promptSelectAccount - If true, forces account selection screen (default: true)
 */
export function getAuthorizationUrl(redirectUri: string, clientId: string, promptSelectAccount: boolean = true): string {
  const spotifyApi = new SpotifyWebApi({
    clientId,
    redirectUri,
  });

  let authUrl = spotifyApi.createAuthorizeURL(scopes, 'state');
  
  // Add prompt=select_account to force account selection
  // This allows users to switch accounts even if they're already logged in to Spotify
  if (promptSelectAccount) {
    const url = new URL(authUrl);
    url.searchParams.set('prompt', 'select_account');
    authUrl = url.toString();
  }

  return authUrl;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const spotifyApi = new SpotifyWebApi({
    clientId,
    clientSecret,
    redirectUri,
  });

  const data = await spotifyApi.authorizationCodeGrant(code);
  const { access_token, refresh_token, expires_in } = data.body;

  return {
    accessToken: access_token,
    refreshToken: refresh_token || '',
    expiresIn: expires_in,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const spotifyApi = new SpotifyWebApi({
    clientId,
    clientSecret,
  });

  spotifyApi.setRefreshToken(refreshToken);
  const data = await spotifyApi.refreshAccessToken();
  const { access_token, expires_in } = data.body;

  return {
    accessToken: access_token,
    expiresIn: expires_in,
  };
}

