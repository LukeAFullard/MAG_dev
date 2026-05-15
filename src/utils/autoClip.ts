import { type LandingMetrics } from './landingAnalysis';

export interface ExtractedClip {
  id: string;
  startTime: number;
  endTime: number;
  category: string;
  facingCamera?: boolean;
  poses?: any[]; // Keep flexible
  depths?: any[];
  landingMetrics?: LandingMetrics;
}

export class AutoClipExtractor {
  // Configurable thresholds
  private motionThreshold = 15; // Pixel difference threshold (0-255)
  private activityThreshold = 0.05; // Fraction of pixels that must change to count as 'active'
  private minClipDuration = 1.0; // Minimum clip length in seconds
  private preRoll = 0.5; // Seconds to add before motion start
  private postRoll = 0.5; // Seconds to add after motion end

  public async process(file: File, onProgress?: (progress: number) => void): Promise<ExtractedClip[]> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const width = 320; // Downscale for faster processing
        const height = (video.videoHeight / video.videoWidth) * width;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error("Could not get 2d context"));
          return;
        }

        let currentTime = 0;
        const fps = 10; // Sample 10 frames per second for motion
        const timeStep = 1 / fps;
        let prevImageData: ImageData | null = null;

        interface ActiveSegment {
            start: number;
            end: number;
        }
        const activeSegments: ActiveSegment[] = [];
        let currentSegment: ActiveSegment | null = null;
        let silenceDuration = 0; // Duration of silence since last motion

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, width, height);
          const currentImageData = ctx.getImageData(0, 0, width, height);

          if (prevImageData) {
             let changedPixels = 0;
             const totalPixels = width * height;

             // Simple frame differencing
             for (let i = 0; i < currentImageData.data.length; i += 4) {
                 const diffR = Math.abs(currentImageData.data[i] - prevImageData.data[i]);
                 const diffG = Math.abs(currentImageData.data[i+1] - prevImageData.data[i+1]);
                 const diffB = Math.abs(currentImageData.data[i+2] - prevImageData.data[i+2]);

                 // If the average color difference is above threshold
                 if ((diffR + diffG + diffB) / 3 > this.motionThreshold) {
                     changedPixels++;
                 }
             }

             const activityLevel = changedPixels / totalPixels;
             const isActive = activityLevel > this.activityThreshold;

             if (isActive) {
                 silenceDuration = 0;
                 if (!currentSegment) {
                     currentSegment = { start: Math.max(0, currentTime - this.preRoll), end: currentTime };
                 } else {
                     currentSegment.end = currentTime;
                 }
             } else {
                 if (currentSegment) {
                     silenceDuration += timeStep;
                     // If silence exceeds 1 second, close the segment
                     if (silenceDuration > 1.0) {
                         currentSegment.end += this.postRoll;
                         // Only keep segments longer than minimum duration
                         if (currentSegment.end - currentSegment.start >= this.minClipDuration) {
                             activeSegments.push(currentSegment);
                         }
                         currentSegment = null;
                     }
                 }
             }
          }

          prevImageData = currentImageData;

          if (onProgress) {
              onProgress((currentTime / duration) * 100);
          }

          currentTime += timeStep;
          if (currentTime <= duration) {
              video.currentTime = currentTime;
          } else {
              // Finalize last segment
              if (currentSegment) {
                  currentSegment.end += this.postRoll;
                  if (currentSegment.end - currentSegment.start >= this.minClipDuration) {
                      activeSegments.push(currentSegment);
                  }
              }

              URL.revokeObjectURL(url);

              // Convert to ExtractedClip array
              const clips: ExtractedClip[] = activeSegments.map((seg, idx) => ({
                  id: `clip_${Date.now()}_${idx}`,
                  startTime: Number(seg.start.toFixed(2)),
                  endTime: Number(Math.min(seg.end, duration).toFixed(2)),
                  category: 'Attempt' // Default category
              }));

              resolve(clips);
          }
        };

        video.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
        video.currentTime = currentTime; // Start the seek loop
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
    });
  }
}
