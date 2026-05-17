const fs = require('fs');
let code = fs.readFileSync('src/worker.ts', 'utf8');
code = code.replace(/      if \(task === "depth-estimation"\) {[\s\S]*?return;\n      }\n/g, '');
fs.writeFileSync('src/worker.ts', code);
