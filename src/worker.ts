import { pipeline, type PipelineType } from '@huggingface/transformers';
import { PoseDetector } from 'rtmlib-ts';

// We need to keep a reference to loaded pipelines and detectors
const pipelines = new Map<string, any>();
const detectors = new Map<string, PoseDetector>();

async function checkWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

let isWebGPUSupported = false;

// Main message handler
self.addEventListener('message', async (event) => {
  const { id, action, task, model, input, config } = event.data;

  try {
    if (action === 'check-support') {
      isWebGPUSupported = await checkWebGPU();
      self.postMessage({ id, status: 'success', data: { isWebGPUSupported } });
      return;
    }

    if (action === 'load') {
      if (task === 'pose-estimation' && model === 'rtmw') {
        const key = `${task}-${model}`;
        if (!detectors.has(key)) {
            self.postMessage({ id, status: 'progress', data: { status: 'loading', message: `Loading pose detector...` } });
            const device = isWebGPUSupported ? 'webgpu' : 'wasm';
            const detectorConfig: any = {
               backend: device,
               poseModel: 'https://huggingface.co/demon2233/rtmlib-ts/resolve/main/rtmpose/end2end.onnx',
               ...config
            };
            const detector = new PoseDetector(detectorConfig);
            await detector.init();
            detectors.set(key, detector);
        }
        self.postMessage({ id, status: 'success', data: { message: 'Pose detector loaded' } });
        return;
      }

      const key = `${task}-${model}`;
      if (!pipelines.has(key)) {
        self.postMessage({ id, status: 'progress', data: { status: 'loading', message: `Loading model ${model}` } });

        const device = isWebGPUSupported ? 'webgpu' : 'wasm';

        const pipe = await pipeline(task as PipelineType, model, {
          device: device as any,
          progress_callback: (progress: any) => {
             self.postMessage({ id, status: 'progress', data: progress });
          }
        });
        pipelines.set(key, pipe);
      }
      self.postMessage({ id, status: 'success', data: { message: 'Model loaded' } });
      return;
    }

    if (action === 'run') {
       if (task === 'pose-estimation' && model === 'rtmw') {
         const key = `${task}-${model}`;
         if (!detectors.has(key)) {
            throw new Error(`Pose detector ${key} not loaded. Please load it first.`);
         }
         const detector = detectors.get(key)!;
         // input could be an ImageData or ImageBitmap
         let results;
         if (input instanceof ImageBitmap) {
             results = await detector.detectFromBitmap(input);
         } else if (input instanceof ImageData) {
             results = await detector.detect(new Uint8Array(input.data.buffer), input.width, input.height);
         } else {
             throw new Error('Unsupported input type for pose estimation');
         }
         self.postMessage({ id, status: 'success', data: results });
         return;
       }


      const key = `${task}-${model}`;
      if (!pipelines.has(key)) {
        throw new Error(`Pipeline ${key} not loaded. Please load it first.`);
      }

      const pipe = pipelines.get(key);
      const result = await pipe(input);
      self.postMessage({ id, status: 'success', data: result });
      return;
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    self.postMessage({ id, status: 'error', error: error.message });
  }
});
