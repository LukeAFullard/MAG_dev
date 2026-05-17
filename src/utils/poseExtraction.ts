import { type ExtractedClip } from './autoClip';
import { type InferenceEngine } from '../inference';

export interface PoseData {
  time: number;
  keypoints: any[]; // The raw keypoints array from rtmlib
  com?: { x: number, y: number }; // Center of Mass approximation
}

export class PoseExtractor {
  private fps = 10; // Number of frames per second to extract pose for

  public async extract(file: File, clip: ExtractedClip, engine: InferenceEngine, analysisMode: 'rtmpose-s' | 'rtmpose-m' | 'rtmpose-l', onProgress?: (progress: number) => void): Promise<PoseData[]> {
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

        // BlazePose processing is slower, so we drop FPS for it to maintain reasonable processing times.
        // Fast mode uses 10 FPS. Detailed uses 5 FPS.
        this.fps = analysisMode === 'rtmpose-s' ? 10 : 5;

        const timeStep = 1 / this.fps;

        // Target width/height for pose estimation to save memory.
        // Both MoveNet and BlazePose can handle larger, but keeping it reasonable saves compute.
        // Aggressively downsampling video frames to 256 degrades MoveNet detection fidelity too heavily on high-resolution aspect ratios.
        // The TensorFlow.js models automatically handle internal resizing, so we just need a reasonable canvas size
        // that preserves aspect ratio without eating up memory.
        const vidW = video.videoWidth || 640;
        const vidH = video.videoHeight || 640;

        // Calculate max dimension constraint while preserving aspect ratio
        const maxDim = 640;
        const scale = Math.min(maxDim / vidW, maxDim / vidH);
        const targetWidth = Math.floor(vidW * scale) || maxDim;
        const targetHeight = Math.floor(vidH * scale) || maxDim;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not get 2d context for pose extraction"));
          return;
        }

        let lastCOM: {x: number, y: number} | undefined = undefined;

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
            // Run inference
            const modelToUse = analysisMode;
            await engine.loadModel('pose-estimation', modelToUse);
            const results = await engine.runInference('pose-estimation', modelToUse, imageBitmap, [imageBitmap]);

            if (results && results.length > 0) {
              // Process all detected persons to find their COMs
              const personsWithCOM = results.map((person: any) => {
                const keypoints = person.keypoints || [];
                let com: {x: number, y: number} | undefined = undefined;
                if (keypoints.length > 0) {
                  // RTMPose uses COCO format:
                  // shoulders: 5, 6, hips: 11, 12
                  const ls = keypoints[5];
                  const rs = keypoints[6];
                  const lh = keypoints[11];
                  const rh = keypoints[12];

                  if (ls && rs && lh && rh && (ls.score || 1) > 0.3 && (rs.score || 1) > 0.3 && (lh.score || 1) > 0.3 && (rh.score || 1) > 0.3) {
                    com = {
                      x: (lh.x + rh.x) / 2,
                      y: (lh.y + rh.y) / 2
                    };
                  }
                }

                // RTMPose natively returns 17 keypoints in COCO format
                const mappedKeypoints = keypoints;

                return { person, keypoints: mappedKeypoints, com };
              });

              // Select the primary athlete
              let primaryAthlete = personsWithCOM[0]; // Default to first detected

              if (lastCOM) {
                // If we have a previous COM, find the person closest to it to maintain lock
                let minDistance = Infinity;
                for (const p of personsWithCOM) {
                  if (p.com) {
                    const dist = Math.sqrt(Math.pow(p.com.x - lastCOM.x, 2) + Math.pow(p.com.y - lastCOM.y, 2));
                    if (dist < minDistance) {
                      minDistance = dist;
                      primaryAthlete = p;
                    }
                  }
                }
                // If distance is too large (e.g. tracking lost or teleportation), fallback to largest bounding box or center
                // But simple Euclidean distance tracking is effective for primary subject lock
              } else {
                 // For the first frame, prefer the person closest to the center of the frame
                 let minCenterDist = Infinity;
                 const centerX = targetWidth / 2;
                 const centerY = targetHeight / 2;

                 for (const p of personsWithCOM) {
                     if (p.com) {
                         const dist = Math.sqrt(Math.pow(p.com.x - centerX, 2) + Math.pow(p.com.y - centerY, 2));
                         if (dist < minCenterDist) {
                             minCenterDist = dist;
                             primaryAthlete = p;
                         }
                     }
                 }
              }

              if (primaryAthlete.com) {
                 lastCOM = primaryAthlete.com;
              }

              // Normalize coordinates to a base width of 640
              const scaleFactor = 640 / targetWidth;
              const normalizedKeypoints = primaryAthlete.keypoints.map((kp: any) => {
                const scaledKp = {
                  ...kp,
                  x: kp.x * scaleFactor,
                  y: kp.y * scaleFactor
                };
                if (kp.z !== undefined) {
                  scaledKp.z = kp.z * scaleFactor;
                }
                return scaledKp;
              });

              const normalizedCom = primaryAthlete.com ? {
                x: primaryAthlete.com.x * scaleFactor,
                y: primaryAthlete.com.y * scaleFactor
              } : undefined;

              poses.push({
                time: Number(currentTime.toFixed(2)),
                keypoints: normalizedKeypoints,
                com: normalizedCom
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
