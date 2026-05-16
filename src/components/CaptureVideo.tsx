import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon, FileVideoIcon } from './LucideIcons';

interface CaptureVideoProps {
  onVideoCaptured: (file: File) => void;
}

const CaptureVideo: React.FC<CaptureVideoProps> = ({ onVideoCaptured }) => {
  const [mode, setMode] = useState<'upload' | 'record'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false // Depending on if audio is needed, but typically not for pose tracking MVP
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e) {
      console.error("Failed to access camera", e);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];

    // Choose appropriate mime type
    // Android Chrome supports webm, Safari iOS supports mp4/webm.
    // Just using the default works best across devices.
    let mimeType = '';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }

    const options = mimeType ? { mimeType } : undefined;
    const mediaRecorder = new MediaRecorder(stream, options);
    // If we didn't set it explicitly, grab what the browser decided to use
    if (!mimeType) mimeType = mediaRecorder.mimeType;
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `recorded_attempt_${Date.now()}.${extension}`, { type: mimeType });
      onVideoCaptured(file);
      chunksRef.current = [];
    };

    mediaRecorder.start(100); // collect 100ms chunks of data
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopCamera();
      setMode('upload'); // return to default state after recording
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onVideoCaptured(files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleMode = async (newMode: 'upload' | 'record') => {
    if (newMode === mode) return;

    if (newMode === 'record') {
      setMode('record');
      await startCamera();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        stopCamera();
      }
      setMode('upload');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mb-8">
      <div className="flex gap-4 mb-4 justify-center">
        <button
          onClick={() => toggleMode('upload')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'upload' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Upload Video
        </button>
        <button
          onClick={() => toggleMode('record')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'record' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Record Camera
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50 transition-colors rounded-2xl p-10 text-center flex flex-col items-center justify-center group">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            data-testid="upload-video-input"
          />
          <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
            <UploadIcon className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Drag and drop your video here</h3>
          <p className="text-sm text-slate-500">or click to browse from your computer</p>
          <div className="mt-6">
            <span className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-full font-medium shadow-sm pointer-events-none inline-flex items-center gap-2">
              <FileVideoIcon className="w-4 h-4" /> Select Video
            </span>
          </div>
        </div>
      ) : (
        <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center relative min-h-[300px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[500px] object-contain bg-black"
          />
          <div className="absolute bottom-6 flex gap-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 flex items-center gap-2"
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 border border-slate-600 flex items-center gap-2"
              >
                <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                Stop & Process
              </button>
            )}
          </div>
          {isRecording && (
             <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
               <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
               <span className="text-white text-sm font-medium tracking-wider">REC</span>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CaptureVideo;
