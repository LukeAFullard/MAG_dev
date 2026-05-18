const fs = require('fs');
let code = fs.readFileSync('src/components/InstantHMRViewer.tsx', 'utf8');
code = code.replace(
  `{!streamRef.current && mode === 'live' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.8)',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <Square style={{ color: '#00ff88', opacity: 0.5, width: '64px', height: '64px' }} />
              <div style={{ fontSize: '16px', opacity: 0.7 }}>
                Click "Start Camera" to begin
              </div>
            </div>
          )}`,
  `{!streamRef.current && mode === 'live' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.8)',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <Square style={{ color: '#00ff88', opacity: 0.5, width: '64px', height: '64px' }} />
              <div style={{ fontSize: '16px', opacity: 0.7 }}>
                Click "Start Camera" to begin
              </div>
            </div>
          )}

          {mode === 'analyzing' && analysisProgress === 0 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.8)',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <Video style={{ color: '#ffc107', opacity: 0.5, width: '64px', height: '64px' }} />
              <div style={{ fontSize: '16px', opacity: 0.7 }}>
                Video ready. Click "Analyze Video" to process.
              </div>
            </div>
          )}`
);
fs.writeFileSync('src/components/InstantHMRViewer.tsx', code);
