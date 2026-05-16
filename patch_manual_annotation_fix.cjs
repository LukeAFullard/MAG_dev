const fs = require('fs');
let content = fs.readFileSync('src/components/ManualAnnotation.tsx', 'utf8');

content = content.replace(
  `className="relative border bg-black rounded overflow-hidden w-full max-w-3xl aspect-video mx-auto"`,
  `className="relative border bg-black rounded overflow-hidden w-full max-w-3xl mx-auto" style={{ aspectRatio: videoDimensions.width / videoDimensions.height, maxHeight: '80vh' }}`
);

fs.writeFileSync('src/components/ManualAnnotation.tsx', content);
