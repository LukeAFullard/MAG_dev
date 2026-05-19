const fs = require('fs');
const filepath = 'src/components/InstantHMRViewer.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const replacement = `  // Parse model output to screen coordinates (accounting for crop)
  const parseModelOutput = (results: any, screenWidth: number, screenHeight: number) => {
    const joints = [];
    const numJoints = 24;

    let joints2D = results['joints_2d'] ? results['joints_2d'].data : null;
    let joints3D = results['joints_3d'] ? results['joints_3d'].data : null;

    // Fallbacks for different model export names
    if (!joints2D) {
      const keys = Object.keys(results);
      if (keys.length > 3) {
         joints2D = results[keys[3]].data;
         joints3D = keys.length > 4 ? results[keys[4]].data : null;
      } else if (keys.length > 0) {
         joints2D = results[keys[0]].data;
      }
    }

    if (!joints2D) {
       console.error("Could not find joints_2d in model output. Keys available:", Object.keys(results));
       return [];
    }

    // Get crop region
    const crop = detectedPersonRef.current || { x: 0, y: 0, width: screenWidth, height: screenHeight, originalMaxDim: Math.max(screenWidth, screenHeight) };

    // Model outputs normalized coordinates, convert to screen space
    for (let i = 0; i < numJoints; i++) {
      // Map from normalized [-1, 1] to crop region, then to screen
      const normalizedX = (joints2D[i * 2] + 1) / 2;  // Convert to [0, 1]
      const normalizedY = (joints2D[i * 2 + 1] + 1) / 2;

      joints.push({
        x: crop.x + normalizedX * crop.width,
        y: crop.y + normalizedY * crop.height,
        z: joints3D ? joints3D[i * 3 + 2] : 0,
        confidence: 0.9
      });
    }

    return joints;
  };`;

const startIdx = content.indexOf('  // Parse model output to screen coordinates');
const endIdx = content.indexOf('  // Draw skeleton on overlay canvas', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + replacement + '\n\n' + content.substring(endIdx);
    fs.writeFileSync(filepath, content);
    console.log("Successfully replaced parseModelOutput");
} else {
    console.log("Could not find parseModelOutput bounds", startIdx, endIdx);
}
