'use client';

import { useState, useRef, useEffect } from 'react';
import type { AggregatedTopTrack, AggregatedTopArtist } from '@/types';

interface MonthlySummary {
  month: string;
  totalTracks: number;
  totalArtists: number;
  totalMinutes: number;
  totalHours: number;
  topTracks: AggregatedTopTrack[];
  topArtists: AggregatedTopArtist[];
  monthNumber: number; // 1-12 for January-December
  topTrackImage?: string | null;
  topArtistImage?: string | null;
}

interface InstagramStoryGeneratorProps {
  username: string;
}

export function InstagramStoryGenerator({ username }: InstagramStoryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  // Get month name for background image
  const getMonthImagePath = (monthNumber: number, extension: string = 'png'): string => {
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthName = monthNames[monthNumber - 1];
    return `/story-backgrounds/${monthName}.${extension}`;
  };

  // Load background image when summary is available
  useEffect(() => {
    if (summary?.monthNumber) {
      // Try PNG first, then JPG
      const tryLoadImage = (extension: string, onError?: () => void) => {
        const imgPath = getMonthImagePath(summary.monthNumber, extension);
        const img = new Image();
        img.onload = () => setBackgroundImage(imgPath);
        img.onerror = () => {
          if (extension === 'png') {
            // Try JPG if PNG fails
            tryLoadImage('jpg');
          } else {
            // Fallback to gradient if both fail
            setBackgroundImage(null);
            if (onError) onError();
          }
        };
        img.src = imgPath;
      };
      
      tryLoadImage('png');
    }
  }, [summary]);

  const fetchMonthlySummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/story/monthly-summary', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
        throw new Error(errorData.error || 'Failed to fetch monthly summary');
      }

      const data = await response.json();
      // Extract month number from month string (e.g., "January 2024" -> 1)
      const monthName = data.month.split(' ')[0].toLowerCase();
      const monthMap: { [key: string]: number } = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
      };
      const monthNumber = monthMap[monthName] || new Date().getMonth() + 1;
      
      setSummary({ ...data, monthNumber });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching monthly summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch monthly summary');
    } finally {
      setIsLoading(false);
    }
  };

  const generateStory = async () => {
    if (!summary || !storyRef.current) return;

    setIsGenerating(true);
    try {
      // Dynamically import html2canvas (client-side only)
      let html2canvas: any;
      try {
        const module = await import('html2canvas');
        html2canvas = module.default || module;
      } catch (importError) {
        throw new Error('Failed to import html2canvas. Please ensure the package is installed.');
      }
      
      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas is not a function. Module may not be loaded correctly.');
      }
      
      // Wait for background image to load if it exists
      if (backgroundImage) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Continue even if image fails
          img.src = backgroundImage;
        });
      }
      
      // Generate canvas from the story element
      const canvas = await html2canvas(storyRef.current, {
        width: 1080,
        height: 1920,
        scale: 1,
        backgroundColor: '#121212',
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          setError('Failed to generate image');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wrappedify-story-${summary.month.toLowerCase().replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsGenerating(false);
      }, 'image/png');
    } catch (err) {
      console.error('Error generating story:', err);
      setError('Failed to generate story image');
      setIsGenerating(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
  };

  const getMonthShortName = () => {
    if (!summary) return '';
    return summary.month.split(' ')[0].toUpperCase();
  };

  return (
    <>
      {/* Preview Card - "For you" section style */}
      <div 
        className="relative rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 active:scale-95 aspect-square bg-gradient-to-br from-[#1DB954]/20 to-[#121212]"
        onClick={fetchMonthlySummary}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          {/* Icon/Graphic */}
          <div className="mb-3 flex items-center justify-center">
            <div className="relative">
              {/* Abstract shapes similar to the design */}
              <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-purple-500/60 blur-sm"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-orange-500/60 blur-sm"></div>
              <div className="w-12 h-12 rounded-lg bg-[#1DB954]/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Month and "recap" text */}
          <div className="text-center">
            <div className="text-lg font-bold text-white mb-1">
              {getMonthShortName() || 'MONTH'}
            </div>
            <div className="text-sm text-white/70">
              recap
            </div>
          </div>
        </div>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <svg
              className="h-6 w-6 animate-spin text-white"
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
        )}
      </div>

      {/* Full-screen Modal */}
      {isModalOpen && summary && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

            {/* Story Preview */}
          <div className="relative w-full max-w-sm mx-auto">
            {/* Visible preview in modal */}
            <div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{ 
                aspectRatio: '9/16',
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(to bottom, #1DB954, #121212, #1DB954)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="relative h-full flex flex-col items-start justify-start p-8 text-white pt-32">
                {/* Top Track */}
                {summary.topTracks.length > 0 && (
                  <div className="w-full mb-6 px-4 mt-8">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4">
                      {summary.topTrackImage ? (
                        <img 
                          src={summary.topTrackImage} 
                          alt={summary.topTracks[0].trackName}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold mb-1 text-white/80 uppercase tracking-wide">Top Track</div>
                        <div className="text-lg font-bold text-white truncate">{summary.topTracks[0].trackName}</div>
                        <div className="text-sm text-white/80 truncate">{summary.topTracks[0].artistName}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Artist */}
                {summary.topArtists.length > 0 && (
                  <div className="w-full mb-6 px-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4">
                      {summary.topArtistImage ? (
                        <img 
                          src={summary.topArtistImage} 
                          alt={summary.topArtists[0].artistName}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold mb-1 text-white/80 uppercase tracking-wide">Top Artist</div>
                        <div className="text-lg font-bold text-white truncate">{summary.topArtists[0].artistName}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 w-full px-4 mt-auto mb-20">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">{summary.totalTracks.toLocaleString()}</div>
                    <div className="text-xs text-white/80 mt-1 uppercase tracking-wide">Tracks</div>
                  </div>
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">{formatDuration(summary.totalMinutes)}</div>
                    <div className="text-xs text-white/80 mt-1 uppercase tracking-wide">Listened</div>
                  </div>
                </div>

                {/* Caption at bottom */}
                <div className="absolute bottom-4 left-0 right-0 px-4">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 inline-block mx-auto">
                    <div className="text-sm font-semibold flex items-center justify-center gap-1.5 text-white">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
                      </svg>
                      <span>wrappedify/{username}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden story template for image generation (full 1080x1920) */}
            <div className="fixed -left-[9999px] top-0" style={{ width: '1080px', height: '1920px' }}>
              <div
                ref={storyRef}
                className="relative w-full h-full overflow-hidden"
                style={{ 
                  width: '1080px',
                  height: '1920px',
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(to bottom, #1DB954, #121212, #1DB954)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="relative h-full flex flex-col items-start justify-start p-32 text-white pt-64">
                  {/* Top Track */}
                  {summary.topTracks.length > 0 && (
                    <div className="w-full max-w-3xl mb-12 px-8 mt-16">
                      <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 flex items-center gap-6">
                        {summary.topTrackImage ? (
                          <img 
                            src={summary.topTrackImage} 
                            alt={summary.topTracks[0].trackName}
                            className="w-40 h-40 rounded-2xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-40 h-40 rounded-2xl bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-20 h-20 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-3xl font-semibold mb-4 text-white/80 uppercase tracking-wide">Top Track</div>
                          <div className="text-5xl font-bold text-white mb-2 truncate">{summary.topTracks[0].trackName}</div>
                          <div className="text-3xl text-white/80 truncate">{summary.topTracks[0].artistName}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Artist */}
                  {summary.topArtists.length > 0 && (
                    <div className="w-full max-w-3xl mb-12 px-8">
                      <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 flex items-center gap-6">
                        {summary.topArtistImage ? (
                          <img 
                            src={summary.topArtistImage} 
                            alt={summary.topArtists[0].artistName}
                            className="w-40 h-40 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-40 h-40 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-20 h-20 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-3xl font-semibold text-white/80 uppercase tracking-wide mb-2">Top Artist</div>
                          <div className="text-5xl font-bold text-white truncate">{summary.topArtists[0].artistName}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-8 w-full max-w-3xl px-8 mt-auto mb-32">
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 text-center">
                      <div className="text-6xl font-bold text-white mb-2">{summary.totalTracks.toLocaleString()}</div>
                      <div className="text-2xl text-white/80 uppercase tracking-wide">Tracks</div>
                    </div>
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 text-center">
                      <div className="text-6xl font-bold text-white mb-2">{formatDuration(summary.totalMinutes)}</div>
                      <div className="text-2xl text-white/80 uppercase tracking-wide">Listened</div>
                    </div>
                  </div>

                  {/* Caption at bottom */}
                  <div className="absolute bottom-32 left-0 right-0 px-8">
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block mx-auto">
                      <div className="text-4xl font-semibold flex items-center justify-center gap-3 text-white" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
                        </svg>
                        <span>wrappedify/{username}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={generateStory}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1DB954] text-white font-semibold hover:bg-[#1ed760] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Save Story
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-900/20 border border-red-500/50 p-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
