'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!enabled) return;

    const fetchTracks = async (isRefresh = false) => {
      // Only show loading state on initial load, not on refreshes
      if (!isRefresh) {
        setIsLoading(true);
      }
      setError(null);
      
      try {
        // Add cache-busting timestamp to ensure fresh data
        const response = await fetch(`/api/spotify/recent-tracks?limit=50&_=${Date.now()}`, {
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

  useEffect(() => {
    if (!enabled) return;

    const fetchArtists = async () => {
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

  useEffect(() => {
    if (!enabled) return;

    const fetchTracks = async () => {
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
      }
    };

    fetchTracks();
  }, [enabled, timeRange]);

  return { tracks, isLoading, error };
}

