import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

export class InferenceEngine {
  private static instance: InferenceEngine;
  private worker: Worker;
  private poseDetectors: Map<string, poseDetection.PoseDetector> = new Map();
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
    if (task === "pose-estimation") {
      const key = `${task}-${model}`;
      if (!this.poseDetectors.has(key)) {
        if (onProgress)
          onProgress({
            status: "loading",
            message: `Loading ${model} pose detector...`,
          });

        let detector;
        if (model === "movenet") {
          const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER };
          detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        } else if (model === "blazepose") {
          const detectorConfig = {
            runtime: 'mediapipe' as const,
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
            modelType: 'heavy'
          };
          detector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, detectorConfig);
        } else {
          throw new Error(`Unsupported pose model: ${model}`);
        }

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
    if (task === "pose-estimation") {
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
        results = await detector.estimatePoses(canvas);
      } else if (input instanceof ImageData) {
        results = await detector.estimatePoses(input);
      } else if (input instanceof HTMLCanvasElement || input instanceof HTMLVideoElement || input instanceof HTMLImageElement) {
        results = await detector.estimatePoses(input);
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
