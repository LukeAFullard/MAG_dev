import { useState, useRef, useEffect } from 'react';
import { CameraIcon as Camera, FileVideoIcon as Video, SquareIcon as Square, AlertCircleIcon as AlertCircle, Loader2Icon as Loader } from './LucideIcons';


/*
 * InstantHMR Browser Implementation
 *
 * Uses the official ONNX model from HuggingFace:
 * https://huggingface.co/momolesang/InstantHMR
 *
 * SETUP REQUIRED:
 * Include ONNX Runtime Web in your HTML:
 * <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>
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
  const [cameraMode, setCameraMode] = useState('user'); // 'user' for front, 'environment' for rear
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<{ webgpu: boolean | null, cameras: number }>({ webgpu: null, cameras: 0 });
  const [mode, _setMode] = useState('live'); // 'live', 'recording', 'analyzing', 'playback'
  const [isPlaying, setIsPlaying] = useState(false);
  const modeRef = useRef('live');
  const setMode = (newMode: string) => {
    modeRef.current = newMode;
    _setMode(newMode);
  };
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });
  const detectedPersonRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const analyzedPosesRef = useRef<{time: number, joints: any[]}[]>([]);

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

        const ort = (window as any).ort;

        // Set execution provider to WebGPU if available, fallback to WASM
        const executionProviders = deviceInfo.webgpu
          ? ['webgpu', 'wasm']
          : ['wasm'];

        // Initialize lightweight person detector (using MediaPipe Pose for bounding box)
        // Alternative to RF-DETR - provides person bounding box for cropping
        console.log('Initializing person detector...');
        if (typeof (window as any).Pose !== 'undefined') {
          const pose = new (window as any).Pose({
            locateFile: (file: string) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
          });
          pose.setOptions({
            modelComplexity: 0, // Fastest model for detection only
            smoothLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });
          detectorRef.current = pose;
          console.log('Person detector initialized');
        }

        // Load InstantHMR model from HuggingFace
        console.log('Loading InstantHMR model from HuggingFace...');
        const MODEL_URL = 'https://huggingface.co/momolesang/InstantHMR/resolve/main/instanthmr.onnx?download=true';
        const session = await ort.InferenceSession.create(MODEL_URL, {
          executionProviders,
          externalData: []
        });
        sessionRef.current = session;

        console.log('Model loaded successfully with providers:', executionProviders);
        console.log('Input names:', session.inputNames);
        console.log('Output names:', session.outputNames);
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
        setIsStreamActive(false);
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
      setIsStreamActive(true);

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

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) return;

    try {
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        setMode('analyzing');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setMode('recording');
    } catch (err: any) {
      setError(`Recording failed: ${err.message}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle video file upload
  const handleVideoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setRecordedVideo(url);
      setMode('analyzing');
    }
  };

  // Detect person bounding box using lightweight detector
  const detectPerson = async (canvas: HTMLCanvasElement) => {
    if (!detectorRef.current) {
      // Fallback: use center crop
      const cropRatio = 0.7;
      return {
        x: canvas.width * (1 - cropRatio) / 2,
        y: canvas.height * (1 - cropRatio) / 2,
        width: canvas.width * cropRatio,
        height: canvas.height * cropRatio
      };
    }

    try {
      // Use MediaPipe Pose for quick person detection
      return await new Promise((resolve) => {
        detectorRef.current.onResults((results: any) => {
          if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            // Calculate bounding box from landmarks
            const landmarks = results.poseLandmarks;
            let minX = 1, minY = 1, maxX = 0, maxY = 0;

            landmarks.forEach((lm: any) => {
              minX = Math.min(minX, lm.x);
              minY = Math.min(minY, lm.y);
              maxX = Math.max(maxX, lm.x);
              maxY = Math.max(maxY, lm.y);
            });

            // Add padding
            const padding = 0.1;
            const width = maxX - minX;
            const height = maxY - minY;

            resolve({
              x: Math.max(0, (minX - padding * width) * canvas.width),
              y: Math.max(0, (minY - padding * height) * canvas.height),
              width: Math.min(canvas.width, (width * (1 + 2 * padding)) * canvas.width),
              height: Math.min(canvas.height, (height * (1 + 2 * padding)) * canvas.height)
            });
          } else {
             // Fallback
            const cropRatio = 0.7;
            resolve({
              x: canvas.width * (1 - cropRatio) / 2,
              y: canvas.height * (1 - cropRatio) / 2,
              width: canvas.width * cropRatio,
              height: canvas.height * cropRatio
            });
          }
        });

        detectorRef.current.send({ image: canvas }).catch((err: any) => {
            console.error('Detection send error:', err);
            const cropRatio = 0.7;
            resolve({
              x: canvas.width * (1 - cropRatio) / 2,
              y: canvas.height * (1 - cropRatio) / 2,
              width: canvas.width * cropRatio,
              height: canvas.height * cropRatio
            });
        });
      });
    } catch (err) {
      console.error('Detection error:', err);
    }

    // Fallback
    const cropRatio = 0.7;
    return {
      x: canvas.width * (1 - cropRatio) / 2,
      y: canvas.height * (1 - cropRatio) / 2,
      width: canvas.width * cropRatio,
      height: canvas.height * cropRatio
    };
  };

  // Process video frame and detect pose
  const processFrame = async (sourceVideo?: HTMLVideoElement) => {
    if (!videoRef.current || !canvasRef.current || !overlayRef.current) {
      if (modeRef.current === 'live' || modeRef.current === 'recording') {
        animationRef.current = requestAnimationFrame(() => processFrame(sourceVideo));
      }
      return;
    }

    const video = sourceVideo || videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const octx = overlay.getContext('2d');

    if (!ctx || !octx) return;

    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      // Match canvas size to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        setIsProcessing(true);

        // Preprocess frame with person detection for speed
        const inputTensor = await preprocessFrame(ctx, canvas);

        if (sessionRef.current && inputTensor) {
          // Run inference
          const feeds: any = { [sessionRef.current.inputNames[0]]: inputTensor };

          // Provide cliff_cond if the model expects it (e.g. [1, 3] tensor for center and scale)
          if (sessionRef.current.inputNames.length > 1) {
             const cliffCondName = sessionRef.current.inputNames[1];
             const ort = (window as any).ort;
             // Calculate center and scale from bbox
             // This is a simple approximation; real InstantHMR might want normalized values
             const cx = detectedPersonRef.current ? detectedPersonRef.current.x + detectedPersonRef.current.width / 2 : canvas.width / 2;
             const cy = detectedPersonRef.current ? detectedPersonRef.current.y + detectedPersonRef.current.height / 2 : canvas.height / 2;
             const scale = detectedPersonRef.current ? Math.max(detectedPersonRef.current.width, detectedPersonRef.current.height) / 200 : 1.0;
             feeds[cliffCondName] = new ort.Tensor('float32', new Float32Array([cx, cy, scale]), [1, 3]);
          }

          const results = await sessionRef.current.run(feeds);

          // Extract joints from output
          const outputName = sessionRef.current.outputNames[0];
          const outputData = results[outputName].data;
          const joints = parseModelOutput(outputData, canvas.width, canvas.height);

          // Draw skeleton overlay
          drawSkeleton(octx, joints, canvas.width, canvas.height);

          // Draw person bounding box
          if (detectedPersonRef.current) {
            octx.strokeStyle = 'rgba(100, 181, 246, 0.5)';
            octx.lineWidth = 2;
            octx.strokeRect(detectedPersonRef.current.x, detectedPersonRef.current.y, detectedPersonRef.current.width, detectedPersonRef.current.height);
          }

          if (modeRef.current === 'analyzing') {
            return joints;
          }
        }

        // Update FPS
        updateFPS();
      } catch (err) {
        console.error('Processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    if (modeRef.current === 'live' || modeRef.current === 'recording') {
      animationRef.current = requestAnimationFrame(() => processFrame(sourceVideo));
    }
  };

  // Analyze uploaded/recorded video
  const analyzeVideo = async () => {
    if (!recordedVideo || !sessionRef.current) return;

    setMode('analyzing');
    setAnalysisProgress(0);
    analyzedPosesRef.current = [];

    const video = document.createElement('video');
    video.src = recordedVideo;
    video.muted = true;

    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
    });

    const duration = video.duration;
    const frameRate = 10; // Process 10 fps for analysis
    const frameInterval = 1 / frameRate;

    for (let time = 0; time < duration; time += frameInterval) {
      video.currentTime = time;
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      // Pass video directly for processing
      const joints = await processFrame(video);
      console.log("Analyzing time", time, "got joints?", !!joints);
      if (joints) {
        analyzedPosesRef.current.push({ time, joints });
      }

      // Update progress
      setAnalysisProgress((time / duration) * 100);
    }

    setAnalysisProgress(100);
    setMode('playback');
  };

  // Play analyzed video with skeleton overlay
  const playAnalyzedVideo = () => {
    if (isPlaying) return; // Guard against multiple clicks
    if (!recordedVideo || !videoRef.current || !canvasRef.current || !overlayRef.current) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const octx = overlay.getContext('2d');

    if (!ctx || !octx) return;

    // Use a separate video element to prevent interfering with main ref stream if any
    const playbackVideo = document.createElement('video');
    playbackVideo.src = recordedVideo;
    playbackVideo.muted = true;
    playbackVideo.playsInline = true;

    playbackVideo.onloadedmetadata = () => {
      canvas.width = playbackVideo.videoWidth;
      canvas.height = playbackVideo.videoHeight;
      overlay.width = playbackVideo.videoWidth;
      overlay.height = playbackVideo.videoHeight;
      playbackVideo.play();
    };

    const drawFrame = () => {
      if (modeRef.current !== 'playback') {
        playbackVideo.pause();
        return;
      }

      if (playbackVideo.readyState >= playbackVideo.HAVE_CURRENT_DATA) {
        ctx.drawImage(playbackVideo, 0, 0, canvas.width, canvas.height);

        // Find closest pose
        const currentTime = playbackVideo.currentTime;
        const poses = analyzedPosesRef.current;

        let closestPose = null;
        let minDiff = Infinity;

        for (let i = 0; i < poses.length; i++) {
          const diff = Math.abs(poses[i].time - currentTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestPose = poses[i].joints;
          }
        }

        octx.clearRect(0, 0, canvas.width, canvas.height);
        if (closestPose && minDiff < 0.2) {
          drawSkeleton(octx, closestPose, canvas.width, canvas.height);
        }
      }

      if (!playbackVideo.paused && !playbackVideo.ended) {
        requestAnimationFrame(drawFrame);
      } else if (playbackVideo.ended) {
         // Stop when ended
      } else {
        requestAnimationFrame(drawFrame);
      }
    };

    playbackVideo.onplay = () => {
      setIsPlaying(true);
      drawFrame();
    };

    playbackVideo.onpause = () => {
      setIsPlaying(false);
    };

    playbackVideo.onended = () => {
      setIsPlaying(false);
    };
  };

  // Preprocess video frame for model input with person detection
  const preprocessFrame = async (_ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    try {
      const ort = (window as any).ort;
      const modelSize = 224;

      // Detect person bounding box for optimal cropping (much faster inference)
      const bbox = await detectPerson(canvas) as any;
      detectedPersonRef.current = bbox;

      // Create offscreen canvas for preprocessing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = modelSize;
      tempCanvas.height = modelSize;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      // Draw cropped person region resized to 256x256
      tempCtx.drawImage(
        canvas,
        bbox.x, bbox.y, bbox.width, bbox.height,  // Source crop (person only)
        0, 0, modelSize, modelSize                 // Dest resize
      );

      const imageData = tempCtx.getImageData(0, 0, modelSize, modelSize);

      // Convert to CHW format and normalize (ImageNet stats)
      const pixels = imageData.data;
      const float32Data = new Float32Array(3 * modelSize * modelSize);
      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];

      for (let i = 0; i < modelSize * modelSize; i++) {
        // RGB channels
        float32Data[i] = ((pixels[i * 4] / 255.0) - mean[0]) / std[0];  // R
        float32Data[modelSize * modelSize + i] = ((pixels[i * 4 + 1] / 255.0) - mean[1]) / std[1];  // G
        float32Data[2 * modelSize * modelSize + i] = ((pixels[i * 4 + 2] / 255.0) - mean[2]) / std[2];  // B
      }

      // Create tensor
      return new ort.Tensor('float32', float32Data, [1, 3, modelSize, modelSize]);
    } catch (err) {
      console.error('Preprocessing error:', err);
      return null;
    }
  };

  // Parse model output to screen coordinates (accounting for crop)
  const parseModelOutput = (outputData: any, screenWidth: number, screenHeight: number) => {
    const joints = [];
    const numJoints = 24;

    // Get crop region
    const crop = detectedPersonRef.current || { x: 0, y: 0, width: screenWidth, height: screenHeight };

    // Model outputs normalized coordinates, convert to screen space
    for (let i = 0; i < numJoints; i++) {
      const idx = i * 3;
      // Map from normalized [-1, 1] to crop region, then to screen
      const normalizedX = (outputData[idx] + 1) / 2;  // Convert to [0, 1]
      const normalizedY = (outputData[idx + 1] + 1) / 2;

      joints.push({
        x: crop.x + normalizedX * crop.width,
        y: crop.y + normalizedY * crop.height,
        z: outputData[idx + 2],
        confidence: 0.9
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
    if (isModelLoaded && isStreamActive && (mode === 'live' || mode === 'recording')) {
      animationRef.current = requestAnimationFrame(() => processFrame());
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isModelLoaded, isStreamActive, mode]);

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
        setIsStreamActive(false);
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
              {isModelLoaded ? '✓ Ready' : <Loader style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }} />}
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            padding: '12px 16px',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>MODE</div>
            <div style={{ fontSize: '16px', fontWeight: '600', textTransform: 'uppercase' }}>
              {mode === 'live' && '🔴 Live'}
              {mode === 'recording' && '⏺️ Recording'}
              {mode === 'analyzing' && '📊 Analysis'}
              {mode === 'playback' && '▶️ Playback'}
            </div>
          </div>

          {mode === 'live' && (
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
          )}

          {mode === 'analyzing' && analysisProgress > 0 && (
            <div style={{
              background: 'rgba(0, 255, 136, 0.05)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              padding: '12px 16px',
              borderRadius: '4px',
              gridColumn: 'span 2'
            }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '8px' }}>ANALYSIS PROGRESS</div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${analysisProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ff88, #00d4aa)',
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
                {analysisProgress.toFixed(0)}%
              </div>
            </div>
          )}
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
            <AlertCircle style={{ color: '#ff5252' }} />
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
            disabled={!isModelLoaded || mode !== 'live'}
            style={{
              background: isModelLoaded && mode === 'live' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(128, 128, 128, 0.15)',
              border: `2px solid ${isModelLoaded && mode === 'live' ? '#00ff88' : '#666'}`,
              color: isModelLoaded && mode === 'live' ? '#00ff88' : '#999',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '1px',
              cursor: isModelLoaded && mode === 'live' ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase'
            }}
            onMouseEnter={e => {
              if (isModelLoaded && mode === 'live') {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.3)';
              }
            }}
            onMouseLeave={e => {
              if (isModelLoaded && mode === 'live') {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Video />
            Start Camera
          </button>

          <button
            onClick={toggleCamera}
            disabled={!streamRef.current || deviceInfo.cameras < 2 || mode !== 'live'}
            style={{
              background: streamRef.current && deviceInfo.cameras >= 2 && mode === 'live' ? 'rgba(100, 181, 246, 0.15)' : 'rgba(128, 128, 128, 0.15)',
              border: `2px solid ${streamRef.current && deviceInfo.cameras >= 2 && mode === 'live' ? '#64b5f6' : '#666'}`,
              color: streamRef.current && deviceInfo.cameras >= 2 && mode === 'live' ? '#64b5f6' : '#999',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '1px',
              cursor: streamRef.current && deviceInfo.cameras >= 2 && mode === 'live' ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase'
            }}
            onMouseEnter={e => {
              if (streamRef.current && deviceInfo.cameras >= 2 && mode === 'live') {
                e.currentTarget.style.background = 'rgba(100, 181, 246, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 181, 246, 0.3)';
              }
            }}
            onMouseLeave={e => {
              if (streamRef.current && deviceInfo.cameras >= 2 && mode === 'live') {
                e.currentTarget.style.background = 'rgba(100, 181, 246, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Camera />
            Switch ({cameraMode === 'user' ? 'Front' : 'Rear'})
          </button>

          {mode === 'live' && streamRef.current && (
            <button
              onClick={startRecording}
              style={{
                background: 'rgba(255, 82, 82, 0.15)',
                border: '2px solid #ff5252',
                color: '#ff5252',
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                textTransform: 'uppercase'
              }}
            >
              ● Record
            </button>
          )}

          {mode === 'recording' && (
            <button
              onClick={stopRecording}
              style={{
                background: 'rgba(255, 82, 82, 0.25)',
                border: '2px solid #ff5252',
                color: '#ff5252',
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                animation: 'pulse 1s ease-in-out infinite'
              }}
            >
              ■ Stop Recording
            </button>
          )}

          <input
            ref={videoFileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => videoFileInputRef.current?.click()}
            disabled={!isModelLoaded}
            style={{
              background: isModelLoaded ? 'rgba(156, 39, 176, 0.15)' : 'rgba(128, 128, 128, 0.15)',
              border: `2px solid ${isModelLoaded ? '#9c27b0' : '#666'}`,
              color: isModelLoaded ? '#9c27b0' : '#999',
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
          >
            📁 Upload Video
          </button>

          {mode === 'analyzing' && recordedVideo && analysisProgress === 0 && (
            <button
              onClick={analyzeVideo}
              style={{
                background: 'rgba(255, 193, 7, 0.15)',
                border: '2px solid #ffc107',
                color: '#ffc107',
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                textTransform: 'uppercase'
              }}
            >
              ▶ Analyze Video
            </button>
          )}

          {mode === 'playback' && (
            <button
              onClick={playAnalyzedVideo}
              style={{
                background: 'rgba(0, 255, 136, 0.15)',
                border: '2px solid #00ff88',
                color: '#00ff88',
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                textTransform: 'uppercase'
              }}
            >
              ▶ Play Result
            </button>
          )}

          {(mode === 'analyzing' || mode === 'playback') && (
            <button
              onClick={() => {
                setMode('live');
                setRecordedVideo(null);
                setAnalysisProgress(0);
                setIsPlaying(false);
              }}
              style={{
                background: 'rgba(100, 181, 246, 0.15)',
                border: '2px solid #64b5f6',
                color: '#64b5f6',
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                textTransform: 'uppercase'
              }}
            >
              ← Back to Live
            </button>
          )}
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
          {!streamRef.current && mode === 'live' && (
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
          )}

          {mode === 'playback' && !isPlaying && (
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
              <Video style={{ color: '#00ff88', opacity: 0.5, width: '64px', height: '64px' }} />
              <div style={{ fontSize: '16px', opacity: 0.7 }}>
                Analysis complete. Click "Play Result" to view.
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
            <li>Include ONNX Runtime Web: <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '2px 6px', borderRadius: '2px' }}>&lt;script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"&gt;&lt;/script&gt;</code></li>
            <li>Optional - Include MediaPipe Pose for person detection (speeds up inference): <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '2px 6px', borderRadius: '2px' }}>&lt;script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"&gt;&lt;/script&gt;</code></li>
            <li>InstantHMR model loads automatically from HuggingFace</li>
            <li>Live mode: Click "Start Camera" → pose detection runs in real-time</li>
            <li>Record mode: "Record" button → "Stop Recording" → "Analyze Video"</li>
            <li>Upload mode: "Upload Video" → select file → "Analyze Video"</li>
          </ol>
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '4px', fontSize: '12px' }}>
            <strong>Performance Optimization:</strong> Person detection crops frame to person region before InstantHMR inference, significantly improving speed. Falls back to center crop if MediaPipe unavailable.
          </div>
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
