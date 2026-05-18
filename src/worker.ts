import * as ort from 'onnxruntime-web';
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

        if (task === "pose-estimation" && model === "instanthmr") {
          // Load detector
          self.postMessage({ id, status: "progress", data: { status: "loading", message: `Loading person detector...` } });
          const detector = await pipeline('object-detection', 'Xenova/yolos-tiny', { device });

          // Load InstantHMR via onnxruntime-web
          self.postMessage({ id, status: "progress", data: { status: "loading", message: `Loading InstantHMR model...` } });
          const executionProviders = isWebGPUSupported ? ['webgpu', 'wasm'] : ['wasm'];
          const session = await ort.InferenceSession.create('https://huggingface.co/momolesang/InstantHMR/resolve/main/instanthmr.onnx', { executionProviders });

          pipelines.set(key, { type: 'instanthmr', detector, session });
        } else if (task === "pose-estimation" && model.startsWith("vitpose-")) {
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

      if (task === "pose-estimation" && model === "instanthmr" && pipe.type === 'instanthmr') {
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

         const formattedResults = [];

         for (const bbox of personBoxes) {
             const [x1, y1, x2, y2] = bbox;
             const bw = x2 - x1;
             const bh = y2 - y1;
             const cx = (x1 + x2) / 2.0;
             const cy = (y1 + y2) / 2.0;

             const cx_norm = 2.0 * (cx / width) - 1.0;
             const cy_norm = 2.0 * (cy / height) - 1.0;
             const b_scale = Math.max(bw, bh) / Math.max(width, height);
             const cliff_cond = new Float32Array([cx_norm, cy_norm, b_scale]);

             const CROP_EXPAND = 1.2;
             const INPUT_SIZE = 224;
             const sq_size = Math.max(bw, bh) * CROP_EXPAND;
             const half = sq_size / 2.0;
             const sq_x1 = cx - half;
             const sq_y1 = cy - half;






             // Very simple crop using a temporary canvas to avoid writing complex padding logic manually
             const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
             const ctx = canvas.getContext('2d');

             // Draw the original image data onto an offscreen canvas
             const origCanvas = new OffscreenCanvas(width, height);
             const origCtx = origCanvas.getContext('2d');
             origCtx.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);

             ctx.fillStyle = 'black';
             ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
             ctx.drawImage(origCanvas, sq_x1, sq_y1, sq_size, sq_size, 0, 0, INPUT_SIZE, INPUT_SIZE);

             const cropData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
             const cropFloat32 = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);

             const mean = [0.485, 0.456, 0.406];
             const std = [0.229, 0.224, 0.225];

             let p = 0;
             for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
                 const r = cropData[i*4] / 255.0;
                 const g = cropData[i*4+1] / 255.0;
                 const b = cropData[i*4+2] / 255.0;

                 cropFloat32[p] = (r - mean[0]) / std[0];
                 cropFloat32[INPUT_SIZE * INPUT_SIZE + p] = (g - mean[1]) / std[1];
                 cropFloat32[2 * INPUT_SIZE * INPUT_SIZE + p] = (b - mean[2]) / std[2];
                 p++;
             }

             const feeds = {
                 "image": new ort.Tensor('float32', cropFloat32, [1, 3, INPUT_SIZE, INPUT_SIZE]),
                 "cliff_cond": new ort.Tensor('float32', cliff_cond, [1, 3])
             };

             const outs = await pipe.session.run(feeds);

             // outs: mhr_params, shape_params, cam_trans, joints_2d, joints_3d
             const joints_2d_norm = outs["joints_2d"].data; // 70 * 2
             const joints_3d_local = outs["joints_3d"].data; // 70 * 3
             const cam_trans = outs["cam_trans"].data; // 3

             const keypoints = [];

             const MHR70_TO_COCO_MAP = {
                 0: 0, // nose
                 1: 1, // left_eye
                 2: 2, // right_eye
                 3: 3, // left_ear
                 4: 4, // right_ear
                 5: 5, // left_shoulder
                 6: 6, // right_shoulder
                 7: 7, // left_elbow
                 8: 8, // right_elbow
                 41: 10, // right_wrist -> COCO right_wrist
                 62: 9, // left_wrist -> COCO left_wrist
                 9: 11, // left_hip
                 10: 12, // right_hip
                 11: 13, // left_knee
                 12: 14, // right_knee
                 13: 15, // left_ankle
                 14: 16 // right_ankle
             };

             const scale = sq_size / INPUT_SIZE;

             for (let i = 0; i < 70; i++) {
                 const x_norm = joints_2d_norm[i * 2];
                 const y_norm = joints_2d_norm[i * 2 + 1];

                 const crop_px_x = (x_norm + 1.0) * 0.5 * INPUT_SIZE;
                 const crop_px_y = (y_norm + 1.0) * 0.5 * INPUT_SIZE;

                 const full_x = crop_px_x * scale + sq_x1;
                 const full_y = crop_px_y * scale + sq_y1;

                 const z_local = joints_3d_local[i * 3 + 2] + cam_trans[2]; // Using Z relative to camera

                 keypoints.push({ x: full_x, y: full_y, z: z_local, score: 1.0 });
             }

             // Map to COCO 17
             const cocoKeypoints = new Array(17).fill(null);
             for (const [mhr_idx, coco_idx] of Object.entries(MHR70_TO_COCO_MAP)) {
                 cocoKeypoints[coco_idx] = keypoints[mhr_idx];
             }

             // Fill in missing with zeros (should not happen as MHR has all these)
             for (let i=0; i<17; i++) {
                 if (!cocoKeypoints[i]) {
                     cocoKeypoints[i] = {x: 0, y: 0, z: 0, score: 0};
                 }
             }

             formattedResults.push({ keypoints: cocoKeypoints, score: 1.0 });
         }

         self.postMessage({ id, status: "success", data: formattedResults });
         return;
      }

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
