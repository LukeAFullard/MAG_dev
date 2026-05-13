import { pipeline, type PipelineType } from '@huggingface/transformers';

// Setup env to prevent local fetching if needed, we'll keep defaults for now
// env.allowLocalModels = false;

// We need to keep a reference to loaded pipelines
const pipelines = new Map<string, any>();

async function checkWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

let isWebGPUSupported = false;

// Main message handler
self.addEventListener('message', async (event) => {
  const { id, action, task, model, input } = event.data;

  try {
    if (action === 'check-support') {
      isWebGPUSupported = await checkWebGPU();
      self.postMessage({ id, status: 'success', data: { isWebGPUSupported } });
      return;
    }

    if (action === 'load') {
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
