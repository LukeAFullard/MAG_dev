import { type ExtractedClip } from './autoClip';
import { type InferenceEngine } from '../inference';

export interface PoseData {
  time: number;
  keypoints: any[]; // The raw keypoints array from rtmlib
  com?: { x: number, y: number }; // Center of Mass approximation
}

export class PoseExtractor {
  private fps = 10; // Number of frames per second to extract pose for

  public async extract(file: File, clip: ExtractedClip, engine: InferenceEngine, onProgress?: (progress: number) => void): Promise<PoseData[]> {
    return new Promise((resolve, reject) => {
      const poses: PoseData[] = [];
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        let currentTime = clip.startTime;
        const endTime = clip.endTime;
        const timeStep = 1 / this.fps;

        // Target width/height for pose estimation to save memory
        const targetWidth = 640;
        const scale = targetWidth / video.videoWidth;
        const targetHeight = Math.floor(video.videoHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not get 2d context for pose extraction"));
          return;
        }

        const extractFrame = async () => {
          if (currentTime > endTime) {
            URL.revokeObjectURL(url);
            resolve(poses);
            return;
          }

          video.currentTime = currentTime;
        };

        video.onseeked = async () => {
          try {
            // Draw video frame to canvas to resize it
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

            // Get ImageBitmap from canvas to pass to worker
            // Use createImageBitmap to get a Transferable object that is faster to send to the worker
            const imageBitmap = await createImageBitmap(canvas);

            // Run inference
            const results = await engine.runInference('pose-estimation', 'rtmw', imageBitmap, [imageBitmap]);

            if (results && results.length > 0) {
              // Get the first person detected
              const person = results[0];
              const keypoints = person.keypoints || [];

              // Calculate rough Center of Mass (COM) using hips and shoulders
              let com: {x: number, y: number} | undefined = undefined;
              if (keypoints.length > 0) {
                // Approximate COM (usually around hips/pelvis in humans)
                // In COCO format (or RTMW which extends it):
                // 5: left shoulder, 6: right shoulder, 11: left hip, 12: right hip
                const ls = keypoints[5];
                const rs = keypoints[6];
                const lh = keypoints[11];
                const rh = keypoints[12];

                if (ls && rs && lh && rh &&
                    ls.score > 0.3 && rs.score > 0.3 && lh.score > 0.3 && rh.score > 0.3) {
                  // Average of hips is a reasonable COM proxy for simple 2D tracking
                  com = {
                    x: (lh.x + rh.x) / 2,
                    y: (lh.y + rh.y) / 2
                  };
                }
              }

              poses.push({
                time: Number(currentTime.toFixed(2)),
                keypoints,
                com
              });
            }

            if (onProgress) {
              const progress = ((currentTime - clip.startTime) / (endTime - clip.startTime)) * 100;
              onProgress(Math.min(100, Math.max(0, progress)));
            }

            currentTime += timeStep;
            extractFrame(); // Proceed to next frame
          } catch (e) {
             console.error('Error during frame extraction', e);
             URL.revokeObjectURL(url);
             reject(e);
          }
        };

        video.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };

        // Start processing
        extractFrame();
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
    });
  }
}
