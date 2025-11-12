import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseSpotifyExport, convertExportToProcessed } from '@/lib/data-processing/export';
import { extractJsonFromZip } from '@/lib/utils/zip';
import { storeListeningData, storeUserDataSummary, deleteUserListeningDataUpToDate } from '@/lib/supabase/storage';

/**
 * POST /api/upload
 * Handle Spotify Extended Streaming History ZIP file upload
 * Optimized for sub-30 second processing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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

    // Get user ID
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
    if (!fileName.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a ZIP file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB for Extended Streaming History)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    console.log(`[Upload] Starting upload for user ${userId}, file: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[Upload] File read in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    // Extract JSON files from ZIP (handles "Spotify Extended Streaming History" folder)
    console.log(`[Upload] Extracting JSON files from ZIP...`);
    const extractStart = Date.now();
    let exportTracks: any[] = [];
    
    try {
      exportTracks = await extractJsonFromZip(arrayBuffer);
      console.log(`[Upload] Extracted ${exportTracks.length} tracks in ${((Date.now() - extractStart) / 1000).toFixed(2)}s`);
      
      if (exportTracks.length === 0) {
        return NextResponse.json(
          { error: 'No valid streaming history data found in ZIP file. Please ensure the ZIP contains Spotify Extended Streaming History JSON files.' },
          { status: 400 }
        );
      }
    } catch (zipError: any) {
      console.error('[Upload] ZIP extraction error:', zipError);
      return NextResponse.json(
        { error: zipError.message || 'Failed to extract ZIP file. Please ensure it contains valid Spotify Extended Streaming History files.' },
        { status: 400 }
      );
    }

    // Process the Spotify export data
    console.log(`[Upload] Processing ${exportTracks.length} tracks...`);
    const processStart = Date.now();
    const processedData = convertExportToProcessed(exportTracks);
    console.log(`[Upload] Processed ${processedData.length} tracks (filtered ${exportTracks.length - processedData.length} with 0ms played) in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);

    if (processedData.length === 0) {
      return NextResponse.json(
        { error: 'No valid listening data found in the files. Please check your Spotify export.' },
        { status: 400 }
      );
    }

    // Find the latest date in the uploaded data (for deletion cutoff)
    let latestDate = new Date(0);
    for (const item of processedData) {
      if (item.playedAt > latestDate) {
        latestDate = item.playedAt;
      }
    }
    console.log(`[Upload] Latest date in uploaded data: ${latestDate.toISOString()}`);

    // Delete existing data up to (and including) the latest date from upload
    // This preserves any data newer than what's in the upload
    console.log(`[Upload] Deleting existing data up to ${latestDate.toISOString()}...`);
    const deleteStart = Date.now();
    try {
      await deleteUserListeningDataUpToDate(userId, latestDate);
      console.log(`[Upload] Deletion completed in ${((Date.now() - deleteStart) / 1000).toFixed(2)}s`);
    } catch (deleteError: any) {
      console.warn(`[Upload] Error deleting existing data (non-critical):`, deleteError?.message || deleteError);
      // Continue with upload even if deletion fails
    }

    // Store data in Supabase with progress tracking
    console.log(`[Upload] Storing ${processedData.length} tracks in database...`);
    const storeStart = Date.now();
    
    try {
      await storeListeningData(userId, processedData, (progress, message) => {
        // Progress callback for future use (could send via SSE or WebSocket)
        console.log(`[Upload] Storage progress: ${progress}% - ${message}`);
      });
      
      console.log(`[Upload] Storage completed in ${((Date.now() - storeStart) / 1000).toFixed(2)}s`);
    } catch (storageError: any) {
      console.error('[Upload] Error storing data:', storageError);
      return NextResponse.json(
        { error: storageError.message || 'Failed to store data in database' },
        { status: 500 }
      );
    }

    // Calculate summary statistics efficiently
    console.log(`[Upload] Calculating summary statistics...`);
    const summaryStart = Date.now();
    
    // Find date range efficiently (single pass)
    let oldestDate = latestDate;
    let newestDate = latestDate;
    let totalListeningTime = 0;
    const uniqueArtists = new Set<string>();
    
    for (const item of processedData) {
      if (item.playedAt < oldestDate) oldestDate = item.playedAt;
      if (item.playedAt > newestDate) newestDate = item.playedAt;
      totalListeningTime += item.durationMs;
      if (item.artistName) uniqueArtists.add(item.artistName);
    }
    
    // Get total count from database (fast query)
    const { createSupabaseServerClient } = await import('@/lib/supabase/client');
    const supabase = createSupabaseServerClient();
    
    const { count: totalCount, error: countError } = await supabase
      .from('listening_data')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    // Get actual date range from database (to include preserved newer data)
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
    
    const actualOldestDate = dateRangeData && dateRangeData.length > 0 
      ? new Date(dateRangeData[0].played_at) 
      : oldestDate;
    const actualNewestDate = maxDateData && maxDateData.length > 0 
      ? new Date(maxDateData[0].played_at) 
      : newestDate;
    
    // Store summary
    await storeUserDataSummary(userId, {
      totalTracks: totalCount || processedData.length,
      totalArtists: uniqueArtists.size,
      totalListeningTime: totalListeningTime,
      dateRangeStart: actualOldestDate,
      dateRangeEnd: actualNewestDate,
    });
    
    console.log(`[Upload] Summary calculated in ${((Date.now() - summaryStart) / 1000).toFixed(2)}s`);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Upload] Upload completed successfully in ${totalTime}s`);

    return NextResponse.json({
      success: true,
      message: 'Upload completed successfully!',
      stats: {
        tracksUploaded: processedData.length,
        totalTracks: totalCount || processedData.length,
        totalArtists: uniqueArtists.size,
        dateRange: {
          start: actualOldestDate.toISOString(),
          end: actualNewestDate.toISOString(),
        },
        processingTime: totalTime,
      },
    });
  } catch (error: any) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Upload] Upload failed after ${totalTime}s:`, error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing the file.' },
      { status: 500 }
    );
  }
}

