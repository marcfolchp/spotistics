'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSession } from '@/contexts/SessionContext';
import { MobileNav } from '@/components/navigation/MobileNav';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Rankings } from '@/components/social/Rankings';

export default function SocialPage() {
  return (
    <ProtectedRoute>
      <SocialContent />
    </ProtectedRoute>
  );
}

function SocialContent() {
  const router = useRouter();
  const { logout } = useSession();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

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
          setCurrentUserId(data.id);
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

  if (isLoading || !currentUserId) {
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
                <h1 className="text-base font-bold text-white sm:text-xl">Spotistics</h1>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Mobile Menu */}
                <MobileNav currentPage="social" />
                {/* Desktop Buttons */}
                <div className="hidden items-center gap-1.5 lg:flex lg:gap-3">
                  <button
                    onClick={() => router.push('/home')}
                    className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
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
                    onClick={logout}
                    className="rounded-full px-3 py-2 text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white active:scale-95 sm:px-3 sm:text-xs lg:px-4 lg:text-sm"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </main>
    </div>
  );
  }

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
              <h1 className="text-base font-bold text-white sm:text-xl">Spotistics</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Mobile Menu */}
              <MobileNav currentPage="social" />
              {/* Desktop Buttons */}
              <div className="hidden items-center gap-1.5 lg:flex lg:gap-3">
                <button
                  onClick={() => router.push('/home')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
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
                  onClick={() => router.push('/upload')}
                  className="rounded-full bg-[#1DB954] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Upload
                </button>
                <button
                  onClick={logout}
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
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Social Rankings</h2>
              <p className="mt-2 text-sm text-[#B3B3B3] sm:text-base">
                See how your listening compares with your friends
              </p>
            </div>
            <button
              onClick={() => router.push('/social/manage')}
              className="w-fit rounded-full bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 sm:px-5 sm:py-2.5 sm:text-base"
            >
              Manage Friends
            </button>
          </div>

          {/* Rankings */}
          <Rankings currentUserId={currentUserId} />
        </div>
      </main>
    </div>
  );
}
