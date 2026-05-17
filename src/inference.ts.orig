import { PoseDetector } from "rtmlib-ts";

export class InferenceEngine {
  private static instance: InferenceEngine;
  private worker: Worker;
  private poseDetectors: Map<string, PoseDetector> = new Map();
  private messageCallbacks: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
      onProgress?: (data: any) => void;
    }
  >;
  private msgIdCounter: number = 0;

  public isWebGPUSupported: boolean = false;
  public status: "Initializing" | "Ready" | "Error" = "Initializing";

  private constructor() {
    this.messageCallbacks = new Map();
    // Initialize the Web Worker
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", (event) => {
      const { id, status, data, error } = event.data;
      const callbacks = this.messageCallbacks.get(id);

      if (!callbacks) return;

      if (status === "success") {
        callbacks.resolve(data);
        this.messageCallbacks.delete(id);
      } else if (status === "error") {
        callbacks.reject(new Error(error));
        this.messageCallbacks.delete(id);
      } else if (status === "progress") {
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

  private postMessageAsync(
    action: string,
    payload: any,
    onProgress?: (data: any) => void,
    transfer?: Transferable[],
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${this.msgIdCounter++}`;
      this.messageCallbacks.set(id, { resolve, reject, onProgress });
      this.worker.postMessage({ id, action, ...payload }, transfer || []);
    });
  }

  public async init(): Promise<void> {
    try {
      const res = await this.postMessageAsync("check-support", {});
      this.isWebGPUSupported = res.isWebGPUSupported;
      this.status = "Ready";
    } catch (e) {
      this.status = "Error";
      throw e;
    }
  }

  public async loadModel(
    task: string,
    model: string,
    onProgress?: (data: any) => void,
  ): Promise<any> {
    if (task === "pose-estimation" && model === "rtmw") {
      const key = `${task}-${model}`;
      if (!this.poseDetectors.has(key)) {
        if (onProgress)
          onProgress({
            status: "loading",
            message: `Loading pose detector...`,
          });
        const device = this.isWebGPUSupported ? "webgpu" : "wasm";
        const detectorConfig: any = {
          backend: device,
          poseModel:
            "https://huggingface.co/demon2233/rtmlib-ts/resolve/main/rtmpose/end2end.onnx",
        };
        const detector = new PoseDetector(detectorConfig);
        await detector.init();
        this.poseDetectors.set(key, detector);
      }
      return { message: "Pose detector loaded" };
    }
    return this.postMessageAsync("load", { task, model }, onProgress);
  }

  public async runInference(
    task: string,
    model: string,
    input: any,
    transfer?: Transferable[],
  ): Promise<any> {
    if (task === "pose-estimation" && model === "rtmw") {
      const key = `${task}-${model}`;
      const detector = this.poseDetectors.get(key);
      if (!detector)
        throw new Error(
          `Pose detector ${key} not loaded. Please load it first.`,
        );

      let results;
      if (input instanceof ImageBitmap) {
        const width = input.width;
        const height = input.height;
        if (width === 0 || height === 0) {
          console.warn("Skipping pose detection for zero-dimension image.");
          input.close();
          return [];
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx)
          throw new Error("Could not get 2d context for pose detection");
        ctx.drawImage(input, 0, 0);
        input.close(); // Clean up ImageBitmap to prevent memory leaks
        const imageData = ctx.getImageData(0, 0, width, height);
        results = await detector.detect(
          new Uint8Array(imageData.data.buffer),
          width,
          height,
        );
      } else if (input instanceof ImageData) {
        results = await detector.detect(
          new Uint8Array(input.data.buffer),
          input.width,
          input.height,
        );
      } else {
        throw new Error("Unsupported input type for pose estimation");
      }
      return results;
    }
    return this.postMessageAsync(
      "run",
      { task, model, input },
      undefined,
      transfer,
    );
  }
}
