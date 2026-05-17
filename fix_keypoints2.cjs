const fs = require('fs');
let code = fs.readFileSync('src/utils/poseExtraction.ts', 'utf8');

code = code.replace(/                  const bpMap = {/, `                  const bpMap: Record<number, number> = {`);

fs.writeFileSync('src/utils/poseExtraction.ts', code);
