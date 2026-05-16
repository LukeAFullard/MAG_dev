const fs = require('fs');

let content = fs.readFileSync('src/components/ManualAnnotation.tsx', 'utf8');

// The first patch script didn't write to the file! I forgot fs.writeFileSync.
// Let's rewrite it and also fix the mouse events scale

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
  `className="relative border bg-black rounded overflow-hidden w-full max-w-3xl aspect-video mx-auto"`
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

// 5. Update mouse event coordinates calculation
function replaceMouseCoords(funcName) {
    const search = `const ${funcName} = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;`;

    const replacement = `const ${funcName} = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factors due to object-contain
    // We assume the canvas keeps its original aspect ratio inside the rect
    const canvasRatio = canvas.width / canvas.height;
    const rectRatio = rect.width / rect.height;

    let drawWidth = rect.width;
    let drawHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > rectRatio) {
        drawHeight = rect.width / canvasRatio;
        offsetY = (rect.height - drawHeight) / 2;
    } else {
        drawWidth = rect.height * canvasRatio;
        offsetX = (rect.width - drawWidth) / 2;
    }

    const scaleX = canvas.width / drawWidth;
    const scaleY = canvas.height / drawHeight;

    const x = (e.clientX - rect.left - offsetX) * scaleX;
    const y = (e.clientY - rect.top - offsetY) * scaleY;`;

    content = content.replace(search, replacement);
}

replaceMouseCoords('handleCanvasMouseDown');
replaceMouseCoords('handleCanvasMouseMove');

fs.writeFileSync('src/components/ManualAnnotation.tsx', content);
