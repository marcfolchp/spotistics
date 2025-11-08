// Simple in-memory job store for upload processing
// In production, use Redis or a proper job queue

interface UploadJob {
  id: string;
  status: 'pending' | 'extracting' | 'processing' | 'storing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: any;
  error?: string;
  createdAt: Date;
}

const jobs = new Map<string, UploadJob>();

export function createUploadJob(userId: string): string {
  const jobId = `${userId}-${Date.now()}`;
  jobs.set(jobId, {
    id: jobId,
    status: 'pending',
    progress: 0,
    message: 'Job created',
    createdAt: new Date(),
  });
  
  // Clean up old jobs (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt.getTime() < oneHourAgo) {
      jobs.delete(id);
    }
  }
  
  return jobId;
}

export function getUploadJob(jobId: string): UploadJob | null {
  return jobs.get(jobId) || null;
}

export function updateUploadJob(
  jobId: string,
  updates: Partial<Pick<UploadJob, 'status' | 'progress' | 'message' | 'result' | 'error'>>
): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    jobs.set(jobId, job);
  }
}

export function deleteUploadJob(jobId: string): void {
  jobs.delete(jobId);
}

