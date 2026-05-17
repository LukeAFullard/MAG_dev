const fs = require('fs');
let code = fs.readFileSync('src/utils/poseExtraction.ts', 'utf8');

// Replace keypoints handling based on model
code = code.replace(/                  if \(ls && rs && lh && rh &&\n                      ls\.score > 0\.3 && rs\.score > 0\.3 && lh\.score > 0\.3 && rh\.score > 0\.3\) {/,
                    'if (ls && rs && lh && rh && (ls.score || 1) > 0.3 && (rs.score || 1) > 0.3 && (lh.score || 1) > 0.3 && (rh.score || 1) > 0.3) {');

fs.writeFileSync('src/utils/poseExtraction.ts', code);
