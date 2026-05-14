export class InferenceEngine {
  private static instance: InferenceEngine;
  private worker: Worker;
  private messageCallbacks: Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void, onProgress?: (data: any) => void }>;
  private msgIdCounter: number = 0;

  public isWebGPUSupported: boolean = false;
  public status: 'Initializing' | 'Ready' | 'Error' = 'Initializing';

  private constructor() {
    this.messageCallbacks = new Map();
    // Initialize the Web Worker
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.addEventListener('message', (event) => {
      const { id, status, data, error } = event.data;
      const callbacks = this.messageCallbacks.get(id);

      if (!callbacks) return;

      if (status === 'success') {
        callbacks.resolve(data);
        this.messageCallbacks.delete(id);
      } else if (status === 'error') {
        callbacks.reject(new Error(error));
        this.messageCallbacks.delete(id);
      } else if (status === 'progress') {
        if (callbacks.onProgress) {
          callbacks.onProgress(data);
        }
      }
    });
  }

  public static getInstance(): InferenceEngine {
    if (!InferenceEngine.instance) {
      InferenceEngine.instance = new InferenceEngine();
    }
    return InferenceEngine.instance;
  }

  private postMessageAsync(action: string, payload: any, onProgress?: (data: any) => void, transfer?: Transferable[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${this.msgIdCounter++}`;
      this.messageCallbacks.set(id, { resolve, reject, onProgress });
      this.worker.postMessage({ id, action, ...payload }, transfer || []);
    });
  }

  public async init(): Promise<void> {
    try {
      const res = await this.postMessageAsync('check-support', {});
      this.isWebGPUSupported = res.isWebGPUSupported;
      this.status = 'Ready';
    } catch (e) {
      this.status = 'Error';
      throw e;
    }
  }

  public async loadModel(task: string, model: string, onProgress?: (data: any) => void): Promise<any> {
    return this.postMessageAsync('load', { task, model }, onProgress);
  }

  public async runInference(task: string, model: string, input: any, transfer?: Transferable[]): Promise<any> {
    return this.postMessageAsync('run', { task, model, input }, undefined, transfer);
  }
}
