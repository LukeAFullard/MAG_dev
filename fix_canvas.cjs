const fs = require('fs');
let code = fs.readFileSync('src/utils/poseExtraction.ts', 'utf8');

code = code.replace(
  /\/\/ Target width\/height for pose estimation to save memory\n        const targetWidth = 640;\n        const vidW = video.videoWidth \|\| 640;\n        const vidH = video.videoHeight \|\| 480;\n        const scale = targetWidth \/ vidW;\n        const targetHeight = Math.floor\(vidH \* scale\) \|\| 480;/,
  `// Target width/height for pose estimation to save memory.
        // MoveNet Thunder prefers 256x256, BlazePose can handle larger but keeping it reasonable saves compute.
        // The TensorFlow.js models automatically handle internal resizing, so we just need a reasonable canvas size
        // that preserves aspect ratio without eating up memory.
        const vidW = video.videoWidth || 640;
        const vidH = video.videoHeight || 640;

        // Calculate max dimension constraint while preserving aspect ratio
        const maxDim = analysisMode === 'fast' ? 256 : 640;
        const scale = Math.min(maxDim / vidW, maxDim / vidH);
        const targetWidth = Math.floor(vidW * scale) || maxDim;
        const targetHeight = Math.floor(vidH * scale) || maxDim;`
);

fs.writeFileSync('src/utils/poseExtraction.ts', code);
