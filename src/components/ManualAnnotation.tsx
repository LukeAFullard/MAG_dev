import React, { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react';

// A mock definition for the component props
interface ManualAnnotationProps {
  videoUrl?: string; // Optional for now, we can use a placeholder
}

export const ManualAnnotation: React.FC<ManualAnnotationProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Drawing state
  const [mode, setMode] = useState<'view' | 'draw' | 'edit-pose'>('view');
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [currentLine, setCurrentLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Tags state
  const [tags, setTags] = useState<{ time: number; text: string }[]>([]);
  const [newTag, setNewTag] = useState('');

  // Mock pose points
  const [posePoints, setPosePoints] = useState<{ id: number, x: number, y: number }[]>([
    { id: 1, x: 100, y: 100 },
    { id: 2, x: 150, y: 150 },
  ]);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [lines, currentLine, posePoints, mode]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    lines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    });

    if (currentLine) {
      ctx.beginPath();
      ctx.moveTo(currentLine.x1, currentLine.y1);
      ctx.lineTo(currentLine.x2, currentLine.y2);
      ctx.stroke();
    }

    // Draw pose points
    posePoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = mode === 'edit-pose' ? 'blue' : 'green';
      ctx.fill();
    });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const stepFrame = (forward: boolean) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    // Assuming ~30fps for stepping
    const step = 1 / 30;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + (forward ? step : -step)));
  };

  const handleCanvasMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'draw') {
      setIsDrawing(true);
      setCurrentLine({ x1: x, y1: y, x2: x, y2: y });
    } else if (mode === 'edit-pose') {
      const point = posePoints.find(p => Math.hypot(p.x - x, p.y - y) < 10);
      if (point) {
        setDraggingPoint(point.id);
      }
    }
  };

  const handleCanvasMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'draw' && isDrawing && currentLine) {
      setCurrentLine({ ...currentLine, x2: x, y2: y });
    } else if (mode === 'edit-pose' && draggingPoint !== null) {
      setPosePoints(prev => prev.map(p => p.id === draggingPoint ? { ...p, x, y } : p));
    }
  };

  const handleCanvasMouseUp = () => {
    if (mode === 'draw' && isDrawing && currentLine) {
      setLines(prev => [...prev, currentLine]);
      setCurrentLine(null);
      setIsDrawing(false);
    } else if (mode === 'edit-pose' && draggingPoint !== null) {
      setDraggingPoint(null);
    }
  };

  const addTag = () => {
    if (newTag.trim()) {
      setTags(prev => [...prev, { time: currentTime, text: newTag }]);
      setNewTag('');
    }
  };

  return (
    <div className="border p-4 rounded bg-white shadow-sm" data-testid="manual-annotation">
      <h3 className="font-semibold text-gray-700 mb-4">Manual Annotation Tools</h3>

      <div className="relative inline-block border bg-black rounded overflow-hidden">
        {/* Placeholder video element */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-[640px] h-[360px]"
            data-testid="annotation-video"
          />
        ) : (
          <div className="w-[640px] h-[360px] bg-gray-200 flex items-center justify-center text-gray-500">
            No video loaded
            <video ref={videoRef} src="" className="hidden" />
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute top-0 left-0 cursor-crosshair"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          data-testid="annotation-canvas"
        />
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 border p-2 rounded bg-gray-50">
          <button onClick={() => stepFrame(false)} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded" data-testid="btn-prev-frame">{'<'} Frame</button>
          <button onClick={togglePlay} className="px-4 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded" data-testid="btn-play-pause">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => stepFrame(true)} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded" data-testid="btn-next-frame">Frame {'>'}</button>
          <span className="text-sm font-mono">{currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span>
        </div>

        <div className="flex items-center gap-2 border p-2 rounded bg-gray-50">
          <span className="text-sm font-semibold">Mode:</span>
          <button onClick={() => setMode('view')} className={`px-2 py-1 rounded text-sm ${mode === 'view' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`} data-testid="mode-view">View</button>
          <button onClick={() => setMode('draw')} className={`px-2 py-1 rounded text-sm ${mode === 'draw' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`} data-testid="mode-draw">Draw Line</button>
          <button onClick={() => setMode('edit-pose')} className={`px-2 py-1 rounded text-sm ${mode === 'edit-pose' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`} data-testid="mode-edit">Edit Pose</button>
          <button onClick={() => setLines([])} className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm">Clear Drawings</button>
        </div>
      </div>

      {/* Tags Section */}
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags & Notes</h4>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            className="border rounded p-1 flex-1 text-sm"
            data-testid="tag-input"
          />
          <button onClick={addTag} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700" data-testid="add-tag-btn">Add Tag</button>
        </div>
        <ul className="space-y-1 max-h-32 overflow-y-auto">
          {tags.map((tag, idx) => (
            <li key={idx} className="text-sm bg-gray-50 p-1 rounded border flex gap-2">
              <span className="font-mono text-blue-600 bg-blue-100 px-1 rounded">{tag.time.toFixed(2)}s</span>
              <span>{tag.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ManualAnnotation;
