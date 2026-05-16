const fs = require('fs');

let content = fs.readFileSync('src/components/ManualAnnotation.tsx', 'utf8');

// The points saved in poses are from a 640-width coordinate system.
// We are drawing them on a canvas of size `videoDimensions.width` and `videoDimensions.height`.
// So we must scale the points!
// Let's modify the drawing logic to scale the keypoints from 640xTargetHeight to video widthxheight.
// Wait, what was the scale used in extraction?

// src/utils/poseExtraction.ts:
// const targetWidth = 640;
// const scale = targetWidth / vidW;
// keypoints are in the targetWidth coordinate space!
// So original_x = point.x / scale = point.x * (vidW / 640)
// To draw them on the canvas which is size `videoDimensions.width` x `videoDimensions.height`, we need to multiply points by (videoDimensions.width / 640).
// Let's modify drawCanvas to apply this scale.

// First, get the scale inside drawCanvas:
const scaleLogic = `
    const drawScale = canvas.width / 640; // Pose coordinates are based on a 640 extraction width
`;

content = content.replace(
  `// Draw pose skeleton lines`,
  `${scaleLogic}\n    // Draw pose skeleton lines`
);

// Scale lines
content = content.replace(
  `        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);`,
  `        ctx.moveTo(p1.x * drawScale, p1.y * drawScale);
        ctx.lineTo(p2.x * drawScale, p2.y * drawScale);`
);

// Scale points
content = content.replace(
  `      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);`,
  `      ctx.arc(point.x * drawScale, point.y * drawScale, 4, 0, 2 * Math.PI);`
);


// Now for mouse events: dragging a point.
// e.clientX / Y translates to a point on the canvas.
// `x` and `y` calculated in `handleCanvasMouseMove` are in the native canvas resolution (which is videoDimensions).
// So when we edit a pose point, we must save it in the 640-width coordinate space!
// So x_saved = x / drawScale.

const dragScaleLogic = `const canvas = canvasRef.current;
    if (!canvas) return;
    const drawScale = canvas.width / 640;`;

content = content.replace(
  `    } else if (mode === 'edit-pose') {
      const point = currentKeypoints.find(p => Math.hypot(p.x - x, p.y - y) < 15);`,
  `    } else if (mode === 'edit-pose') {
      const drawScale = canvas.width / 640;
      const point = currentKeypoints.find(p => Math.hypot(p.x * drawScale - x, p.y * drawScale - y) < 15);`
);

content = content.replace(
  `    } else if (mode === 'edit-pose' && draggingPoint !== null) {
      setCurrentKeypoints(prev => prev.map(p => p.id === draggingPoint ? { ...p, x, y } : p));`,
  `    } else if (mode === 'edit-pose' && draggingPoint !== null) {
      const drawScale = canvas.width / 640;
      setCurrentKeypoints(prev => prev.map(p => p.id === draggingPoint ? { ...p, x: x / drawScale, y: y / drawScale } : p));`
);

fs.writeFileSync('src/components/ManualAnnotation.tsx', content);
