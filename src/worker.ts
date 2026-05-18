import {
  pipeline,
  type PipelineType,
  AutoModel,
  AutoImageProcessor,
  RawImage,
} from "@huggingface/transformers";

// We need to keep a reference to loaded pipelines and detectors
const pipelines = new Map<string, any>();

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
self.addEventListener("message", async (event) => {
  const { id, action, task, model, input } = event.data;

  try {
    if (action === "check-support") {
      isWebGPUSupported = await checkWebGPU();
      self.postMessage({ id, status: "success", data: { isWebGPUSupported } });
      return;
    }

    if (action === "load") {
      const key = `${task}-${model}`;
      if (!pipelines.has(key)) {
        self.postMessage({
          id,
          status: "progress",
          data: { status: "loading", message: `Loading model ${model}` },
        });

        const device = isWebGPUSupported ? "webgpu" : "wasm";

        if (task === "pose-estimation" && model.startsWith("vitpose-")) {
          // Load detector
          self.postMessage({ id, status: "progress", data: { status: "loading", message: `Loading person detector...` } });
          const detector = await pipeline('object-detection', 'Xenova/yolos-tiny', { device });

          // Load vitpose
          self.postMessage({ id, status: "progress", data: { status: "loading", message: `Loading ViTPose model...` } });
          const size = model.split('-')[1] || 'base';
          let vitposeId = `onnx-community/vitpose-base-simple`;
          if (size === "s") vitposeId = "onnx-community/vitpose-plus-small-ONNX";
          else if (size === "b") vitposeId = "onnx-community/vitpose-base-simple";
          else if (size === "l") vitposeId = "onnx-community/vitpose-plus-base-ONNX"; // large unsupported, fallback to base
          else if (size === "h") vitposeId = "onnx-community/vitpose-base-simple"; // huge has external data issue, fallback to base
          const vitposeModel = await AutoModel.from_pretrained(vitposeId, { device });
          const vitposeProcessor = await AutoImageProcessor.from_pretrained(vitposeId);

          pipelines.set(key, { type: 'vitpose', detector, model: vitposeModel, processor: vitposeProcessor });
        } else {
          const pipe = await pipeline(task as PipelineType, model, {
            device: device as any,
            progress_callback: (progress: any) => {
              self.postMessage({ id, status: "progress", data: progress });
            },
          });
          pipelines.set(key, pipe);
        }
      }
      self.postMessage({
        id,
        status: "success",
        data: { message: "Model loaded" },
      });
      return;
    }

    if (action === "run") {
      const key = `${task}-${model}`;
      if (!pipelines.has(key)) {
        throw new Error(`Pipeline ${key} not loaded. Please load it first.`);
      }

      const pipe = pipelines.get(key);

      if (task === "pose-estimation" && model.startsWith("vitpose-") && pipe.type === 'vitpose') {
         // input is expected to be ImageData
         const { width, height, data } = input;
         const rgbData = new Uint8Array(width * height * 3);
         for(let i=0; i<width*height; i++) {
             rgbData[i*3] = data[i*4];
             rgbData[i*3+1] = data[i*4+1];
             rgbData[i*3+2] = data[i*4+2];
         }
         const image = new RawImage(rgbData, width, height, 3);

         const detResults = await pipe.detector(image);
         const personBoxes = detResults.filter((r: any) => r.label === 'person').map((r: any) => [r.box.xmin, r.box.ymin, r.box.xmax, r.box.ymax]);
         if (personBoxes.length === 0) {
            personBoxes.push([0, 0, width, height]);
         }

         const inputs = await pipe.processor(image);
         const { heatmaps } = await pipe.model(inputs);
         const poseResults = pipe.processor.post_process_pose_estimation(heatmaps, [personBoxes])[0];

         const formattedResults = poseResults.map((person: any) => {
             const keypoints = person.keypoints.map((kp: any, i: number) => ({
                 x: kp[0],
                 y: kp[1],
                 score: person.scores[i],
                 z: 0
             }));
             const avgScore = person.scores.reduce((a: number, b: number) => a + b, 0) / person.scores.length;
             return { keypoints, score: avgScore };
         });

         self.postMessage({ id, status: "success", data: formattedResults });
         return;
      }

      const result = await pipe(input);
      self.postMessage({ id, status: "success", data: result });
      return;
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: any) {
    self.postMessage({ id, status: "error", error: error.message });
  }
});
