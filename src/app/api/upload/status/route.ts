import { NextRequest, NextResponse } from 'next/server';
import { getUploadJob } from '@/lib/jobs/upload-job';
import { cookies } from 'next/headers';

/**
 * GET /api/upload/status?jobId=xxx
 * Get upload job status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = getUploadJob(jobId);

    // If job found, return it
    if (job) {
      return NextResponse.json(job);
    }

    // Job not found - might be processing in background or server restarted
    // Check if we can infer status from job ID timestamp
    const jobIdParts = jobId.split('-');
    if (jobIdParts.length >= 2) {
      const timestamp = parseInt(jobIdParts[jobIdParts.length - 1]);
      const age = Date.now() - timestamp;
      const ageMinutes = age / 1000 / 60;

      // If job is less than 15 minutes old, assume it's still processing
      if (ageMinutes < 15) {
        // Try to get user ID from job ID
        const userId = jobIdParts.slice(0, -1).join('-');
        
        // Check if data exists (upload might have completed)
        try {
          const cookieStore = await cookies();
          const summaryCookie = cookieStore.get('spotify_export_summary');
          
          if (summaryCookie?.value) {
            // Upload completed, return completed status
            return NextResponse.json({
              id: jobId,
              status: 'completed',
              progress: 100,
              message: 'Upload completed successfully!',
              result: JSON.parse(summaryCookie.value),
            });
          }
        } catch (err) {
          // Ignore errors
        }

        // Estimate progress based on time elapsed (rough estimate)
        // Most uploads take 2-5 minutes for large files
        const estimatedProgress = Math.min(95, Math.floor((ageMinutes / 5) * 100));
        
        return NextResponse.json({
          id: jobId,
          status: 'storing',
          progress: estimatedProgress,
          message: 'Processing in background... This may take a few minutes for large files.',
        });
      }
    }

    // Job not found and too old, return 404
    return NextResponse.json(
      { error: 'Job not found or expired' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

