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

  // Chalk & Noise Filter configuration
  private backgroundAlpha = 0.1; // Learning rate for EMA background subtraction

  public async process(file: File, apparatus: string = 'Attempt', onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<ExtractedClip[]> {
    // Phase 1: Extract Audio Peaks for "thwack" detection (Audio-Visual Fusion)
    const audioPeaks = await this.extractAudioPeaks(file);

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');

      const handleAbort = () => {
          video.pause();
          video.removeAttribute('src');
          video.load();
          reject(new DOMException('Aborted', 'AbortError'));
      };

      if (signal) {
          if (signal.aborted) return handleAbort();
          signal.addEventListener('abort', handleAbort);
      }
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        let duration = video.duration;
        if (!isFinite(duration) || duration === 0) {
            // Android MediaRecorder often produces WebM files without duration metadata.
            // In these cases, we must seek to a large number to force the browser to compute it.
            video.currentTime = Number.MAX_SAFE_INTEGER;
            video.ondurationchange = () => {
                video.ondurationchange = null;
                duration = video.duration;
                video.currentTime = 0; // reset
                startProcessing(duration);
            };
            return;
        }

        startProcessing(duration);
      };

      const startProcessing = (duration: number) => {
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
        // Background array for Exponential Moving Average (EMA)
        let backgroundData: Float32Array | null = null;

        interface ActiveSegment {
            start: number;
            end: number;
        }
        const activeSegments: ActiveSegment[] = [];
        let currentSegment: ActiveSegment | null = null;
        let silenceDuration = 0; // Duration of silence since last motion

        video.onseeked = () => {
          if (signal?.aborted) return;
          ctx.drawImage(video, 0, 0, width, height);
          const currentImageData = ctx.getImageData(0, 0, width, height);
          const totalPixels = width * height;

          if (!backgroundData) {
            // Initialize background with the first frame
            backgroundData = new Float32Array(currentImageData.data.length);
            for (let i = 0; i < currentImageData.data.length; i++) {
              backgroundData[i] = currentImageData.data[i];
            }
          } else {
             let changedPixels = 0;

             // Dynamic Background Subtraction (EMA)
             for (let i = 0; i < currentImageData.data.length; i += 4) {
                 // Calculate difference from background model
                 const diffR = Math.abs(currentImageData.data[i] - backgroundData[i]);
                 const diffG = Math.abs(currentImageData.data[i+1] - backgroundData[i+1]);
                 const diffB = Math.abs(currentImageData.data[i+2] - backgroundData[i+2]);

                 // Update background model (EMA)
                 backgroundData[i] = backgroundData[i] * (1 - this.backgroundAlpha) + currentImageData.data[i] * this.backgroundAlpha;
                 backgroundData[i+1] = backgroundData[i+1] * (1 - this.backgroundAlpha) + currentImageData.data[i+1] * this.backgroundAlpha;
                 backgroundData[i+2] = backgroundData[i+2] * (1 - this.backgroundAlpha) + currentImageData.data[i+2] * this.backgroundAlpha;

                 // If the average color difference is above threshold
                 if ((diffR + diffG + diffB) / 3 > this.motionThreshold) {
                     changedPixels++;
                 }
             }

             const activityLevel = changedPixels / totalPixels;

             // Check if there is an audio peak near the current time
             const hasAudioPeak = audioPeaks.some(peakTime => Math.abs(peakTime - currentTime) < 0.5);

             // Boost activity threshold if there's an audio peak, helping clip detection
             const adjustedThreshold = hasAudioPeak ? this.activityThreshold * 0.5 : this.activityThreshold;
             const isActive = activityLevel > adjustedThreshold;

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
              let clips: ExtractedClip[] = activeSegments.map((seg, idx) => ({
                  id: `clip_${Date.now()}_${idx}`,
                  startTime: Number(seg.start.toFixed(2)),
                  endTime: Number(Math.min(seg.end, duration).toFixed(2)),
                  category: apparatus
              }));

              // If no clips were found, we fallback to one clip for the whole video
              // so that the processing pipeline does not completely fail
              if (clips.length === 0) {
                  clips = [{
                      id: `clip_${Date.now()}_fallback`,
                      startTime: 0,
                      endTime: Number(duration.toFixed(2)),
                      category: apparatus
                  }];
              }

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

      // Cleanup listener when done
      const cleanup = () => {
          if (signal) {
              signal.removeEventListener('abort', handleAbort);
          }
      };

      // Monkey patch resolve to cleanup
      const originalResolve = resolve;
      resolve = (val) => {
          cleanup();
          originalResolve(val);
      };

      const originalReject = reject;
      reject = (val) => {
          cleanup();
          originalReject(val);
      }
    });
  }

  /**
   * Analyzes the audio track of the video file to detect loud peaks (thwacks).
   */
  private async extractAudioPeaks(file: File): Promise<number[]> {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0); // Use first channel
      const sampleRate = audioBuffer.sampleRate;

      const peaks: number[] = [];
      const windowSize = Math.floor(sampleRate * 0.1); // 100ms window

      let maxAmplitude = 0;
      for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) > maxAmplitude) {
          maxAmplitude = Math.abs(channelData[i]);
        }
      }

      // Threshold is 80% of max amplitude, but at least 0.1
      const peakThreshold = Math.max(0.1, maxAmplitude * 0.8);

      let lastPeakTime = -1;

      for (let i = 0; i < channelData.length; i += windowSize) {
        let windowMax = 0;
        const end = Math.min(i + windowSize, channelData.length);
        for (let j = i; j < end; j++) {
          if (Math.abs(channelData[j]) > windowMax) {
            windowMax = Math.abs(channelData[j]);
          }
        }

        if (windowMax > peakThreshold) {
          const time = i / sampleRate;
          // Ensure we don't cluster peaks too closely (min 1s apart)
          if (time - lastPeakTime > 1.0) {
            peaks.push(time);
            lastPeakTime = time;
          }
        }
      }

      return peaks;
    } catch (e) {
      console.warn("Could not extract audio peaks, falling back to visual only", e);
      return [];
    }
  }
}
