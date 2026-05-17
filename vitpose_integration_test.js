import { AutoModel, AutoImageProcessor, RawImage, pipeline, env } from "@huggingface/transformers";

async function run() {
  env.allowLocalModels = false;

  const modelId = "onnx-community/vitpose-base-simple";
  console.log("Loading ViTPose...", modelId);
  try {
      const model = await AutoModel.from_pretrained(modelId);
      const processor = await AutoImageProcessor.from_pretrained(modelId);
      console.log("Loaded ViTPose successfully");
  } catch(e) {
      console.error("Error loading ViTPose:", e);
  }
}
run();
