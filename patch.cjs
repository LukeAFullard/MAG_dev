const fs = require('fs');
let code = fs.readFileSync('src/components/InstantHMRViewer.tsx', 'utf8');
code = code.replace(
  `{!streamRef.current && (
            <div style={{
              position: 'absolute',`,
  `{!streamRef.current && mode === 'live' && (
            <div style={{
              position: 'absolute',`
);
fs.writeFileSync('src/components/InstantHMRViewer.tsx', code);
