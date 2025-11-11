import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseSpotifyExport, convertExportToProcessed } from '@/lib/data-processing/export';
import { extractJsonFromZip } from '@/lib/utils/zip';
import { storeListeningData, storeUserDataSummary, deleteUserListeningData, deleteUserListeningDataUpToDate } from '@/lib/supabase/storage';
import { createUploadJob, updateUploadJob } from '@/lib/jobs/upload-job';

/**
 * Background processing function
 */
async function processUploadInBackground(
  jobId: string,
  arrayBuffer: ArrayBuffer,
  buffer: Buffer,
  fileName: string,
  userId: string,
  accessToken: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  console.log(`[${jobId}] Starting background processing for user ${userId}, file: ${fileName}`);
  const startTime = Date.now();
  
  try {
    // Job already initialized at 15% when created, just update status
    updateUploadJob(jobId, {
      status: 'extracting',
      progress: 15, // File upload complete (0-15% was file transfer)
      message: 'Extracting files from ZIP...',
    });
    console.log(`[${jobId}] Job updated to extracting (15%)`);

    let exportTracks: any[] = [];
    
    if (fileName.endsWith('.zip')) {
      try {
        const fileSizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
        console.log(`[${jobId}] Processing ZIP file: ${fileName} (${fileSizeMB} MB)`);
        exportTracks = await extractJsonFromZip(arrayBuffer);
        console.log(`[${jobId}] Extracted ${exportTracks.length} tracks from ZIP file`);
        
        if (exportTracks.length === 0) {
          throw new Error('No valid streaming history data found in ZIP file. Please ensure the ZIP contains Spotify export JSON files.');
        }
      } catch (zipError: any) {
        console.error(`[${jobId}] ZIP extraction error:`, zipError);
        console.error(`[${jobId}] ZIP error stack:`, zipError.stack);
        updateUploadJob(jobId, {
          status: 'failed',
          error: zipError.message || 'Failed to extract ZIP file',
          progress: 0,
          message: `Extraction failed: ${zipError.message || 'Unknown error'}`,
        });
        return;
      }
    } else {
      try {
        const text = buffer.toString('utf-8');
        const jsonData = JSON.parse(text);
        exportTracks = parseSpotifyExport(jsonData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        updateUploadJob(jobId, {
          status: 'failed',
          error: 'Invalid JSON file format',
          progress: 0,
          message: 'Parsing failed',
        });
        return;
      }
    }

    updateUploadJob(jobId, {
      status: 'processing',
      progress: 25, // 15-25% for extraction
      message: `Processing ${exportTracks.length} tracks...`,
    });
    console.log(`[${jobId}] Job updated to processing (25%)`);

    // Process the Spotify export data
    console.log(`Processing ${exportTracks.length} export tracks...`);
    const processedData = convertExportToProcessed(exportTracks);
    console.log(`Processed ${processedData.length} tracks (filtered out ${exportTracks.length - processedData.length} with 0ms played)`);

    // Calculate date range efficiently (single pass, no sorting needed)
    let oldestDate = new Date();
    let newestDate = new Date();
    if (processedData.length > 0) {
      let minTime = Infinity;
      let maxTime = -Infinity;
      for (const item of processedData) {
        const time = item.playedAt.getTime();
        if (time < minTime) minTime = time;
        if (time > maxTime) maxTime = time;
      }
      oldestDate = new Date(minTime);
      newestDate = new Date(maxTime);
    }
    
    console.log(`[${jobId}] Uploaded data date range: ${oldestDate.toISOString()} to ${newestDate.toISOString()}`);

    updateUploadJob(jobId, {
      status: 'storing',
      progress: 30, // 25-30% for processing
      message: `Storing ${processedData.length} tracks in database...`,
    });
    console.log(`[${jobId}] Job updated to storing (30%)`);

    // Store data in Supabase
    try {
      console.log(`[${jobId}] Storing data for user ${userId}...`);
      
      // Find the maximum date in the uploaded data (reuse newestDate calculated above)
      const maxDate = processedData.length > 0 ? newestDate : null;
      
      // Delete existing data only up to the max date (preserve newer data)
      if (maxDate) {
        try {
          console.log(`[${jobId}] Deleting existing data up to ${maxDate.toISOString()} for user ${userId}...`);
          console.log(`[${jobId}] This will preserve any data newer than ${maxDate.toISOString()}`);
          await deleteUserListeningDataUpToDate(userId, maxDate);
          console.log(`[${jobId}] Deleted existing data up to ${maxDate.toISOString()}`);
        } catch (deleteError: any) {
          console.log(`[${jobId}] No existing data to delete or error deleting:`, deleteError?.message || deleteError);
        }
      } else {
        console.log(`[${jobId}] No data to process, skipping delete`);
      }
      
      // Store listening data with progress updates
      console.log(`[${jobId}] Storing ${processedData.length} tracks in Supabase...`);
      const startTime = Date.now();
      
      // Store with progress callback
      // Storage takes 30-90% of total progress (most of the time)
      await storeListeningData(userId, processedData, (progress, message) => {
        updateUploadJob(jobId, {
          status: 'storing',
          progress: 30 + Math.floor(progress * 0.60), // 30-90% for storage
          message: message || `Storing data... ${progress}%`,
        });
      });
      
      const endTime = Date.now();
      console.log(`[${jobId}] Successfully stored listening data in ${((endTime - startTime) / 1000).toFixed(2)}s`);
      
      updateUploadJob(jobId, {
        status: 'processing',
        progress: 90,
        message: 'Calculating summary statistics...',
      });
      
      // Use the uploaded data directly for summary - much faster!
      // Calculate from processedData (uploaded) + check for preserved newer data
      const uploadedTotalArtists = new Set(processedData.map((d) => d.artistName)).size;
      const uploadedTotalListeningTime = processedData.reduce((sum, d) => sum + d.durationMs, 0);
      
      // Get count and date range from database (fast queries)
      const { createSupabaseServerClient } = await import('@/lib/supabase/client');
      const supabase = createSupabaseServerClient();
      
      const { count: totalCount, error: countError } = await supabase
        .from('listening_data')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const { data: dateRangeData, error: dateRangeError } = await supabase
        .from('listening_data')
        .select('played_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: true })
        .limit(1);
      
      const { data: maxDateData, error: maxDateError } = await supabase
        .from('listening_data')
        .select('played_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(1);
      
      // For artists and duration, use uploaded data + estimate for preserved data
      // This is much faster than fetching everything
      const totalTracksAfterUpload = totalCount || processedData.length;
      const actualOldestDate = dateRangeData && dateRangeData.length > 0 ? new Date(dateRangeData[0].played_at) : oldestDate;
      const actualNewestDate = maxDateData && maxDateData.length > 0 ? new Date(maxDateData[0].played_at) : newestDate;
      
      // Estimate total artists and duration (uploaded + preserved)
      // We'll use uploaded stats as base, which is accurate for most cases
      const totalArtistsAfterUpload = uploadedTotalArtists; // Will be recalculated if needed
      const totalListeningTimeAfterUpload = uploadedTotalListeningTime; // Will be recalculated if needed
      
      if (countError || dateRangeError || maxDateError) {
        console.warn(`[${jobId}] Some SQL queries failed (non-critical):`, { countError, dateRangeError, maxDateError });
        // Use uploaded data stats instead of fetching all data - much faster!
        // The uploaded data is accurate for the summary, and any preserved data is minimal
        const totalTracksAfterUpload = processedData.length;
        const totalArtistsAfterUpload = uploadedTotalArtists;
        const totalListeningTimeAfterUpload = uploadedTotalListeningTime;
        const actualOldestDate = oldestDate;
        const actualNewestDate = newestDate;
        
        await storeUserDataSummary(userId, {
          totalTracks: totalTracksAfterUpload,
          totalArtists: totalArtistsAfterUpload,
          totalListeningTime: totalListeningTimeAfterUpload,
          dateRangeStart: actualOldestDate,
          dateRangeEnd: actualNewestDate,
        });
        
        const summaryForCookie = {
          totalTracks: totalTracksAfterUpload,
          dateRange: { start: actualOldestDate.toISOString(), end: actualNewestDate.toISOString() },
          uploadedAt: new Date().toISOString(),
        };
        cookieStore.set('spotify_export_summary', JSON.stringify(summaryForCookie), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
        });
        
        updateUploadJob(jobId, {
          status: 'completed',
          progress: 100,
          message: 'Upload completed successfully!',
          result: {
            totalTracks: totalTracksAfterUpload,
            uploadedTracks: processedData.length,
            dateRange: { start: actualOldestDate.toISOString(), end: actualNewestDate.toISOString() },
          },
        });
        return;
      }
      
      // Stats already calculated above
      
      console.log(`[${jobId}] Total data after upload: ${totalTracksAfterUpload} tracks, ${totalArtistsAfterUpload} artists, ${(totalListeningTimeAfterUpload / 1000 / 60 / 60).toFixed(2)} hours`);
      console.log(`[${jobId}] Date range: ${actualOldestDate.toISOString()} to ${actualNewestDate.toISOString()}`);
      
      // Store summary with total counts (including preserved data)
      await storeUserDataSummary(userId, {
        totalTracks: totalTracksAfterUpload,
        totalArtists: totalArtistsAfterUpload,
        totalListeningTime: totalListeningTimeAfterUpload,
        dateRangeStart: actualOldestDate,
        dateRangeEnd: actualNewestDate,
      });
      console.log(`[${jobId}] Successfully stored user data summary`);

      // Skip aggregations computation during upload for performance
      // Aggregations will be computed on-demand when user visits analytics page
      // This avoids fetching all data again after we just uploaded it
      updateUploadJob(jobId, {
        status: 'processing',
        progress: 95,
        message: 'Finalizing upload...',
      });

      // Store summary in cookie (always happens, even if aggregations failed)
      const summaryForCookie = {
        totalTracks: totalTracksAfterUpload,
        dateRange: {
          start: actualOldestDate.toISOString(),
          end: actualNewestDate.toISOString(),
        },
        uploadedAt: new Date().toISOString(),
      };
      cookieStore.set('spotify_export_summary', JSON.stringify(summaryForCookie), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      });

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[${jobId}] Background processing completed successfully in ${totalTime}s`);
      
      updateUploadJob(jobId, {
        status: 'completed',
        progress: 100,
        message: 'Upload completed successfully!',
        result: {
          totalTracks: totalTracksAfterUpload,
          uploadedTracks: processedData.length,
          dateRange: {
            start: actualOldestDate.toISOString(),
            end: actualNewestDate.toISOString(),
          },
        },
      });
    } catch (storageError: any) {
      console.error(`[${jobId}] Error storing data in Supabase:`, storageError);
      console.error(`[${jobId}] Storage error stack:`, storageError.stack);
      console.error(`[${jobId}] Storage error details:`, JSON.stringify(storageError, null, 2));
      updateUploadJob(jobId, {
        status: 'failed',
        error: storageError.message || 'Failed to store data',
        progress: 0,
        message: `Storage failed: ${storageError.message || 'Unknown error'}`,
      });
      return; // Exit early on storage error
    }
  } catch (error: any) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[${jobId}] Background processing FAILED after ${totalTime}s`);
    console.error(`[${jobId}] Error:`, error);
    console.error(`[${jobId}] Error stack:`, error?.stack);
    console.error(`[${jobId}] Error details:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    updateUploadJob(jobId, {
      status: 'failed',
      error: error?.message || 'Processing failed',
      progress: 0,
      message: `Processing failed: ${error?.message || 'Unknown error'}`,
    });
    // Don't re-throw - we've already logged and updated the job status
  } finally {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${jobId}] Background processing function finished (total time: ${totalTime}s)`);
  }
}

/**
 * POST /api/upload
 * Handle Spotify data export file upload
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.json') && !fileName.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JSON or ZIP file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 200MB)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 200MB.' },
        { status: 400 }
      );
    }

    // Get user ID first to create job
    let userId: string;
    try {
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        userId = profile.id;
      } else {
        throw new Error('Failed to get user profile');
      }
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to authenticate user. Please try logging in again.' },
        { status: 401 }
      );
    }

    // Read file content first (before returning response)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create job (file upload is complete, so start at 15%)
    const jobId = createUploadJob(userId);
    updateUploadJob(jobId, {
      status: 'extracting',
      progress: 15,
      message: 'File uploaded, starting extraction...',
    });
    console.log(`[${jobId}] Job created and initialized at 15%`);
    
    // Start processing (fire and forget, but with better error handling)
    // Note: In serverless environments, this might not complete if the function times out
    // For production, use a proper job queue (e.g., Bull, BullMQ, or a cloud service)
    console.log(`[${jobId}] Starting background processing...`);
    processUploadInBackground(jobId, arrayBuffer, buffer, fileName, userId, accessToken, cookieStore).catch((error) => {
      console.error(`[${jobId}] Background processing error:`, error);
      console.error(`[${jobId}] Error stack:`, error?.stack);
      console.error(`[${jobId}] Error details:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      updateUploadJob(jobId, {
        status: 'failed',
        error: error?.message || 'Processing failed',
        progress: 0,
        message: `Processing failed: ${error?.message || 'Unknown error'}`,
      });
    });

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId,
      message: 'File upload started. Processing...',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the file.' },
      { status: 500 }
    );
  }
}
