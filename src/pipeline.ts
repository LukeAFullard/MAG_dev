export type JobStatus = 'idle' | 'pass1' | 'pass2' | 'pass3' | 'completed' | 'error';

export interface VideoProcessingJob {
  id: string;
  filename: string;
  status: JobStatus;
  progress: number;
  message?: string;
}

type JobUpdateCallback = (job: VideoProcessingJob) => void;

export class PipelineManager {
  private static instance: PipelineManager;
  private jobs: Map<string, VideoProcessingJob> = new Map();
  private onJobUpdate?: JobUpdateCallback;

  private constructor() {}

  public static getInstance(): PipelineManager {
    if (!PipelineManager.instance) {
      PipelineManager.instance = new PipelineManager();
    }
    return PipelineManager.instance;
  }

  public setOnJobUpdate(callback: JobUpdateCallback) {
    this.onJobUpdate = callback;
  }

  private updateJob(jobId: string, updates: Partial<VideoProcessingJob>) {
    const job = this.jobs.get(jobId);
    if (job) {
      const updatedJob = { ...job, ...updates };
      this.jobs.set(jobId, updatedJob);
      if (this.onJobUpdate) {
        this.onJobUpdate(updatedJob);
      }
    }
  }

  public getJob(jobId: string): VideoProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): VideoProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  public async startJob(filename: string): Promise<string> {
    const id = `job_${Date.now()}`;
    const newJob: VideoProcessingJob = {
      id,
      filename,
      status: 'idle',
      progress: 0,
      message: 'Initialized'
    };
    this.jobs.set(id, newJob);
    if (this.onJobUpdate) {
      this.onJobUpdate(newJob);
    }

    // Start background processing without awaiting
    this.processJob(id).catch(err => {
      this.updateJob(id, { status: 'error', message: err.message });
    });

    return id;
  }

  private async processJob(jobId: string) {
    try {
      // Pass 1
      this.updateJob(jobId, { status: 'pass1', progress: 0, message: 'Running Pass 1: Auto-Clip Extraction' });
      await this.pass1_autoClipExtraction(jobId);

      // Pass 2
      this.updateJob(jobId, { status: 'pass2', progress: 33, message: 'Running Pass 2: Full Pose Estimation' });
      await this.pass2_poseEstimation(jobId);

      // Pass 3
      this.updateJob(jobId, { status: 'pass3', progress: 66, message: 'Running Pass 3: Constraint Smoothing & Metrics' });
      await this.pass3_smoothingAndMetrics(jobId);

      // Completed
      this.updateJob(jobId, { status: 'completed', progress: 100, message: 'Processing Complete' });
    } catch (error: any) {
      this.updateJob(jobId, { status: 'error', message: error.message || 'Unknown error during processing' });
    }
  }

  // Pass 1: Motion detection + auto-clip extraction (Fast)
  private async pass1_autoClipExtraction(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        this.updateJob(jobId, { progress: Math.min(33, (progress / 100) * 33) });
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 100); // Simulate fast work
    });
  }

  // Pass 2: Full pose estimation per clip (Slow/Background)
  private async pass2_poseEstimation(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        this.updateJob(jobId, { progress: 33 + Math.min(33, (progress / 100) * 33) });
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200); // Simulate slow work
    });
  }

  // Pass 3: Constraint engine smoothing + metric calculation
  private async pass3_smoothingAndMetrics(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        this.updateJob(jobId, { progress: 66 + Math.min(34, (progress / 100) * 34) });
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 150); // Simulate medium work
    });
  }
}
