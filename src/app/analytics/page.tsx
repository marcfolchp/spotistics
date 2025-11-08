'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TimePatternChart } from '@/components/charts/TimePatternChart';
import { DayPatternChart } from '@/components/charts/DayPatternChart';
import { StatsCards } from '@/components/dashboard/StatsCards';
import type { TimePattern, DayPattern, TopTrack, TopArtist, ListeningStats } from '@/types';

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

function AnalyticsContent() {
  const router = useRouter();
  const [timePatterns, setTimePatterns] = useState<TimePattern[]>([]);
  const [dayPatterns, setDayPatterns] = useState<DayPattern[]>([]);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFullData() {
      try {
        const response = await fetch('/api/analytics/data', {
          credentials: 'include',
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.summary && result.totalCount > 0) {
            // Set all aggregated data
            setSummary(result.summary);
            setTimePatterns(result.timePatterns || []);
            setDayPatterns(result.dayPatterns || []);
            setTopTracks(result.topTracks || []);
            setTopArtists(result.topArtists || []);
          } else {
            setError('No data found. Please upload your Spotify data export first.');
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load data' }));
          setError(errorData.error || 'Failed to load data. Please try uploading again.');
        }
      } catch (err) {
        console.error('Error loading full data:', err);
        if (isMounted) {
          setError('Failed to load data. Please try uploading again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    async function loadData() {
      try {
        setIsLoading(true);
        
        // First, load summary for quick initial display
        const summaryResponse = await fetch('/api/analytics/data?summary=true', {
          credentials: 'include',
        });
        
        if (!isMounted) return;
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          
          // If we have summary, show it immediately and load full data in background
          if (summaryData.summary && summaryData.totalCount > 0) {
            // Load full data in background
            loadFullData();
          } else {
            setError('No data found. Please upload your Spotify data export first.');
            setIsLoading(false);
            return;
          }
        } else {
          // Try loading full data directly
          loadFullData();
        }
      } catch (err) {
        console.error('Error loading data:', err);
        if (isMounted) {
          setError('Failed to load data. Please try uploading again.');
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []); // Load data once on mount

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <nav className="border-b border-[#2A2A2A] bg-[#000000]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white sm:text-sm"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <h1 className="text-lg font-bold text-white sm:text-xl">Spotistics</h1>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 animate-spin text-[#1DB954]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="mt-4 text-sm text-[#B3B3B3]">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <nav className="border-b border-[#2A2A2A] bg-[#000000]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white sm:text-sm"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <h1 className="text-lg font-bold text-white sm:text-xl">Spotistics</h1>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => router.push('/upload')}
              className="mt-4 rounded-full bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-[#1ed760] active:scale-95"
            >
              Upload Data
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <nav className="border-b border-[#2A2A2A] bg-[#000000]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white sm:text-sm"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <h1 className="text-lg font-bold text-white sm:text-xl">Spotistics</h1>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-[#181818] p-6">
            <p className="text-[#B3B3B3]">No data available. Please upload your Spotify data export.</p>
            <button
              onClick={() => router.push('/upload')}
              className="mt-4 rounded-full bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-[#1ed760] active:scale-95"
            >
              Upload Data
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Show message if aggregations are missing but data exists
  const hasAggregations = timePatterns.length > 0 || dayPatterns.length > 0;

  // Calculate statistics from summary
  const stats: ListeningStats = {
    totalTracks: summary.total_tracks || 0,
    totalArtists: summary.total_artists || 0,
    totalListeningTime: summary.total_listening_time_ms || 0,
    dateRange: {
      start: new Date(summary.date_range_start),
      end: new Date(summary.date_range_end),
    },
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <nav className="border-b border-[#2A2A2A] bg-[#000000]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white sm:text-sm"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-white sm:text-xl">Spotistics</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Analytics</h2>
            <p className="mt-2 text-sm text-[#B3B3B3] sm:text-base">
              Detailed insights from your Spotify listening history
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Warning if aggregations are missing */}
          {!hasAggregations && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-900/20 p-4">
              <p className="text-sm text-yellow-400">
                <strong>Note:</strong> Charts are not available yet. The aggregations table needs to be created in Supabase. 
                Please create the <code className="rounded bg-yellow-900/40 px-1 py-0.5">listening_aggregations</code> table 
                (see <code className="rounded bg-yellow-900/40 px-1 py-0.5">docs/supabase-setup.md</code>) and re-upload your data.
              </p>
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <TimePatternChart data={timePatterns} />
            <DayPatternChart data={dayPatterns} />
          </div>
        </div>
      </main>
    </div>
  );
}

