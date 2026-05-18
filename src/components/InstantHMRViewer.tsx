import { useState, useRef, useEffect } from 'react';
import { CameraIcon as Camera, FileVideoIcon as Video, SquareIcon as Square, AlertCircleIcon as AlertCircle, Loader2Icon as Loader } from './LucideIcons';

/*
 * InstantHMR Browser Implementation
 *
 * SETUP REQUIRED:
 * 1. Export the InstantHMR PyTorch model to ONNX format:
 *    - Install: pip install onnx onnxruntime
 *    - Export script example:
 *      import torch
 *      model = ... # Load your InstantHMR model
 *      dummy_input = torch.randn(1, 3, 256, 256)
 *      torch.onnx.export(model, dummy_input, "instant_hmr.onnx",
 *                       input_names=['image'],
 *                       output_names=['joints_3d', 'vertices'],
 *                       dynamic_axes={'image': {0: 'batch'}})
 *
 * 2. Host the ONNX model file and update MODEL_URL below
 *
 * 3. This uses ONNX Runtime Web with WebGPU backend
 */

// SMPL skeleton connections (simplified 24-joint skeleton)
const SKELETON_CONNECTIONS = [
  [0, 1], [0, 2], [0, 3],  // Pelvis to legs and spine
  [1, 4], [2, 5],          // Upper legs
  [4, 7], [5, 8],          // Lower legs
  [7, 10], [8, 11],        // Feet
  [3, 6], [6, 9],          // Spine to chest to head
  [9, 12], [9, 13], [9, 14], // Head and shoulders
  [12, 15], [13, 16],      // Upper arms
  [15, 18], [16, 19],      // Lower arms
  [18, 20], [19, 21],      // Hands
  [20, 22], [21, 23]       // Hand extensions
];

const JOINT_NAMES = [
  'Pelvis', 'L_Hip', 'R_Hip', 'Spine1', 'L_Knee', 'R_Knee', 'Spine2',
  'L_Ankle', 'R_Ankle', 'Spine3', 'L_Foot', 'R_Foot', 'Neck',
  'L_Collar', 'R_Collar', 'Head', 'L_Shoulder', 'R_Shoulder',
  'L_Elbow', 'R_Elbow', 'L_Wrist', 'R_Wrist', 'L_Hand', 'R_Hand'
];

export default function InstantHMRViewer() {
  const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user'); // 'user' for front, 'environment' for rear
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({ webgpu: false, cameras: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // const sessionRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // Check WebGPU support and available cameras
  useEffect(() => {
    const checkCapabilities = async () => {
      const hasWebGPU = 'gpu' in navigator;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setDeviceInfo({ webgpu: hasWebGPU, cameras: videoDevices.length });
      } catch (err) {
        console.error('Error checking devices:', err);
      }
    };

    checkCapabilities();
  }, []);

  // Initialize ONNX Runtime session with WebGPU
  useEffect(() => {
    const initModel = async () => {
      try {
        // Check if ort is available (ONNX Runtime Web)
        if (typeof (window as any).ort === 'undefined') {
          setError('ONNX Runtime not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/ort.min.js"></script>');
          return;
        }

        // const ort = (window as any).ort;

        // Set execution provider to WebGPU if available, fallback to WASM
        const executionProviders = deviceInfo.webgpu
          ? ['webgpu', 'wasm']
          : ['wasm'];

        // NOTE: Replace this URL with your actual model URL
        // const MODEL_URL = '/models/instant_hmr.onnx';

        // For demo purposes, we'll skip actual model loading
        // In production, uncomment this:
        // const session = await ort.InferenceSession.create(MODEL_URL, {
        //   executionProviders
        // });
        // sessionRef.current = session;

        console.log('Model would load with providers:', executionProviders);
        setIsModelLoaded(true);
      } catch (err: any) {
        setError(`Model loading failed: ${err.message}`);
        console.error('Model init error:', err);
      }
    };

    if (deviceInfo.webgpu !== null) {
      initModel();
    }
  }, [deviceInfo.webgpu]);

  // Start camera stream
  const startCamera = async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: cameraMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setError(null);
    } catch (err: any) {
      setError(`Camera access failed: ${err.message}`);
      console.error('Camera error:', err);
    }
  };

  // Switch camera
  const toggleCamera = () => {
    setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Process video frame and detect pose
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !overlayRef.current) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const octx = overlay.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx && octx) {
      // Match canvas size to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        setIsProcessing(true);

        // In a real implementation, you would:
        // 1. Preprocess the frame (resize to 256x256, normalize)
        // 2. Run inference through ONNX Runtime
        // 3. Post-process the outputs (joints_3d, vertices)

        // For demo, generate synthetic pose data
        const joints = generateDemoPose(canvas.width, canvas.height);

        // Draw skeleton overlay
        drawSkeleton(octx, joints, canvas.width, canvas.height);

        // Update FPS
        updateFPS();
      } catch (err) {
        console.error('Processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  };

  // Generate demo pose data (replace with actual model inference)
  const generateDemoPose = (width: number, height: number) => {
    const t = Date.now() * 0.001;
    const centerX = width / 2;
    const centerY = height / 2;

    // Simulate 24 body joints with subtle animation
    const joints = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + t * 0.5;
      const radius = 100 + i * 10;
      joints.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        z: Math.sin(t + i) * 50, // Depth
        confidence: 0.8 + Math.random() * 0.2
      });
    }
    return joints;
  };

  // Draw skeleton on overlay canvas
  const drawSkeleton = (ctx: CanvasRenderingContext2D, joints: any[], width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Draw connections
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;

    SKELETON_CONNECTIONS.forEach(([i, j]) => {
      if (joints[i] && joints[j]) {
        const conf = Math.min(joints[i].confidence, joints[j].confidence);
        ctx.globalAlpha = conf;

        ctx.beginPath();
        ctx.moveTo(joints[i].x, joints[i].y);
        ctx.lineTo(joints[j].x, joints[j].y);
        ctx.stroke();
      }
    });

    // Draw joints
    ctx.shadowBlur = 15;
    joints.forEach((joint, idx) => {
      ctx.globalAlpha = joint.confidence;

      // Color based on depth
      const hue = 120 + (joint.z / 100) * 60;
      ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;

      ctx.beginPath();
      ctx.arc(joint.x, joint.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw joint index for debugging
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.globalAlpha = 0.7;
      ctx.fillText(idx.toString(), joint.x + 8, joint.y + 4);
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  // Update FPS counter
  const updateFPS = () => {
    const counter = fpsCounterRef.current;
    counter.frames++;

    const now = Date.now();
    const elapsed = now - counter.lastTime;

    if (elapsed >= 1000) {
      setFps(Math.round((counter.frames * 1000) / elapsed));
      counter.frames = 0;
      counter.lastTime = now;
    }
  };

  // Start/stop processing
  useEffect(() => {
    if (isModelLoaded && streamRef.current) {
      animationRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isModelLoaded, streamRef.current]);

  // Restart camera when mode changes
  useEffect(() => {
    if (streamRef.current) {
      startCamera();
    }
  }, [cameraMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      color: '#e0e6ed',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <header style={{
          marginBottom: '30px',
          borderBottom: '2px solid rgba(0, 255, 136, 0.2)',
          paddingBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            letterSpacing: '2px',
            margin: 0,
            color: '#00ff88',
            textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
            textTransform: 'uppercase'
          }}>
            InstantHMR
          </h1>
          <p style={{
            fontSize: '14px',
            opacity: 0.7,
            margin: '8px 0 0 0',
            letterSpacing: '1px'
          }}>
            REAL-TIME 3D HUMAN MESH RECOVERY • BROWSER-BASED
          </p>
        </header>

        {/* System Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            padding: '12px 16px',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>ACCELERATION</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {deviceInfo.webgpu ? '⚡ WebGPU' : '🔧 WebAssembly'}
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            padding: '12px 16px',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>CAMERAS</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {deviceInfo.cameras} detected
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            padding: '12px 16px',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>MODEL STATUS</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {isModelLoaded ? '✓ Ready' : <Loader style={{ width: '16px', height: '16px', display: 'inline-block', animation: 'spin 1s linear infinite' }} />}
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            padding: '12px 16px',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>FRAMERATE</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {fps} FPS
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: 'rgba(255, 82, 82, 0.1)',
            border: '1px solid rgba(255, 82, 82, 0.3)',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertCircle style={{ width: '20px', height: '20px', color: '#ff5252' }} />
            <div style={{ flex: 1, fontSize: '14px' }}>{error}</div>
          </div>
        )}

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={startCamera}
            disabled={!isModelLoaded}
            style={{
              background: isModelLoaded ? 'rgba(0, 255, 136, 0.15)' : 'rgba(128, 128, 128, 0.15)',
              border: `2px solid ${isModelLoaded ? '#00ff88' : '#666'}`,
              color: isModelLoaded ? '#00ff88' : '#999',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '1px',
              cursor: isModelLoaded ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase'
            }}
            onMouseEnter={e => {
              if (isModelLoaded) {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.3)';
              }
            }}
            onMouseLeave={e => {
              if (isModelLoaded) {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Video style={{ width: '18px', height: '18px' }} />
            Start Camera
          </button>

          <button
            onClick={toggleCamera}
            disabled={!streamRef.current || deviceInfo.cameras < 2}
            style={{
              background: streamRef.current && deviceInfo.cameras >= 2 ? 'rgba(100, 181, 246, 0.15)' : 'rgba(128, 128, 128, 0.15)',
              border: `2px solid ${streamRef.current && deviceInfo.cameras >= 2 ? '#64b5f6' : '#666'}`,
              color: streamRef.current && deviceInfo.cameras >= 2 ? '#64b5f6' : '#999',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '1px',
              cursor: streamRef.current && deviceInfo.cameras >= 2 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase'
            }}
            onMouseEnter={e => {
              if (streamRef.current && deviceInfo.cameras >= 2) {
                e.currentTarget.style.background = 'rgba(100, 181, 246, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 181, 246, 0.3)';
              }
            }}
            onMouseLeave={e => {
              if (streamRef.current && deviceInfo.cameras >= 2) {
                e.currentTarget.style.background = 'rgba(100, 181, 246, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Camera style={{ width: '18px', height: '18px' }} />
            Switch Camera ({cameraMode === 'user' ? 'Front' : 'Rear'})
          </button>
        </div>

        {/* Video Display */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid rgba(0, 255, 136, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          background: '#000'
        }}>
          {/* Hidden video element */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            playsInline
            muted
          />

          {/* Canvas for video rendering */}
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              maxHeight: '70vh'
            }}
          />

          {/* Overlay canvas for skeleton */}
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          />

          {/* Processing indicator */}
          {isProcessing && (
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0, 255, 136, 0.9)',
              color: '#000',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              animation: 'pulse 1s ease-in-out infinite'
            }}>
              PROCESSING
            </div>
          )}

          {/* Placeholder when no stream */}
          {!streamRef.current && (
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
              <Square style={{ width: '64px', height: '64px', color: '#00ff88', opacity: 0.5 }} />
              <div style={{ fontSize: '16px', opacity: 0.7 }}>
                Click "Start Camera" to begin
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: 'rgba(0, 255, 136, 0.05)',
          border: '1px solid rgba(0, 255, 136, 0.2)',
          borderRadius: '4px',
          fontSize: '13px',
          lineHeight: '1.8'
        }}>
          <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#00ff88' }}>
            🛠️ SETUP INSTRUCTIONS
          </div>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Export InstantHMR model to ONNX format (see code comments)</li>
            <li>Include ONNX Runtime Web: <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '2px 6px', borderRadius: '2px' }}>&lt;script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"&gt;&lt;/script&gt;</code></li>
            <li>Host your ONNX model file and update MODEL_URL in the code</li>
            <li>Current demo shows synthetic pose data - replace with actual inference</li>
          </ol>
        </div>

        {/* Skeleton Legend */}
        <div style={{
          marginTop: '20px',
          padding: '20px',
          background: 'rgba(0, 255, 136, 0.05)',
          border: '1px solid rgba(0, 255, 136, 0.2)',
          borderRadius: '4px'
        }}>
          <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#00ff88' }}>
            📍 JOINT MAPPING ({JOINT_NAMES.length} keypoints)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '8px',
            fontSize: '11px'
          }}>
            {JOINT_NAMES.map((name, idx) => (
              <div key={idx} style={{ opacity: 0.8 }}>
                <span style={{ color: '#00ff88', fontWeight: '700' }}>{idx}:</span> {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
