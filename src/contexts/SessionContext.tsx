'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface SessionContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include', // Important: include cookies
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        console.log('Session check result:', data.authenticated);
      } else {
        setIsAuthenticated(false);
        console.log('Session check failed:', response.status);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    checkSession();
    
    // Also check session when the page becomes visible (after redirect)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check session again after a short delay (for OAuth redirect)
    const timeoutId = setTimeout(() => {
      checkSession();
    }, 500);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        checkSession,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

