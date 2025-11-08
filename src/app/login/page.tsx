'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(getErrorMessage(errorParam));
    }
  }, [searchParams]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check current domain and warn if mismatch
      const currentHost = window.location.host;
      const expectedHost = process.env.NEXT_PUBLIC_EXPECTED_HOST || '127.0.0.1:8080';
      
      if (!currentHost.includes('127.0.0.1') && !currentHost.includes('localhost')) {
        console.warn('Domain mismatch detected. Make sure you access via 127.0.0.1:8080 or localhost:8080');
      }
      
      const response = await fetch('/api/auth/spotify');
      const data = await response.json();
      
      if (response.ok && data.url) {
        // Redirect to Spotify authorization URL
        window.location.href = data.url;
      } else {
        const errorMessage = data.error || 'Failed to initiate login. Please try again.';
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'access_denied':
        return 'Access denied. Please authorize the app to continue.';
      case 'no_code':
        return 'Authorization failed. Please try again.';
      case 'config':
        return 'Server configuration error. Please contact support.';
      case 'token_exchange_failed':
        return 'Failed to authenticate. Please try again.';
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-[#181818] p-6 sm:space-y-8 sm:p-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1DB954]">
              <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Spotistics
          </h1>
          <p className="mt-2 text-base text-[#B3B3B3] sm:text-lg">
            Analyze your Spotify listening history
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-500/50 p-3 text-xs text-red-400 sm:p-4 sm:text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            <p className="text-center text-xs text-[#B3B3B3] sm:text-sm">
              Connect your Spotify account to get started
            </p>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full rounded-full bg-[#1DB954] px-4 py-3 text-sm font-bold text-white transition-all active:scale-95 hover:scale-105 hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:px-6 sm:py-3.5 sm:text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
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
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  Connect with Spotify
                </span>
              )}
            </button>
          </div>

          <div className="pt-3 text-center text-[10px] text-[#6A6A6A] sm:pt-4 sm:text-xs">
            <p>
              By connecting, you agree to allow Spotistics to access your
              Spotify account data for analysis purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

