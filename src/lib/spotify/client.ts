import SpotifyWebApi from 'spotify-web-api-node';

let spotifyApi: SpotifyWebApi | null = null;

/**
 * Initialize Spotify API client with access token
 */
export function initializeSpotifyClient(accessToken: string): SpotifyWebApi {
  spotifyApi = new SpotifyWebApi({
    accessToken,
  });
  return spotifyApi;
}

/**
 * Get the current Spotify API client instance
 */
export function getSpotifyClient(): SpotifyWebApi {
  if (!spotifyApi) {
    throw new Error('Spotify client not initialized. Call initializeSpotifyClient first.');
  }
  return spotifyApi;
}

/**
 * Create a new Spotify API client instance
 */
export function createSpotifyClient(accessToken: string): SpotifyWebApi {
  return new SpotifyWebApi({
    accessToken,
  });
}

