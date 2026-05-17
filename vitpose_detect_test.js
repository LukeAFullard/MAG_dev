import { pipeline, env } from "@huggingface/transformers";

async function run() {
  env.allowLocalModels = false;

  console.log("Loading Object Detector...");
  try {
      const detector = await pipeline('object-detection', 'Xenova/yolos-tiny', { device: 'webgpu' });
      console.log("Loaded Detector successfully");
  } catch(e) {
      console.error("Error loading detector:", e);
  }
}
run();
