import { AutoClipExtractor, type ExtractedClip } from './utils/autoClip';

export type JobStatus = 'idle' | 'pass1' | 'pass2' | 'pass3' | 'completed' | 'error';

export interface VideoProcessingJob {
  id: string;
  filename: string;
  status: JobStatus;
  progress: number;
  message?: string;
  clips?: ExtractedClip[];
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

  public async startJob(filename: string, file?: File): Promise<string> {
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
    this.processJob(id, file).catch(err => {
      this.updateJob(id, { status: 'error', message: err.message });
    });

    return id;
  }

  private async processJob(jobId: string, file?: File) {
    try {
      // Pass 1
      this.updateJob(jobId, { status: 'pass1', progress: 0, message: 'Running Pass 1: Auto-Clip Extraction' });
      await this.pass1_autoClipExtraction(jobId, file);

      // Pass 2
    this.updateJob(jobId, { status: 'pass2', progress: 33, message: 'Running Pass 2: Full Pose & Depth Estimation' });
      await this.pass2_poseEstimation(jobId, file);

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
  private async pass1_autoClipExtraction(jobId: string, file?: File): Promise<void> {
    if (file) {
      const extractor = new AutoClipExtractor();
      const clips = await extractor.process(file, (progress) => {
        this.updateJob(jobId, { progress: Math.min(33, (progress / 100) * 33) });
      });
      this.updateJob(jobId, { clips, progress: 33 });
    } else {
      // Simulation mode
      return new Promise((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          this.updateJob(jobId, { progress: Math.min(33, (progress / 100) * 33) });
          if (progress >= 100) {
            clearInterval(interval);
            // Add some dummy clips for simulation
            const dummyClips: ExtractedClip[] = [
              {
                id: `clip_sim_1`, startTime: 1.5, endTime: 3.2, category: 'Vault', poses: [
                  { time: 1.5, keypoints: Array(17).fill({ x: 100, y: 100, score: 0.9 }) },
                  { time: 2.0, keypoints: Array(17).fill({ x: 100, y: 120, score: 0.9 }) }
                ]
              },
              {
                id: `clip_sim_2`, startTime: 5.0, endTime: 7.8, category: 'Floor', poses: [
                  { time: 5.0, keypoints: Array(17).fill({ x: 200, y: 200, score: 0.9 }) },
                  { time: 6.0, keypoints: Array(17).fill({ x: 200, y: 220, score: 0.9 }) }
                ]
              }
            ];
            this.updateJob(jobId, { clips: dummyClips, progress: 33 });
            resolve();
          }
        }, 100); // Simulate fast work
      });
    }
  }

  // Pass 2: Full pose estimation per clip (Slow/Background)
  private async pass2_poseEstimation(jobId: string, file?: File): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.clips || job.clips.length === 0) {
       // Just simulate if there's no actual clips
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

    const { InferenceEngine } = await import('./inference');
    const engine = InferenceEngine.getInstance();

    // Ensure inference engine is loaded and model is ready
    if (engine.status !== 'Ready') {
       await engine.init();
    }

    try {
        await engine.loadModel('pose-estimation', 'rtmw');
        await engine.loadModel('depth-estimation', 'onnx-community/depth-anything-v2-small');
    } catch (e: any) {
        console.warn('Could not load models in pipeline simulation:', e);
    }

    if (file) {
      const { PoseExtractor } = await import('./utils/poseExtraction');
      const { DepthExtractor } = await import('./utils/depthExtraction');
      const poseExtractor = new PoseExtractor();
      const depthExtractor = new DepthExtractor();
      const totalClips = job.clips.length;

      const clipsWithPoses: (ExtractedClip & { poses?: any[], depths?: any[] })[] = [];

      for (let i = 0; i < job.clips.length; i++) {
        const clip = job.clips[i];
        try {
          // We can run pose and depth estimation sequentially or in parallel
          // Running sequentially to avoid memory overload in worker
          const poses = await poseExtractor.extract(file, clip, engine, (clipProgress) => {
            const overallProgress = ((i + (clipProgress / 200)) / totalClips) * 100; // Half progress for pose
            this.updateJob(jobId, { progress: 33 + Math.min(33, (overallProgress / 100) * 33) });
          });

          const depths = await depthExtractor.extract(file, clip, engine, (clipProgress) => {
            const overallProgress = ((i + 0.5 + (clipProgress / 200)) / totalClips) * 100; // Half progress for depth
            this.updateJob(jobId, { progress: 33 + Math.min(33, (overallProgress / 100) * 33) });
          });

          clipsWithPoses.push({ ...clip, poses, depths });
        } catch (e) {
          console.error(`Failed to extract data for clip ${clip.id}`, e);
          clipsWithPoses.push(clip);
        }
      }
      this.updateJob(jobId, { clips: clipsWithPoses, progress: 66 });
    } else {
      // Simulation mode
      const totalClips = job.clips.length;
      let completedClips = 0;

      for (let i = 0; i < job.clips.length; i++) {
          // Mock processing time for the clip
          await new Promise(resolve => setTimeout(resolve, 1000));
          completedClips++;
          const currentProgress = (completedClips / totalClips) * 100;
          this.updateJob(jobId, { progress: 33 + Math.min(33, (currentProgress / 100) * 33) });
      }
    }
  }

  // Pass 3: Constraint engine smoothing + metric calculation
  private async pass3_smoothingAndMetrics(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.clips || job.clips.length === 0) {
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

    const { LandingAnalyzer } = await import('./utils/landingAnalysis');
    const { TemporalSmoother } = await import('./utils/temporalSmoothing');
    const { ApparatusConstraints } = await import('./utils/apparatusConstraints');
    const analyzer = new LandingAnalyzer();
    const smoother = new TemporalSmoother();
    const constraints = new ApparatusConstraints();

    const updatedClips = job.clips.map(clip => {
      let updatedClip = { ...clip };
      if (clip.poses && clip.poses.length > 0) {
        // Apply temporal smoothing to the poses
        let smoothedPoses = smoother.smoothPoses(clip.poses);

        // Apply apparatus-specific constraints
        smoothedPoses = constraints.applyConstraints(smoothedPoses, clip.category, clip.facingCamera);

        updatedClip.poses = smoothedPoses;

        // Calculate metrics using the smoothed poses
        const metrics = analyzer.analyze(smoothedPoses);
        updatedClip.landingMetrics = metrics;
      }
      return updatedClip;
    });

    this.updateJob(jobId, { clips: updatedClips, progress: 100 });
  }
}
