/**
 * Calculate relatability score (0-100) based on genre similarity
 * Uses cosine similarity to compare genre distributions
 */
export function calculateRelatabilityScore(
  user1Genres: Map<string, number>,
  user2Genres: Map<string, number>
): number {
  if (user1Genres.size === 0 || user2Genres.size === 0) {
    return 0;
  }

  // Get all unique genres from both users
  const allGenres = new Set([
    ...Array.from(user1Genres.keys()),
    ...Array.from(user2Genres.keys()),
  ]);

  if (allGenres.size === 0) {
    return 0;
  }

  // Create vectors for cosine similarity
  const vector1: number[] = [];
  const vector2: number[] = [];

  // Normalize by total weight for each user
  const total1 = Array.from(user1Genres.values()).reduce((sum, val) => sum + val, 0);
  const total2 = Array.from(user2Genres.values()).reduce((sum, val) => sum + val, 0);

  if (total1 === 0 || total2 === 0) {
    return 0;
  }

  for (const genre of allGenres) {
    const weight1 = (user1Genres.get(genre) || 0) / total1;
    const weight2 = (user2Genres.get(genre) || 0) / total2;
    vector1.push(weight1);
    vector2.push(weight2);
  }

  // Calculate cosine similarity
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  const similarity = dotProduct / (magnitude1 * magnitude2);

  // Convert to 0-100 score
  return Math.round(similarity * 100);
}

/**
 * Get genre distribution from top artists
 * Returns a map of genre -> weighted count
 * Uses parallel requests for better performance
 */
export async function getGenreDistribution(
  topArtists: Array<{ artistName: string; playCount: number }>,
  accessToken: string
): Promise<Map<string, number>> {
  const genreMap = new Map<string, number>();

  // Search for all top artists in parallel (much faster!)
  const genrePromises = topArtists.slice(0, 10).map(async (artist) => { // Limit to top 10 for performance
    try {
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist.artistName)}&type=artist&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const spotifyArtist = searchData.artists?.items?.[0];

        if (spotifyArtist?.genres && spotifyArtist.genres.length > 0) {
          return {
            genres: spotifyArtist.genres,
            playCount: artist.playCount,
          };
        }
      }
    } catch (error) {
      // Continue if search fails
      console.error(`Error searching for artist ${artist.artistName}:`, error);
    }
    return null;
  });

  // Wait for all searches in parallel
  const results = await Promise.all(genrePromises);

  // Aggregate genres
  results.forEach((result) => {
    if (result) {
      result.genres.forEach((genre: string) => {
        const normalizedGenre = genre.toLowerCase().trim();
        // Weight by artist play count
        const weight = result.playCount;
        genreMap.set(normalizedGenre, (genreMap.get(normalizedGenre) || 0) + weight);
      });
    }
  });

  return genreMap;
}

