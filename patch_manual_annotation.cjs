const fs = require('fs');

let content = fs.readFileSync('src/components/ManualAnnotation.tsx', 'utf8');

// We want to make the container aspect ratio dynamic based on video, or just let CSS object-contain handle it.
// The easiest is to make the canvas 100% width and height, and let object-contain keep its ratio.
// However, since we're rendering video to a canvas, we must set the canvas resolution to match the video.
// Also, poses coordinate system needs to match the canvas resolution. Let's fix the aspect ratio first.

// 1. Add state for video dimensions
content = content.replace(
  `const [duration, setDuration] = useState(0);`,
  `const [duration, setDuration] = useState(0);\n  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 360 });`
);

// 2. Update dimensions in handleLoadedMetadata
content = content.replace(
  `const handleLoadedMetadata = () => setDuration(video.duration);`,
  `const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (video.videoWidth && video.videoHeight) {
        setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      }
    };`
);

// 3. Update the container classes to support responsive max-height or max-width
// Replace w-[640px] h-[360px] with responsive tailwind classes
content = content.replace(
  `className="relative inline-block border bg-black rounded overflow-hidden w-[640px] h-[360px]"`,
  `className="relative border bg-black rounded overflow-hidden w-full" style={{ aspectRatio: videoDimensions.width / videoDimensions.height, maxHeight: '600px' }}`
);

// 4. Update the canvas tags
content = content.replace(
  `        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute top-0 left-0 cursor-crosshair"`,
  `        <canvas
          ref={canvasRef}
          width={videoDimensions.width}
          height={videoDimensions.height}
          className="absolute top-0 left-0 w-full h-full object-contain cursor-crosshair"`
);

// Note: wait, if we use object-contain on canvas, the mouse event coordinates will be wrong because e.clientX is relative to the visual size, not the canvas native resolution.
// Let's modify the mouse event handlers to account for the scale factor!
