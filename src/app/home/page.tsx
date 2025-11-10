'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSession } from '@/contexts/SessionContext';
import { MobileNav } from '@/components/navigation/MobileNav';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useTopTracks, useTopArtists, useRecentlyPlayed } from '@/hooks/useSpotifyData';
import type { SpotifyUser } from '@/types';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

function HomeContent() {
  const router = useRouter();
  const { logout } = useSession();
  const [profile, setProfile] = useState<SpotifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  // Fetch top track (4 weeks = short_term)
  const { tracks: topTracks, isLoading: isLoadingTracks } = useTopTracks('short_term');
  // Fetch top artist (4 weeks = short_term)
  const { artists: topArtists, isLoading: isLoadingArtists } = useTopArtists('short_term');
  // Fetch recently played
  const { tracks: recentTracks, isLoading: isLoadingRecent } = useRecentlyPlayed();

  useEffect(() => {
    async function fetchProfile() {
      // Prevent duplicate calls in development (React Strict Mode)
      const now = Date.now();
      if (fetchingRef.current || now - lastFetchRef.current < 200) {
        return;
      }

      fetchingRef.current = true;
      lastFetchRef.current = now;

      try {
        const response = await fetch('/api/spotify/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    }

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const topTrack = topTracks.length > 0 ? topTracks[0] : null;
  const topArtist = topArtists.length > 0 ? topArtists[0] : null;
  const recentTrack = recentTracks.length > 0 ? recentTracks[0] : null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#121212]">
      <nav className="border-b border-[#2A2A2A] bg-[#000000]">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954] sm:h-8 sm:w-8">
                <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
              <h1 className="text-base font-bold text-white sm:text-xl">
                Spotistics
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {profile && (
                <div className="hidden items-center gap-2 sm:flex sm:gap-3">
                  {profile.images && profile.images[0] ? (
                    <img
                      src={profile.images[0].url}
                      alt={profile.display_name}
                      className="h-7 w-7 rounded-full sm:h-8 sm:w-8"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954] sm:h-8 sm:w-8">
                      <span className="text-[10px] font-semibold text-white sm:text-xs">
                        {profile.display_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="hidden text-sm font-medium text-[#B3B3B3] lg:inline">
                    {profile.display_name}
                  </span>
                </div>
              )}
              {/* Mobile Menu */}
              <MobileNav currentPage="home" />
              {/* Desktop Buttons */}
              <div className="hidden items-center gap-1.5 sm:flex sm:gap-3">
                <button
                  onClick={() => router.push('/home')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white hover:bg-[#2A2A2A] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Home
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/upload')}
                  className="rounded-full bg-[#1DB954] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Upload
                </button>
                <button
                  onClick={() => router.push('/analytics')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white hover:bg-[#2A2A2A] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Analytics
                </button>
                <button
                  onClick={() => router.push('/social')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white hover:bg-[#2A2A2A] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Social
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-full px-3 py-2 text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white active:scale-95 sm:px-3 sm:text-xs lg:px-4 lg:text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="h-8 w-8 animate-spin text-[#1DB954]"
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
                d="M4 12a8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Welcome{profile ? `, ${profile.display_name}` : ''}!
              </h2>
              <p className="mt-2 text-sm text-[#B3B3B3] sm:text-base">
                Explore your Spotify listening data and discover insights about your music habits.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Top Song Last 4 Weeks */}
              <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
                <h3 className="mb-3 text-sm font-bold text-white sm:mb-4 sm:text-base md:text-lg">
                  Top Song Last 4 Weeks
                </h3>
                {isLoadingTracks ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded bg-[#2A2A2A] sm:h-20 sm:w-20" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#2A2A2A]" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[#2A2A2A]" />
                    </div>
                  </div>
                ) : topTrack ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {topTrack.album.images && topTrack.album.images.length > 0 && (
                      <img
                        src={topTrack.album.images[topTrack.album.images.length - 1]?.url}
                        alt={topTrack.album.name}
                        className="h-16 w-16 flex-shrink-0 self-start rounded object-cover sm:h-20 sm:w-20"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-white sm:text-base md:text-lg">
                        {topTrack.name}
                      </p>
                      <p className="mt-1 break-words text-xs text-[#B3B3B3] sm:text-sm md:text-base">
                        {topTrack.artists.map((a) => a.name).join(', ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#B3B3B3]">No top track found.</p>
                )}
              </div>

              {/* Top Artist Last 4 Weeks */}
              <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
                <h3 className="mb-3 text-sm font-bold text-white sm:mb-4 sm:text-base md:text-lg">
                  Top Artist Last 4 Weeks
                </h3>
                {isLoadingArtists ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-full bg-[#2A2A2A] sm:h-20 sm:w-20" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#2A2A2A]" />
                    </div>
                  </div>
                ) : topArtist ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {topArtist.images && topArtist.images.length > 0 && (
                      <img
                        src={topArtist.images[topArtist.images.length - 1]?.url}
                        alt={topArtist.name}
                        className="h-16 w-16 flex-shrink-0 self-start rounded-full object-cover sm:h-20 sm:w-20"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-white sm:text-base md:text-lg">
                        {topArtist.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#B3B3B3]">No top artist found.</p>
                )}
              </div>

              {/* Recently Played Song */}
              <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6 md:col-span-2 lg:col-span-1">
                <h3 className="mb-3 text-sm font-bold text-white sm:mb-4 sm:text-base md:text-lg">
                  Recently Played
                </h3>
                {isLoadingRecent ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded bg-[#2A2A2A] sm:h-20 sm:w-20" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#2A2A2A]" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[#2A2A2A]" />
                    </div>
                  </div>
                ) : recentTrack ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {recentTrack.album.images && recentTrack.album.images.length > 0 && (
                      <img
                        src={recentTrack.album.images[recentTrack.album.images.length - 1]?.url}
                        alt={recentTrack.album.name}
                        className="h-16 w-16 flex-shrink-0 self-start rounded object-cover sm:h-20 sm:w-20"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-white sm:text-base md:text-lg">
                        {recentTrack.name}
                      </p>
                      <p className="mt-1 break-words text-xs text-[#B3B3B3] sm:text-sm md:text-base">
                        {recentTrack.artists.map((a) => a.name).join(', ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#B3B3B3]">No recent tracks found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

