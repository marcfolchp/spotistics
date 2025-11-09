'use client';

import { useState, useEffect, useRef } from 'react';
import type { SpotifyTrack, SpotifyTrackWithTimestamp, SpotifyArtist } from '@/types';

interface UseSpotifyDataOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch user's recently played tracks
 * Auto-refreshes every 30 seconds to show new tracks
 */
export function useRecentlyPlayed(options: UseSpotifyDataOptions = {}) {
  const { enabled = true } = options;
  const [tracks, setTracks] = useState<SpotifyTrackWithTimestamp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchTracks = async (isRefresh = false) => {
      // Prevent duplicate calls in development (React Strict Mode)
      const now = Date.now();
      if (fetchingRef.current || (now - lastFetchRef.current < 200 && !isRefresh)) {
        return;
      }

      fetchingRef.current = true;
      lastFetchRef.current = now;

      // Only show loading state on initial load, not on refreshes
      if (!isRefresh) {
        setIsLoading(true);
      }
      setError(null);
      
      try {
        // Fetch from Spotify API directly
        const response = await fetch('/api/spotify/recent-tracks?limit=50', {
          credentials: 'include',
          cache: 'no-store', // Prevent caching
        });
        
        if (response.ok) {
          const data = await response.json();
          // Convert ISO strings back to Date objects
          const tracksWithDates = data.map((track: any) => ({
            ...track,
            playedAt: new Date(track.playedAt),
          }));
          setTracks(tracksWithDates);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch recent tracks' }));
          setError(errorData.error || 'Failed to fetch recent tracks');
        }
      } catch (err) {
        setError('An error occurred while fetching recent tracks');
        console.error('Error fetching recent tracks:', err);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    // Fetch immediately
    fetchTracks(false);

    // Set up auto-refresh every 30 seconds (silent refresh, no loading state)
    const interval = setInterval(() => fetchTracks(true), 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [enabled]);

  return { tracks, isLoading, error };
}

/**
 * Hook to fetch user's top artists
 */
export function useTopArtists(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  options: UseSpotifyDataOptions = {}
) {
  const { enabled = true } = options;
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchArtists = async () => {
      // Prevent duplicate calls in development (React Strict Mode)
      const now = Date.now();
      if (fetchingRef.current || now - lastFetchRef.current < 200) {
        return;
      }

      fetchingRef.current = true;
      lastFetchRef.current = now;

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/spotify/top-artists?time_range=${timeRange}&limit=50`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setArtists(data);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch top artists' }));
          setError(errorData.error || 'Failed to fetch top artists');
        }
      } catch (err) {
        setError('An error occurred while fetching top artists');
        console.error('Error fetching top artists:', err);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchArtists();
  }, [enabled, timeRange]);

  return { artists, isLoading, error };
}

/**
 * Hook to fetch user's top tracks
 */
export function useTopTracks(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  options: UseSpotifyDataOptions = {}
) {
  const { enabled = true } = options;
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchTracks = async () => {
      // Prevent duplicate calls in development (React Strict Mode)
      const now = Date.now();
      if (fetchingRef.current || now - lastFetchRef.current < 200) {
        return;
      }

      fetchingRef.current = true;
      lastFetchRef.current = now;

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/spotify/top-tracks?time_range=${timeRange}&limit=50`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setTracks(data);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch top tracks' }));
          setError(errorData.error || 'Failed to fetch top tracks');
        }
      } catch (err) {
        setError('An error occurred while fetching top tracks');
        console.error('Error fetching top tracks:', err);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchTracks();
  }, [enabled, timeRange]);

  return { tracks, isLoading, error };
}

/**
 * Hook to fetch user's top genres
 * Aggregates genres from top artists
 */
export function useTopGenres(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  options: UseSpotifyDataOptions = {}
) {
  const { enabled = true } = options;
  const [genres, setGenres] = useState<Array<{ name: string; count: number; imageUrl?: string; artistName?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchGenres = async () => {
      // Prevent duplicate calls in development (React Strict Mode)
      const now = Date.now();
      if (fetchingRef.current || now - lastFetchRef.current < 200) {
        return;
      }

      fetchingRef.current = true;
      lastFetchRef.current = now;

      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch top artists to get their genres
        const response = await fetch(`/api/spotify/top-artists?time_range=${timeRange}&limit=50`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const artists: SpotifyArtist[] = await response.json();
          
          // Aggregate genres from all artists
          // For each genre, track the first (most popular) artist encountered
          const genreMap = new Map<string, { count: number; artist: SpotifyArtist }>();
          
          artists.forEach((artist) => {
            if (artist.genres && artist.genres.length > 0) {
              artist.genres.forEach((genre) => {
                const normalizedGenre = genre.toLowerCase().trim();
                const existing = genreMap.get(normalizedGenre);
                
                if (!existing) {
                  // First time seeing this genre, use this artist
                  genreMap.set(normalizedGenre, { count: 1, artist });
                } else {
                  // Increment count, but keep the first artist (they're already sorted by popularity)
                  genreMap.set(normalizedGenre, { count: existing.count + 1, artist: existing.artist });
                }
              });
            }
          });
          
          // Convert to array and sort by count
          const genreArray = Array.from(genreMap.entries())
            .map(([name, { count, artist }]) => {
              // Get the smallest image (most appropriate for display)
              const imageUrl = artist.images && artist.images.length > 0
                ? artist.images[artist.images.length - 1]?.url // Last image is usually smallest
                : undefined;
              
              return {
                name,
                count,
                imageUrl,
                artistName: artist.name,
              };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // Top 20 genres
          
          setGenres(genreArray);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch top genres' }));
          setError(errorData.error || 'Failed to fetch top genres');
        }
      } catch (err) {
        setError('An error occurred while fetching top genres');
        console.error('Error fetching top genres:', err);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchGenres();
  }, [enabled, timeRange]);

  return { genres, isLoading, error };
}

