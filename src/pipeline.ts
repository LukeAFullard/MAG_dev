import { InferenceEngine } from './inference';
import { AutoClipExtractor, type ExtractedClip } from './utils/autoClip';

export type JobStatus = 'idle' | 'pass1' | 'pass2' | 'pass3' | 'completed' | 'error' | 'cancelled';

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
  private abortControllers: Map<string, AbortController> = new Map();
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

    // Process immediately.
    // If a file is provided, we should probably save it to OPFS *before* processing,
    // or pass the OPFS path around. For now, the App.tsx might handle OPFS saving
    // and then call this, or we can just process the File object directly in memory.
    // Given the architecture, processing the File object directly is fine for Pass 1 & 2.
    // The database saving happens at the end or in a different layer.

    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    // Start background processing without awaiting
    this.processJob(id, file, abortController.signal).catch(err => {
      if (err.name === 'AbortError') {
        this.updateJob(id, { status: 'cancelled', message: 'Processing Cancelled' });
      } else {
        this.updateJob(id, { status: 'error', message: err.message });
      }
    }).finally(() => {
        this.abortControllers.delete(id);
    });

    return id;
  }

  public cancelJob(jobId: string) {
      const abortController = this.abortControllers.get(jobId);
      if (abortController) {
          abortController.abort();
      }
  }

  private async processJob(jobId: string, file: File | undefined, signal: AbortSignal) {
    try {
      // Pass 1
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      this.updateJob(jobId, { status: 'pass1', progress: 0, message: 'Running Pass 1: Auto-Clip Extraction' });
      await this.pass1_autoClipExtraction(jobId, signal, file);

      // Pass 2
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      this.updateJob(jobId, { status: 'pass2', progress: 33, message: 'Running Pass 2: Full Pose & Depth Estimation' });
      await this.pass2_poseEstimation(jobId, signal, file);

      // Pass 3
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      this.updateJob(jobId, { status: 'pass3', progress: 66, message: 'Running Pass 3: Constraint Smoothing & Metrics' });
      await this.pass3_smoothingAndMetrics(jobId, signal);

      // Completed
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      this.updateJob(jobId, { status: 'completed', progress: 100, message: 'Processing Complete' });
    } catch (error: any) {
      if (error.name === 'AbortError') {
         throw error;
      }
      this.updateJob(jobId, { status: 'error', message: error.message || 'Unknown error during processing' });
    }
  }

  // Pass 1: Motion detection + auto-clip extraction (Fast)
  private async pass1_autoClipExtraction(jobId: string, signal: AbortSignal, file?: File): Promise<void> {
    if (!file) {
        throw new Error("A valid video file is required for processing.");
    }

    const extractor = new AutoClipExtractor();
    const clips = await extractor.process(file, (progress) => {
      if (signal.aborted) return;
      this.updateJob(jobId, { progress: Math.min(33, (progress / 100) * 33) });
    }, signal);

    if (!clips || clips.length === 0) {
        // We now handle this in autoClip.ts by providing a fallback full-video clip,
        // but just in case we hit this path, we can log a warning.
        console.warn("No clips returned from extraction.");
    }

    this.updateJob(jobId, { clips, progress: 33 });
  }

  // Pass 2: Full pose estimation per clip (Slow/Background)
  private async pass2_poseEstimation(jobId: string, signal: AbortSignal, file?: File): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.clips || job.clips.length === 0) {
       return; // Gracefully do nothing if there's no clips
    }
    if (!file) {
        throw new Error("A valid video file is required for Pass 2 processing.");
    }

    // imported at top to avoid bundle duplication
    const engine = InferenceEngine.getInstance();

    // Ensure inference engine is loaded and model is ready
    if (engine.status !== 'Ready') {
       await engine.init();
    }

    try {
        await engine.loadModel('pose-estimation', 'rtmw');
        await engine.loadModel('depth-estimation', 'onnx-community/depth-anything-v2-small');
    } catch (e: any) {
        console.warn('Could not load models in pipeline:', e);
    }

    const { PoseExtractor } = await import('./utils/poseExtraction');
    const { DepthExtractor } = await import('./utils/depthExtraction');
    const poseExtractor = new PoseExtractor();
    const depthExtractor = new DepthExtractor();
    const totalClips = job.clips.length;

    const clipsWithPoses: (ExtractedClip & { poses?: any[], depths?: any[] })[] = [];

    for (let i = 0; i < job.clips.length; i++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const clip = job.clips[i];
      try {
        // We can run pose and depth estimation sequentially or in parallel
        // Running sequentially to avoid memory overload in worker
        const poses = await poseExtractor.extract(file, clip, engine, (clipProgress) => {
          if (signal.aborted) return;
          const overallProgress = ((i + (clipProgress / 200)) / totalClips) * 100; // Half progress for pose
          this.updateJob(jobId, { progress: 33 + Math.min(33, (overallProgress / 100) * 33) });
        });
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const depths = await depthExtractor.extract(file, clip, engine, (clipProgress) => {
          if (signal.aborted) return;
          const overallProgress = ((i + 0.5 + (clipProgress / 200)) / totalClips) * 100; // Half progress for depth
          this.updateJob(jobId, { progress: 33 + Math.min(33, (overallProgress / 100) * 33) });
        });

        clipsWithPoses.push({ ...clip, poses, depths });
      } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        console.error(`Failed to extract data for clip ${clip.id}`, e);
        clipsWithPoses.push(clip);
      }
    }
    this.updateJob(jobId, { clips: clipsWithPoses, progress: 66 });
  }

  // Pass 3: Constraint engine smoothing + metric calculation
  private async pass3_smoothingAndMetrics(jobId: string, signal: AbortSignal): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.clips || job.clips.length === 0) {
      return;
    }

    const { LandingAnalyzer } = await import('./utils/landingAnalysis');
    const { TemporalSmoother } = await import('./utils/temporalSmoothing');
    const { ApparatusConstraints } = await import('./utils/apparatusConstraints');
    const { HumanBiomechanics } = await import('./utils/humanBiomechanics');
    const analyzer = new LandingAnalyzer();
    const smoother = new TemporalSmoother();
    const apparatusConstraints = new ApparatusConstraints();
    const biomechanics = new HumanBiomechanics();

    const updatedClips = [];
    for (const clip of job.clips) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const updatedClip = { ...clip };
      if (clip.poses && clip.poses.length > 0) {
        // Apply human biomechanical constraints first to ensure base anatomical realism
        let smoothedPoses = biomechanics.applyConstraints(clip.poses);

        // Apply temporal smoothing to the poses
        smoothedPoses = smoother.smoothPoses(smoothedPoses);

        // Apply apparatus-specific constraints
        smoothedPoses = apparatusConstraints.applyConstraints(smoothedPoses, clip.category, clip.facingCamera);

        updatedClip.poses = smoothedPoses;

        // Calculate metrics using the smoothed poses
        const metrics = analyzer.analyze(smoothedPoses);
        updatedClip.landingMetrics = { ...metrics, category: clip.category };
      } else {
        updatedClip.landingMetrics = { category: clip.category };
      }
      updatedClips.push(updatedClip);
    }

    this.updateJob(jobId, { clips: updatedClips, progress: 100 });
  }
}
