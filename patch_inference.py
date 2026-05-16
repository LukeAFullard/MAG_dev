import re

with open("src/inference.ts", "r") as f:
    content = f.read()

# Replace ImageBitmap handling in runInference to ensure memory limits aren't hit and things are correctly handled
content = content.replace("ctx.drawImage(input, 0, 0);", "ctx.drawImage(input, 0, 0);\n        input.close(); // Clean up ImageBitmap to prevent memory leaks")

with open("src/inference.ts", "w") as f:
    f.write(content)
