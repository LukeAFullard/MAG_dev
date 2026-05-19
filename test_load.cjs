const { exec } = require('child_process');
const server = exec('npm run dev');
setTimeout(async () => {
    try {
        const res = await fetch('http://localhost:5173/instanthmr.html');
        const text = await res.text();
        console.log(text.includes('InstantHMRViewer') ? 'Served successfully' : 'Failed');
    } catch(e) {
        console.log(e);
    }
    server.kill();
}, 2000);
