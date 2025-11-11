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

// Color palette options
const COLOR_PALETTES = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Yellow', value: '#FFE66D' },
  { name: 'Teal', value: '#0A7C7C' },
  { name: 'Blue', value: '#4A90E2' },
  { name: 'Green', value: '#1DB954' },
  { name: 'Cyan', value: '#00D4FF' },
];

export function InstagramStoryGenerator({ username }: InstagramStoryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState<string>('#FFFFFF'); // Default white
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

  const generateStoryImage = async (): Promise<Blob | null> => {
    if (!summary || !storyRef.current) return null;

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
      
      // Inject a style override to prevent oklab colors from being parsed
      // This must be done before html2canvas reads the styles
      const styleOverrideId = 'html2canvas-oklab-fix';
      let styleOverride = document.getElementById(styleOverrideId) as HTMLStyleElement;
      if (!styleOverride) {
        styleOverride = document.createElement('style');
        styleOverride.id = styleOverrideId;
        document.head.appendChild(styleOverride);
      }
      
      // Force all color-related properties to use rgb/hex by overriding computed styles
      // This prevents html2canvas from encountering oklab during parsing
      if (storyRef.current) {
        const allElements = storyRef.current.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const computed = window.getComputedStyle(htmlEl);
          
          // Check and fix color
          if (computed.color && (computed.color.includes('oklab') || computed.color.includes('oklch'))) {
            // Get the actual rendered color by creating a temp element
            const temp = document.createElement('span');
            temp.style.color = computed.color;
            temp.style.position = 'absolute';
            temp.style.visibility = 'hidden';
            document.body.appendChild(temp);
            const rgbColor = window.getComputedStyle(temp).color;
            document.body.removeChild(temp);
            if (rgbColor && !rgbColor.includes('oklab')) {
              htmlEl.style.setProperty('color', rgbColor, 'important');
            } else {
              htmlEl.style.setProperty('color', fontColor, 'important');
            }
          }
          
          // Check and fix background color
          if (computed.backgroundColor && (computed.backgroundColor.includes('oklab') || computed.backgroundColor.includes('oklch'))) {
            const temp = document.createElement('span');
            temp.style.backgroundColor = computed.backgroundColor;
            temp.style.position = 'absolute';
            temp.style.visibility = 'hidden';
            document.body.appendChild(temp);
            const rgbBg = window.getComputedStyle(temp).backgroundColor;
            document.body.removeChild(temp);
            if (rgbBg && !rgbBg.includes('oklab')) {
              htmlEl.style.setProperty('background-color', rgbBg, 'important');
            } else {
              htmlEl.style.setProperty('background-color', 'rgba(0, 0, 0, 0.4)', 'important');
            }
          }
        });
      }
      
      // Generate canvas from the story element
      // Wrap in try-catch to handle oklab color errors
      let canvas;
      try {
        canvas = await html2canvas(storyRef.current, {
          width: 1080,
          height: 1920,
          scale: 1,
          backgroundColor: '#121212',
          useCORS: true,
          logging: false,
          allowTaint: true,
          foreignObjectRendering: false, // Disable to avoid oklab parsing issues
          ignoreElements: (element: HTMLElement) => {
            // Ignore elements that might cause issues
            return false;
          },
          onclone: (clonedDoc: Document) => {
            // Convert all computed styles that might contain oklab to rgb/hex
            // This is necessary because Tailwind CSS v4 uses oklab colors internally
            const allElements = clonedDoc.querySelectorAll('*');
            const win = clonedDoc.defaultView || window;
            
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (!htmlEl.style) return;
              
              try {
                // Get computed styles from the cloned document
                const computed = win.getComputedStyle(htmlEl);
                
                // Helper to convert any color to rgb
                const toRgb = (colorValue: string): string | null => {
                  if (!colorValue || colorValue === 'transparent' || colorValue === 'rgba(0, 0, 0, 0)') {
                    return null;
                  }
                  if (colorValue.startsWith('rgb') || colorValue.startsWith('#')) {
                    return colorValue;
                  }
                  if (colorValue.includes('oklab') || colorValue.includes('oklch')) {
                    // Create a temporary element to get the actual rgb value
                    const temp = document.createElement('div');
                    temp.style.color = colorValue;
                    temp.style.position = 'absolute';
                    temp.style.visibility = 'hidden';
                    temp.style.top = '-9999px';
                    document.body.appendChild(temp);
                    const rgb = window.getComputedStyle(temp).color;
                    document.body.removeChild(temp);
                    return rgb || fontColor;
                  }
                  return null;
                };
                
                // Convert color
                const color = computed.color;
                if (color && (color.includes('oklab') || color.includes('oklch'))) {
                  const rgbColor = toRgb(color);
                  if (rgbColor) {
                    htmlEl.style.setProperty('color', rgbColor, 'important');
                  } else {
                    htmlEl.style.setProperty('color', fontColor, 'important');
                  }
                } else if (htmlEl.style.color && (htmlEl.style.color.includes('oklab') || htmlEl.style.color.includes('oklch'))) {
                  htmlEl.style.setProperty('color', fontColor, 'important');
                }
                
                // Convert background color
                const bgColor = computed.backgroundColor;
                if (bgColor && (bgColor.includes('oklab') || bgColor.includes('oklch'))) {
                  const rgbBg = toRgb(bgColor);
                  if (rgbBg) {
                    htmlEl.style.setProperty('background-color', rgbBg, 'important');
                  } else {
                    htmlEl.style.setProperty('background-color', 'rgba(0, 0, 0, 0.4)', 'important');
                  }
                } else if (htmlEl.style.backgroundColor && (htmlEl.style.backgroundColor.includes('oklab') || htmlEl.style.backgroundColor.includes('oklch'))) {
                  htmlEl.style.setProperty('background-color', 'rgba(0, 0, 0, 0.4)', 'important');
                }
                
                // Convert border colors
                ['borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach((prop) => {
                  const borderColor = (computed as any)[prop];
                  if (borderColor && (borderColor.includes('oklab') || borderColor.includes('oklch'))) {
                    const rgbBorder = toRgb(borderColor);
                    if (rgbBorder) {
                      htmlEl.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), rgbBorder, 'important');
                    }
                  }
                });
                
                // Convert text decoration and outline colors
                const textDecorationColor = computed.textDecorationColor;
                if (textDecorationColor && (textDecorationColor.includes('oklab') || textDecorationColor.includes('oklch'))) {
                  const rgbDeco = toRgb(textDecorationColor);
                  if (rgbDeco) {
                    htmlEl.style.setProperty('text-decoration-color', rgbDeco, 'important');
                  }
                }
                
                const outlineColor = computed.outlineColor;
                if (outlineColor && (outlineColor.includes('oklab') || outlineColor.includes('oklch'))) {
                  const rgbOutline = toRgb(outlineColor);
                  if (rgbOutline) {
                    htmlEl.style.setProperty('outline-color', rgbOutline, 'important');
                  }
                }
              } catch (e) {
                // If conversion fails, at least ensure inline styles are safe
                if (htmlEl.style.color && htmlEl.style.color.includes('oklab')) {
                  htmlEl.style.setProperty('color', fontColor, 'important');
                }
                if (htmlEl.style.backgroundColor && htmlEl.style.backgroundColor.includes('oklab')) {
                  htmlEl.style.setProperty('background-color', 'rgba(0, 0, 0, 0.4)', 'important');
                }
              }
            });
          },
        });
      } catch (html2canvasError: any) {
        // If error is about oklab, try with a simpler configuration
        if (html2canvasError?.message?.includes('oklab') || html2canvasError?.message?.includes('color')) {
          console.warn('Retrying html2canvas with simplified configuration due to color parsing error');
          // Retry with foreignObjectRendering disabled and simpler options
          canvas = await html2canvas(storyRef.current, {
            width: 1080,
            height: 1920,
            scale: 1,
            backgroundColor: '#121212',
            useCORS: true,
            logging: false,
            allowTaint: true,
            foreignObjectRendering: false,
          });
        } else {
          throw html2canvasError;
        }
      }

      return new Promise((resolve) => {
        canvas.toBlob((blob: Blob | null) => {
          // Clean up style override
          const styleOverride = document.getElementById('html2canvas-oklab-fix');
          if (styleOverride) {
            styleOverride.remove();
          }
          setIsGenerating(false);
          resolve(blob);
        }, 'image/png');
      });
    } catch (err) {
      // Clean up style override on error
      const styleOverride = document.getElementById('html2canvas-oklab-fix');
      if (styleOverride) {
        styleOverride.remove();
      }
      console.error('Error generating story:', err);
      setError('Failed to generate story image');
      setIsGenerating(false);
      return null;
    }
  };

  const saveToPhotos = async () => {
    const blob = await generateStoryImage();
    if (!blob) {
      setError('Failed to generate image');
      return;
    }

    const fileName = `wrappedify-story-${summary?.month.toLowerCase().replace(/\s+/g, '-') || 'recap'}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    // Check if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Try Web Share API first (works on iOS 14.5+ and Android)
    if (isMobile && navigator.share) {
      try {
        // Check if we can share files (iOS 14.5+ and Android)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${summary?.month || 'Monthly'} Recap`,
            text: `Check out my ${summary?.month || 'monthly'} music recap!`,
          });
          return; // Successfully shared - user can save from share sheet
        }
      } catch (err) {
        // If user cancelled, just return silently
        if ((err as Error).name === 'AbortError') {
          return;
        }
        // If share failed for other reasons, continue to fallback
        console.log('Web Share API not available or failed:', err);
      }
    }

    // For iOS devices that don't support file sharing, use download link
    // iOS Safari will download the image, then user can save from Photos app
    if (isIOS) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      return;
    }

    // Fallback: Download the file (works on desktop and Android)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Clean up after a delay
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const shareStory = async () => {
    const blob = await generateStoryImage();
    if (!blob) {
      setError('Failed to generate image');
      return;
    }

    const file = new File([blob], `wrappedify-story-${summary?.month.toLowerCase().replace(/\s+/g, '-') || 'recap'}.png`, {
      type: 'image/png',
    });

    // Use Web Share API if available
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${summary?.month || 'Monthly'} Recap`,
          text: `Check out my ${summary?.month || 'monthly'} music recap!`,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to download
        if ((err as Error).name !== 'AbortError') {
          saveToPhotos();
        }
      }
    } else {
      // Fallback to download if Web Share API is not available
      saveToPhotos();
    }
  };

  const formatDuration = (minutes: number) => {
    return `${minutes.toLocaleString()} min`;
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
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Story Preview - Smaller on mobile */}
          <div className="relative w-full max-w-[240px] sm:max-w-xs mx-auto my-4">
            {/* Visible preview in modal */}
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ 
                aspectRatio: '9/16',
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(to bottom, #1DB954, #121212, #1DB954)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="relative h-full flex flex-col items-start justify-start p-4 text-white pt-16" style={{ color: fontColor }}>
                {/* Top Track */}
                {summary.topTracks.length > 0 && (
                  <div className="w-full mb-3 px-2">
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2.5 flex items-center gap-2.5">
                      {summary.topTrackImage ? (
                        <img 
                          src={summary.topTrackImage} 
                          alt={summary.topTracks[0].trackName}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6" style={{ color: fontColor }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-semibold mb-0.5 uppercase tracking-wide opacity-80" style={{ color: fontColor }}>Top Track</div>
                        <div className="text-xs font-bold truncate" style={{ color: fontColor }}>{summary.topTracks[0].trackName}</div>
                        <div className="text-[10px] truncate opacity-80" style={{ color: fontColor }}>{summary.topTracks[0].artistName}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Artist */}
                {summary.topArtists.length > 0 && (
                  <div className="w-full mb-3 px-2">
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2.5 flex items-center gap-2.5">
                      {summary.topArtistImage ? (
                        <img 
                          src={summary.topArtistImage} 
                          alt={summary.topArtists[0].artistName}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6" style={{ color: fontColor }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-semibold mb-0.5 uppercase tracking-wide opacity-80" style={{ color: fontColor }}>Top Artist</div>
                        <div className="text-xs font-bold truncate" style={{ color: fontColor }}>{summary.topArtists[0].artistName}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2.5 w-full px-2 mt-auto mb-12">
                  <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2.5 text-center">
                    <div className="text-sm font-bold" style={{ color: fontColor }}>{summary.totalTracks.toLocaleString()}</div>
                    <div className="text-[9px] opacity-80 mt-0.5 uppercase tracking-wide" style={{ color: fontColor }}>Tracks</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2.5 text-center">
                    <div className="text-sm font-bold" style={{ color: fontColor }}>{formatDuration(summary.totalMinutes)}</div>
                    <div className="text-[9px] opacity-80 mt-0.5 uppercase tracking-wide" style={{ color: fontColor }}>Listened</div>
                  </div>
                </div>

                {/* Caption at bottom */}
                <div className="absolute bottom-3 left-0 right-0 px-2">
                  <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 inline-block mx-auto">
                    <div className="text-[10px] font-semibold flex items-center justify-center gap-1.5" style={{ color: fontColor }}>
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
                      </svg>
                      <span>stats.fm/{username}</span>
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
                  <div className="relative h-full flex flex-col items-start justify-start p-32" style={{ color: fontColor }}>
                  {/* Top Track */}
                  {summary.topTracks.length > 0 && (
                    <div className="w-full max-w-3xl mb-12 px-8">
                      <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 flex items-center gap-6">
                        {summary.topTrackImage ? (
                          <img 
                            src={summary.topTrackImage} 
                            alt={summary.topTracks[0].trackName}
                            className="w-40 h-40 rounded-2xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-40 h-40 rounded-2xl bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-20 h-20" style={{ color: fontColor }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-3xl font-semibold mb-4 opacity-80 uppercase tracking-wide" style={{ color: fontColor }}>Top Track</div>
                          <div className="text-5xl font-bold mb-2 truncate" style={{ color: fontColor }}>{summary.topTracks[0].trackName}</div>
                          <div className="text-3xl opacity-80 truncate" style={{ color: fontColor }}>{summary.topTracks[0].artistName}</div>
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
                            <svg className="w-20 h-20" style={{ color: fontColor }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-3xl font-semibold opacity-80 uppercase tracking-wide mb-2" style={{ color: fontColor }}>Top Artist</div>
                          <div className="text-5xl font-bold truncate" style={{ color: fontColor }}>{summary.topArtists[0].artistName}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-8 w-full max-w-3xl px-8 mt-auto mb-32">
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 text-center">
                      <div className="text-6xl font-bold mb-2" style={{ color: fontColor }}>{summary.totalTracks.toLocaleString()}</div>
                      <div className="text-2xl opacity-80 uppercase tracking-wide" style={{ color: fontColor }}>Tracks</div>
                    </div>
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 text-center">
                      <div className="text-6xl font-bold mb-2" style={{ color: fontColor }}>{formatDuration(summary.totalMinutes)}</div>
                      <div className="text-2xl opacity-80 uppercase tracking-wide" style={{ color: fontColor }}>Listened</div>
                    </div>
                  </div>

                  {/* Caption at bottom */}
                  <div className="absolute bottom-32 left-0 right-0 px-8">
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block mx-auto">
                      <div className="text-4xl font-semibold flex items-center justify-center gap-3" style={{ color: fontColor, fontFamily: 'Arial, sans-serif' }}>
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
                        </svg>
                        <span>stats.fm/{username}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
              {COLOR_PALETTES.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFontColor(color.value)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all ${
                    fontColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-label={`Select ${color.name} color`}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-6">
              <button
                onClick={saveToPhotos}
                disabled={isGenerating}
                className="flex flex-col items-center justify-center gap-1 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save to Photos"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] sm:text-xs text-white">Save</span>
              </button>
              <button
                onClick={shareStory}
                disabled={isGenerating}
                className="flex flex-col items-center justify-center gap-1 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Share"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-[10px] sm:text-xs text-white">Share</span>
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
