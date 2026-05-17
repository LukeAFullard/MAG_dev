const fs = require('fs');
let code = fs.readFileSync('src/inference.ts', 'utf8');
code = code.replace(/runtime: 'mediapipe',/, "runtime: 'mediapipe' as const,");
fs.writeFileSync('src/inference.ts', code);

code = fs.readFileSync('src/worker.ts', 'utf8');
code = code.replace(/  RawImage,\n} from "@huggingface\/transformers";/, "} from \"@huggingface/transformers\";");
fs.writeFileSync('src/worker.ts', code);
