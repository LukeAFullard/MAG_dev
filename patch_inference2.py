import re

with open("src/inference.ts", "r") as f:
    content = f.read()

# Replace ImageBitmap handling in runInference to ensure width and height are handled properly. Sometimes input.width is 0?
# That means ImageBitmap is 0? If ImageBitmap is 0, we can't extract pose. Wait, in poseExtraction.ts, it uses canvas to create ImageBitmap, but if targetWidth or targetHeight is 0...
# Let's add a check for width and height

replacement = """      if (input instanceof ImageBitmap) {
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
      }"""

content = re.sub(r"      if \(input instanceof ImageBitmap\) \{.*?input\.height,\n        \);\n      \}", replacement, content, flags=re.DOTALL)

with open("src/inference.ts", "w") as f:
    f.write(content)
