// verify lines
const fs = require('fs');
const content = fs.readFileSync('src/components/ManualAnnotation.tsx', 'utf8');

// check if drawScale logic is correct
if (content.includes('const drawScale = canvas.width / 640;')) {
    console.log("drawScale is present");
} else {
    console.log("drawScale is missing");
}
