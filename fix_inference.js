const fs = require('fs');
let code = fs.readFileSync('src/inference.ts', 'utf8');
code = code.replace(/if \(task === "pose-estimation" && model === "rtmw"\)/, 'if (task === "pose-estimation")');
code = code.replace(/        const imageData = ctx\.getImageData\(0, 0, width, height\);\n        results = await detector\.detect\(\n          new Uint8Array\(imageData\.data\.buffer\),\n          width,\n          height,\n        \);/, '        results = await detector.estimatePoses(canvas);');
code = code.replace(/        results = await detector\.detect\(\n          new Uint8Array\(input\.data\.buffer\),\n          input\.width,\n          input\.height,\n        \);/, '        results = await detector.estimatePoses(input);\n      } else if (input instanceof HTMLCanvasElement || input instanceof HTMLVideoElement || input instanceof HTMLImageElement) {\n        results = await detector.estimatePoses(input);');
fs.writeFileSync('src/inference.ts', code);
