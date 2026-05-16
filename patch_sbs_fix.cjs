const fs = require('fs');
let content = fs.readFileSync('src/components/SideBySideComparison.tsx', 'utf8');

// If isOverlayMode is true, it uses 'aspect-video'. We should change this or just keep it since it's side-by-side.
// Actually, side by side has `<div className={\`\${isOverlayMode ? 'relative w-full aspect-video' : 'flex w-full h-full'}\`}>`
// `w-full h-full object-contain` on video tag inside `flex w-full h-full` works fine and keeps the ratio.
