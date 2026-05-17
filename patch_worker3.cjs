const fs = require('fs');
let content = fs.readFileSync('src/worker.ts', 'utf8');

content = content.replace(
  `const detector = await pipeline('object-detection', 'Xenova/yolos-tiny', { device: 'wasm' });`,
  `const detector = await pipeline('object-detection', 'Xenova/yolos-tiny', { device });`
);

fs.writeFileSync('src/worker.ts', content);
