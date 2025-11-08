'use client';

import { useSession } from '@/contexts/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook to protect routes - redirects to login if not authenticated
 */
export function useAuth(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading, checkSession } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Give cookies time to be set after OAuth redirect
      // Re-check session before redirecting
      const timeoutId = setTimeout(async () => {
        await checkSession();
        // Wait a bit more and check again
        setTimeout(() => {
          if (!isAuthenticated) {
            console.log('Still not authenticated, redirecting to login');
            router.push(redirectTo);
          }
        }, 200);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, isLoading, router, redirectTo, checkSession]);

  return {
    isAuthenticated,
    isLoading,
  };
}

/**
 * Hook to get access token from cookies
 * Note: This is a client-side hook, tokens are stored in httpOnly cookies
 * For API calls, use the server-side cookie access
 */
export function useSpotifyToken() {
  const { isAuthenticated } = useSession();

  // Token is stored in httpOnly cookie, so we can't access it directly from client
  // API routes will handle token access automatically
  return {
    isAuthenticated,
    hasToken: isAuthenticated,
  };
}

