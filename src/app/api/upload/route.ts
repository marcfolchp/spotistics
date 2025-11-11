import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseSpotifyExport, convertExportToProcessed } from '@/lib/data-processing/export';
import { extractJsonFromZip } from '@/lib/utils/zip';
import { storeListeningData, storeUserDataSummary, deleteUserListeningData } from '@/lib/supabase/storage';
import { createUploadJob, updateUploadJob } from '@/lib/jobs/upload-job';
import { storeAllAggregations, deleteUserAggregations } from '@/lib/supabase/aggregations-storage';
import {
  aggregateByDate,
  getTimePatterns,
  getDayPatterns,
  getTopTracks,
  getTopArtists,
} from '@/lib/data-processing/aggregate';

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
    updateUploadJob(jobId, {
      status: 'extracting',
      progress: 10,
      message: 'Extracting files from ZIP...',
    });

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
      progress: 40,
      message: `Processing ${exportTracks.length} tracks...`,
    });

    // Process the Spotify export data
    console.log(`Processing ${exportTracks.length} export tracks...`);
    const processedData = convertExportToProcessed(exportTracks);
    console.log(`Processed ${processedData.length} tracks (filtered out ${exportTracks.length - processedData.length} with 0ms played)`);

    // Calculate date range
    const sortedByDate = [...processedData].sort((a, b) => 
      a.playedAt.getTime() - b.playedAt.getTime()
    );
    
    const oldestDate = sortedByDate.length > 0 ? sortedByDate[0].playedAt : new Date();
    const newestDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].playedAt : new Date();
    
    console.log(`Date range: ${oldestDate.toISOString()} to ${newestDate.toISOString()}`);

    const summary = {
      totalTracks: processedData.length,
      dateRange: {
        start: oldestDate.toISOString(),
        end: newestDate.toISOString(),
      },
      uploadedAt: new Date().toISOString(),
    };

    updateUploadJob(jobId, {
      status: 'storing',
      progress: 60,
      message: `Storing ${processedData.length} tracks in database...`,
    });

    // Store data in Supabase
    try {
      console.log(`[${jobId}] Storing data for user ${userId}...`);
      
      // Delete existing data
      try {
        console.log(`[${jobId}] Deleting existing data for user ${userId}...`);
        await deleteUserListeningData(userId);
        console.log(`[${jobId}] Deleted existing data for user`);
      } catch (deleteError: any) {
        console.log(`[${jobId}] No existing data to delete or error deleting:`, deleteError?.message || deleteError);
      }
      
      // Store listening data with progress updates
      console.log(`[${jobId}] Storing ${processedData.length} tracks in Supabase...`);
      const startTime = Date.now();
      
      // Store with progress callback
      await storeListeningData(userId, processedData, (progress, message) => {
        updateUploadJob(jobId, {
          status: 'storing',
          progress: 60 + Math.floor(progress * 0.15), // 60-75% for storage
          message: message || `Storing data... ${progress}%`,
        });
      });
      
      const endTime = Date.now();
      console.log(`[${jobId}] Successfully stored listening data in ${((endTime - startTime) / 1000).toFixed(2)}s`);
      
      // Verify data was stored
      updateUploadJob(jobId, {
        status: 'storing',
        progress: 75,
        message: 'Verifying data storage...',
      });
      
      try {
        const { getListeningData } = await import('@/lib/supabase/storage');
        // Wait a moment for database to commit
        await new Promise(resolve => setTimeout(resolve, 1000));
        const storedCount = await getListeningData(userId, 1);
        if (storedCount.length === 0 && processedData.length > 0) {
          console.error(`[${jobId}] Verification failed: Expected ${processedData.length} tracks but found 0`);
          throw new Error('Data storage verification failed: No data found after storage. The data may not have been saved correctly.');
        }
        console.log(`[${jobId}] Verified: ${storedCount.length} record(s) found in database (sample check)`);
      } catch (verifyError: any) {
        console.error(`[${jobId}] Verification error:`, verifyError);
        console.error(`[${jobId}] Verification error stack:`, verifyError?.stack);
        throw new Error(`Storage verification failed: ${verifyError.message}`);
      }
      
      // Calculate summary statistics
      const totalArtists = new Set(processedData.map((d) => d.artistName)).size;
      const totalListeningTime = processedData.reduce((sum, d) => sum + d.durationMs, 0);
      
      console.log(`[${jobId}] Summary: ${processedData.length} tracks, ${totalArtists} artists, ${(totalListeningTime / 1000 / 60 / 60).toFixed(2)} hours of listening`);
      
      // Store summary
      console.log(`[${jobId}] Storing user data summary...`);
      await storeUserDataSummary(userId, {
        totalTracks: processedData.length,
        totalArtists: totalArtists,
        totalListeningTime: totalListeningTime,
        dateRangeStart: oldestDate,
        dateRangeEnd: newestDate,
      });
      console.log(`[${jobId}] Successfully stored user data summary`);

      updateUploadJob(jobId, {
        status: 'processing',
        progress: 80,
        message: 'Computing analytics aggregations...',
      });

      // Compute and store aggregations for fast analytics
      console.log('Computing aggregations...');
      const dateFrequencyDay = aggregateByDate(processedData, 'day');
      const dateFrequencyMonth = aggregateByDate(processedData, 'month');
      const dateFrequencyYear = aggregateByDate(processedData, 'year');
      const timePatterns = getTimePatterns(processedData);
      const dayPatterns = getDayPatterns(processedData);
      const topTracks = getTopTracks(processedData, 50); // Store top 50 for flexibility
      const topArtists = getTopArtists(processedData, 50);

      // Delete old aggregations
      try {
        await deleteUserAggregations(userId);
      } catch (deleteError) {
        console.log('No existing aggregations to delete or error deleting:', deleteError);
      }

      // Store all aggregations
      await storeAllAggregations(userId, {
        dateFrequency: {
          day: dateFrequencyDay,
          month: dateFrequencyMonth,
          year: dateFrequencyYear,
        },
        timePattern: timePatterns,
        dayPattern: dayPatterns,
        topTracks: topTracks,
        topArtists: topArtists,
      });
      console.log('Successfully stored all aggregations');

      // Store summary in cookie
      cookieStore.set('spotify_export_summary', JSON.stringify(summary), {
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
          totalTracks: processedData.length,
          dateRange: summary.dateRange,
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

    // Create job
    const jobId = createUploadJob(userId);
    
    // Start processing (fire and forget, but with better error handling)
    // Note: In serverless environments, this might not complete if the function times out
    // For production, use a proper job queue (e.g., Bull, BullMQ, or a cloud service)
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
      message: 'File upload started. Processing in background...',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the file.' },
      { status: 500 }
    );
  }
}
