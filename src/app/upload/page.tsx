'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MobileNav } from '@/components/navigation/MobileNav';
import { useSession } from '@/contexts/SessionContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}

function UploadContent() {
  const router = useRouter();
  const { logout } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState<boolean | null>(null); // null = checking, true = has data, false = no data

  // Check if user has existing data on mount
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const response = await fetch('/api/analytics/data?summary=true&timeRange=all', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.summary && data.summary.total_tracks > 0) {
            setHasExistingData(true);
          } else {
            setHasExistingData(false);
          }
        } else {
          setHasExistingData(false);
        }
      } catch (err) {
        console.error('Error checking existing data:', err);
        setHasExistingData(false);
      }
    };
    checkExistingData();
  }, []);

  // Load jobId from localStorage on mount to recover from refresh
  useEffect(() => {
    const savedJobId = localStorage.getItem('uploadJobId');
    const savedFileName = localStorage.getItem('uploadFileName');
    if (savedJobId && savedFileName) {
      // Check if job is still active
      const checkJob = async () => {
        try {
          const response = await fetch(`/api/upload/status?jobId=${savedJobId}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const job = await response.json();
            if (job.status === 'completed') {
              // Job completed, clear storage and show success
              localStorage.removeItem('uploadJobId');
              localStorage.removeItem('uploadFileName');
              setHasExistingData(true); // Mark as having data
              setSuccess(true);
              setUploadProgress(100);
              setTimeout(() => {
                router.push('/analytics');
              }, 2000);
            } else if (job.status !== 'failed') {
              // Job still processing, resume polling
              setJobId(savedJobId);
              setFileName(savedFileName);
              setIsUploading(true);
              setUploadProgress(job.progress || 0);
              setCurrentStage(job.message || 'Processing...');
              pollJobStatus(savedJobId);
            } else {
              // Job failed, clear storage
              localStorage.removeItem('uploadJobId');
              localStorage.removeItem('uploadFileName');
              setError(job.error || 'Upload failed. Please try again.');
            }
          }
        } catch (err) {
          // If we can't check, clear storage
          localStorage.removeItem('uploadJobId');
          localStorage.removeItem('uploadFileName');
        }
      };
      checkJob();
    }
  }, [router]);

  const handleLogout = async () => {
    await logout();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.zip')) {
      setError('Please upload a JSON file or ZIP file containing your Spotify data export.');
      return;
    }

    setFileName(file.name);
    setError(null);
    setSuccess(false);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.jobId) {
              // Start polling for job status
              setJobId(response.jobId);
              // Store jobId in localStorage for persistence
              localStorage.setItem('uploadJobId', response.jobId);
              localStorage.setItem('uploadFileName', file.name);
              pollJobStatus(response.jobId);
            } else {
              // Legacy response (immediate success)
              setSuccess(true);
              setUploadProgress(100);
              setTimeout(() => {
                router.push('/analytics');
              }, 2000);
            }
          } catch (err) {
            setError('Failed to parse response. Please try again.');
            setIsUploading(false);
          }
        } else {
          const errorData = JSON.parse(xhr.responseText || '{}');
          setError(errorData.error || 'Failed to upload file. Please try again.');
          setIsUploading(false);
        }
      });

      xhr.addEventListener('error', () => {
        setError('An error occurred while uploading the file. Please try again.');
        setIsUploading(false);
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (err) {
      console.error('Upload error:', err);
      setError('An error occurred while uploading the file. Please try again.');
      setIsUploading(false);
    }
  };

  const pollJobStatus = async (id: string) => {
    let errorCount = 0;
    let dataCheckDone = false;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/upload/status?jobId=${id}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          errorCount = 0; // Reset error count on success
          const job = await response.json();
          
          setUploadProgress(job.progress || 0);
          setCurrentStage(job.message || 'Processing...');
          
          if (job.status === 'completed') {
            clearInterval(pollInterval);
            // Clear localStorage on success
            localStorage.removeItem('uploadJobId');
            localStorage.removeItem('uploadFileName');
            setHasExistingData(true); // Mark as having data after successful upload
            setSuccess(true);
            setUploadProgress(100);
            setTimeout(() => {
              router.push('/analytics');
            }, 2000);
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            // Clear localStorage on failure
            localStorage.removeItem('uploadJobId');
            localStorage.removeItem('uploadFileName');
            setError(job.error || 'Processing failed. Please try again.');
            setIsUploading(false);
          }
        } else if (response.status === 404) {
          // Job not found - check if data was actually uploaded (only once)
          if (!dataCheckDone) {
            dataCheckDone = true;
            console.warn('Job not found, checking if upload completed...');
            
            // Check if data exists by trying to fetch analytics data
            try {
              const checkResponse = await fetch('/api/analytics/data?timeRange=all', {
                credentials: 'include',
              });
              if (checkResponse.ok) {
                const data = await checkResponse.json();
                // If we have data, the upload likely completed
                if (data.summary && data.summary.total_tracks > 0) {
                  clearInterval(pollInterval);
                  localStorage.removeItem('uploadJobId');
                  localStorage.removeItem('uploadFileName');
                  setHasExistingData(true); // Mark as having data
                  setSuccess(true);
                  setUploadProgress(100);
                  setCurrentStage('Upload completed successfully!');
                  setTimeout(() => {
                    router.push('/analytics');
                  }, 2000);
                  return;
                }
              }
            } catch (checkErr) {
              console.error('Error checking data:', checkErr);
            }
          }
          
          // If job is recent (less than 15 minutes), keep polling
          // Otherwise, show error
          const jobIdParts = id.split('-');
          if (jobIdParts.length >= 2) {
            const timestamp = parseInt(jobIdParts[jobIdParts.length - 1]);
            const age = Date.now() - timestamp;
            const ageMinutes = age / 1000 / 60;
            
            if (ageMinutes > 15) {
              // Job too old, likely lost
              clearInterval(pollInterval);
              localStorage.removeItem('uploadJobId');
              localStorage.removeItem('uploadFileName');
              setError('Upload job was lost. The file may still be processing. Please check your analytics page or try uploading again.');
              setIsUploading(false);
            }
            // Otherwise continue polling (job might still be processing)
          } else {
            // Invalid job ID format
            clearInterval(pollInterval);
            localStorage.removeItem('uploadJobId');
            localStorage.removeItem('uploadFileName');
            setError('Invalid upload job. Please try uploading again.');
            setIsUploading(false);
          }
        } else {
          // Server error - retry a few times before giving up
          errorCount++;
          const errorData = await response.json().catch(() => ({}));
          console.error('Error checking upload status:', errorData);
          
          if (errorCount >= 5) {
            clearInterval(pollInterval);
            setError('Unable to check upload status. Please check your analytics page to see if the upload completed.');
            setIsUploading(false);
          }
        }
      } catch (err) {
        errorCount++;
        console.error('Error polling job status:', err);
        // Give up after 5 consecutive network errors
        if (errorCount >= 5) {
          clearInterval(pollInterval);
          setError('Network error while checking upload status. Please check your analytics page to see if the upload completed.');
          setIsUploading(false);
        }
      }
    }, 1000); // Poll every second
    
    // Cleanup after 15 minutes (increased timeout for large files)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isUploading) {
        // Don't clear localStorage - user might refresh and check later
        setError('Upload is taking longer than expected. You can close this page and check back later. The upload will continue processing in the background.');
        setIsUploading(false);
      }
    }, 15 * 60 * 1000);
  };

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
                Wrappedify
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Mobile Menu */}
              <MobileNav currentPage="upload" />
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

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Upload Your Spotify Data
            </h2>
            <p className="mt-2 text-sm text-[#B3B3B3] sm:text-base">
              Upload your Spotify data export to analyze your complete listening history.
            </p>
          </div>

          <div className="rounded-lg bg-[#181818] p-4 sm:p-6 lg:p-8">
            <div className="space-y-6">
              {/* Instructions */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base font-bold text-white sm:text-lg">
                  How to get your Spotify data:
                </h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-xs text-[#B3B3B3] sm:space-y-2 sm:pl-6 sm:text-sm">
                  <li>Go to your Spotify account page</li>
                  <li>Click on "Privacy settings"</li>
                  <li>Scroll down to "Download your data"</li>
                  <li>Click "Request data" and wait for the email</li>
                  <li>Download the ZIP file from the email</li>
                  <li>Upload the ZIP file directly (we'll extract it automatically)</li>
                  <li>Or extract the ZIP and upload the <code className="rounded bg-[#2A2A2A] px-1 py-0.5 text-[10px] text-[#1DB954] sm:text-xs">StreamingHistory_music*.json</code> file(s)</li>
                </ol>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                {hasExistingData === true ? (
                  <div className="rounded-lg border border-[#1DB954]/30 bg-[#1DB954]/10 p-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-[#1DB954] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          Already uploaded data
                        </p>
                        <p className="mt-1 text-xs text-[#B3B3B3]">
                          You have already uploaded your Spotify data. If you want to update it with a new export, you can upload again (this will replace your existing data).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                
                <label className="block">
                  <span className="text-sm font-medium text-white">
                    Select your Spotify data file
                  </span>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".json,.zip"
                      onChange={handleFileSelect}
                      disabled={isUploading || hasExistingData === null}
                      className="block w-full text-sm text-[#B3B3B3] file:mr-4 file:rounded-full file:border-0 file:bg-[#1DB954] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {hasExistingData === null && (
                    <p className="mt-2 text-xs text-[#6A6A6A]">
                      Checking for existing data...
                    </p>
                  )}
                </label>

                {fileName && !isUploading && !success && (
                  <p className="text-sm text-[#B3B3B3]">
                    Selected: <span className="font-medium text-white">{fileName}</span>
                  </p>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#B3B3B3]">
                        {currentStage || 'Processing...'}
                      </span>
                      <span className="font-semibold text-white">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#2A2A2A]">
                      <div
                        className="h-full bg-[#1DB954] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    {jobId && (
                      <div className="rounded-lg border border-[#1DB954]/30 bg-[#1DB954]/10 p-3 text-xs text-[#1DB954]">
                        <p className="font-semibold mb-1">Upload processing in background</p>
                        <p className="text-[#B3B3B3]">
                          Your file is being processed. You can safely close this page and check back later. The upload will continue processing in the background.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="rounded-lg border border-[#1DB954]/50 bg-[#1DB954]/10 p-4 text-sm text-[#1DB954]">
                    <p className="font-semibold">Upload successful!</p>
                    <p className="mt-1">Redirecting to dashboard...</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-4 text-sm text-red-400">
                    <p className="font-semibold">Error:</p>
                    <p className="mt-1">{error}</p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="rounded-lg bg-[#2A2A2A] p-4 text-sm">
                <p className="font-semibold text-white">
                  📊 What happens to your data?
                </p>
                <p className="mt-2 text-[#B3B3B3]">
                  Your data is processed and stored securely in Supabase. We use your data only to generate your personalized
                  analytics dashboard. Your data is private and only accessible to you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

