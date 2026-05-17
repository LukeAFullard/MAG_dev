const fs = require('fs');
let code = fs.readFileSync('src/utils/poseExtraction.ts', 'utf8');

// We need to map blazepose/movenet keypoints to the expected 17-point format
// used by HumanBiomechanics and other parts of the app.
// Both BlazePose and MoveNet use different indices than COCO (RTMW uses COCO).
// COCO indices:
// 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
// 5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow, 9: left_wrist, 10: right_wrist
// 11: left_hip, 12: right_hip, 13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle

code = code.replace(/                return { person, keypoints, com };/, `
                // Map keypoints to COCO format
                let mappedKeypoints = new Array(17).fill({x:0, y:0, score:0});
                if (modelToUse === 'blazepose') {
                  const bpMap = {
                    0: 0, // nose
                    1: 2, // left_eye
                    2: 5, // right_eye
                    3: 7, // left_ear
                    4: 8, // right_ear
                    5: 11, // left_shoulder
                    6: 12, // right_shoulder
                    7: 13, // left_elbow
                    8: 14, // right_elbow
                    9: 15, // left_wrist
                    10: 16, // right_wrist
                    11: 23, // left_hip
                    12: 24, // right_hip
                    13: 25, // left_knee
                    14: 26, // right_knee
                    15: 27, // left_ankle
                    16: 28, // right_ankle
                  };
                  for (let i = 0; i < 17; i++) {
                    mappedKeypoints[i] = keypoints[bpMap[i]] || {x:0, y:0, score:0};
                  }
                } else {
                  // MoveNet natively returns 17 keypoints in COCO format!
                  mappedKeypoints = keypoints;
                }

                return { person, keypoints: mappedKeypoints, com };`);

fs.writeFileSync('src/utils/poseExtraction.ts', code);
