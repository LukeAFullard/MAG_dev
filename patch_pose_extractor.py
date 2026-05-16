import re

with open("src/utils/poseExtraction.ts", "r") as f:
    content = f.read()

# Since we are running pose estimation in the main thread now, we should pass an ImageData or ImageBitmap.
# Our inference engine runInference expects ImageData or ImageBitmap.
# Wait, ImageBitmap can't be used directly by context.drawImage or ImageData extracting if it's already an ImageBitmap we pass to rtmlib?
# Ah! rtmlib supports ImageBitmap. Wait, we changed runInference to:
#  if (input instanceof ImageBitmap) {
#      const canvas = document.createElement('canvas'); ... ctx.drawImage(input, 0, 0); ... }

# Let's see why the pipeline hangs at 33%.
# Hangs usually mean the promise is neither resolved nor rejected.
