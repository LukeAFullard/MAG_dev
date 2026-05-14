import { type ExtractedClip } from './autoClip';
import { type InferenceEngine } from '../inference';

export interface DepthData {
  time: number;
  depthMap: {
    width: number;
    height: number;
    data: number[];
  };
}

export class DepthExtractor {
  private fps = 5; // Can be lower than pose fps, just for relative stabilization

  public async extract(file: File, clip: ExtractedClip, engine: InferenceEngine, onProgress?: (progress: number) => void): Promise<DepthData[]> {
    return new Promise((resolve, reject) => {
      const depths: DepthData[] = [];
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        let currentTime = clip.startTime;
        const endTime = clip.endTime;
        const timeStep = 1 / this.fps;

        // Target width/height for depth estimation to save memory.
        // Often depth models accept 256x256 or similar, we scale it down to keep it fast
        const targetWidth = 256;
        const scale = targetWidth / video.videoWidth;
        const targetHeight = Math.floor(video.videoHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not get 2d context for depth extraction"));
          return;
        }

        const extractFrame = async () => {
          if (currentTime > endTime) {
            URL.revokeObjectURL(url);
            resolve(depths);
            return;
          }
          video.currentTime = currentTime;
        };

        video.onseeked = async () => {
          try {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const imageBitmap = await createImageBitmap(canvas);

            // Run inference
            // We use 'onnx-community/depth-anything-v2-small' as fallback to DA3 due to model type 'null' issue
            const results = await engine.runInference('depth-estimation', 'onnx-community/depth-anything-v2-small', imageBitmap, [imageBitmap]);

            if (results && results.data) {
              depths.push({
                time: Number(currentTime.toFixed(2)),
                depthMap: results
              });
            }

            if (onProgress) {
              const progress = ((currentTime - clip.startTime) / (endTime - clip.startTime)) * 100;
              onProgress(Math.min(100, Math.max(0, progress)));
            }

            currentTime += timeStep;
            extractFrame(); // Proceed to next frame
          } catch (e) {
             console.error('Error during depth extraction', e);
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
