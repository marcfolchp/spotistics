'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';

interface MobileNavProps {
  currentPage?: 'home' | 'dashboard' | 'analytics' | 'social' | 'upload';
}

export function MobileNav({ currentPage }: MobileNavProps) {
  const router = useRouter();
  const { logout } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [currentPage]);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  return (
    <div className="relative lg:hidden" ref={menuRef}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col gap-1.5 p-2 transition-opacity active:opacity-70"
        aria-label="Menu"
      >
        <span
          className={`h-0.5 w-6 bg-white transition-all ${
            isOpen ? 'translate-y-2 rotate-45' : ''
          }`}
        />
        <span
          className={`h-0.5 w-6 bg-white transition-all ${isOpen ? 'opacity-0' : ''}`}
        />
        <span
          className={`h-0.5 w-6 bg-white transition-all ${
            isOpen ? '-translate-y-2 -rotate-45' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-[#2A2A2A] bg-[#181818] shadow-xl">
            <div className="py-2">
              {currentPage !== 'home' && (
                <button
                  onClick={() => handleNavigation('/home')}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-[#2A2A2A] active:bg-[#333333]"
                >
                  Home
                </button>
              )}
              {currentPage !== 'dashboard' && (
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-[#2A2A2A] active:bg-[#333333]"
                >
                  Dashboard
                </button>
              )}
              {currentPage !== 'analytics' && (
                <button
                  onClick={() => handleNavigation('/analytics')}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-[#2A2A2A] active:bg-[#333333]"
                >
                  Analytics
                </button>
              )}
              {currentPage !== 'social' && (
                <button
                  onClick={() => handleNavigation('/social')}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-[#2A2A2A] active:bg-[#333333]"
                >
                  Social
                </button>
              )}
              {currentPage !== 'upload' && (
                <button
                  onClick={() => handleNavigation('/upload')}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-[#2A2A2A] active:bg-[#333333]"
                >
                  Upload Data
                </button>
              )}
              <div className="my-1 border-t border-[#2A2A2A]" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm font-medium text-[#B3B3B3] transition-colors hover:bg-[#2A2A2A] hover:text-white active:bg-[#333333]"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

