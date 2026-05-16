const fs = require('fs');

// Is there pose drawing in SideBySideComparison?
let content = fs.readFileSync('src/components/SideBySideComparison.tsx', 'utf8');

// The issue says "Either it is not rendering on the video or the model is not finding any joints".
// I've fixed the rendering by scaling the coordinates. Wait, are poses rendered in SideBySideComparison?
// "Also, I have never been able to see the pose lines from the pose estimation model. Either it is not rendering on the video or the model is not finding any joints"
// This applies to ManualAnnotation or maybe the actual processing?
// The user probably talks about the Manual Annotation tool because it's the only place pose points are rendered on the video.
// SideBySideComparison doesn't render pose keypoints, only the videos.
