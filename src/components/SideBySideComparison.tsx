import React, { useState, useRef, useEffect } from 'react';

const SideBySideComparison: React.FC = () => {
    const [video1, setVideo1] = useState<string | null>(null);
    const [video2, setVideo2] = useState<string | null>(null);
    const video1Ref = useRef<HTMLVideoElement>(null);
    const video2Ref = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [syncOffset, setSyncOffset] = useState(0); // offset of video 2 relative to video 1 in seconds
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [syncPoint1, setSyncPoint1] = useState<number | null>(null);
    const [syncPoint2, setSyncPoint2] = useState<number | null>(null);
    const [video1Opacity, setVideo1Opacity] = useState(1.0);
    const [video2Opacity, setVideo2Opacity] = useState(0.5);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFileUpload1 = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (video1) URL.revokeObjectURL(video1);
            setVideo1(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleFileUpload2 = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (video2) URL.revokeObjectURL(video2);
            setVideo2(URL.createObjectURL(e.target.files[0]));
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            video1Ref.current?.pause();
            video2Ref.current?.pause();
        } else {
            video1Ref.current?.play();
            video2Ref.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (video1Ref.current) {
            video1Ref.current.currentTime = time;
        }
        setCurrentTime(time);
        if (video2Ref.current) {
            video2Ref.current.currentTime = Math.max(0, time - syncOffset);
        }
    };

    const syncVideos = (offset: number) => {
        if (video1Ref.current && video2Ref.current) {
            video2Ref.current.currentTime = Math.max(0, video1Ref.current.currentTime - offset);
        }
    };

    const handleSetSyncPoint1 = () => {
        if (video1Ref.current) {
            const time = video1Ref.current.currentTime;
            setSyncPoint1(time);
            if (syncPoint2 !== null) {
                const newOffset = time - syncPoint2;
                setSyncOffset(newOffset);
                syncVideos(newOffset);
            }
        }
    };

    const handleSetSyncPoint2 = () => {
        if (video2Ref.current) {
            const time = video2Ref.current.currentTime;
            setSyncPoint2(time);
            if (syncPoint1 !== null) {
                const newOffset = syncPoint1 - time;
                setSyncOffset(newOffset);
                syncVideos(newOffset);
            }
        }
    };

    const stepFrame = (forward: boolean) => {
        const step = 1 / 30; // approx 30 fps
        if (video1Ref.current) {
            video1Ref.current.pause();
            video1Ref.current.currentTime = Math.max(0, video1Ref.current.currentTime + (forward ? step : -step));
            setCurrentTime(video1Ref.current.currentTime);
        }
        if (video2Ref.current) {
            video2Ref.current.pause();
            video2Ref.current.currentTime = Math.max(0, video2Ref.current.currentTime + (forward ? step : -step));
        }
        setIsPlaying(false);
    };

    useEffect(() => {
        if (video1Ref.current) video1Ref.current.playbackRate = playbackRate;
        if (video2Ref.current) video2Ref.current.playbackRate = playbackRate;
    }, [playbackRate, video1, video2]);

    useEffect(() => {
        const v1 = video1Ref.current;
        if (v1) {
            const handleTimeUpdate = () => {
                setCurrentTime(v1.currentTime);
                if (video2Ref.current) {
                    const expectedTime = Math.max(0, v1.currentTime - syncOffset);
                    if (Math.abs(video2Ref.current.currentTime - expectedTime) > 0.25 && !v1.paused) {
                        video2Ref.current.currentTime = expectedTime;
                    }
                }
            };
            const handleLoadedMetadata = () => {
                setDuration(v1.duration);
            };
            v1.addEventListener('timeupdate', handleTimeUpdate);
            v1.addEventListener('loadedmetadata', handleLoadedMetadata);
            return () => {
                v1.removeEventListener('timeupdate', handleTimeUpdate);
                v1.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [syncOffset, video1, video2]);

    useEffect(() => {
        return () => {
            if (video1) URL.revokeObjectURL(video1);
            if (video2) URL.revokeObjectURL(video2);
        };
    }, [video1, video2]);


    return (
        <div className="border border-gray-200 p-6 rounded-lg bg-white shadow-sm mt-8">
            <h2 className="text-xl font-bold mb-2">Side-by-Side Comparison</h2>
            <p className="text-gray-600 mb-6 text-sm">Compare two clips, sync to an anchor frame, and overlay to detect slight form deviations.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded border">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-gray-700">Video 1 (Reference)</label>
                        {video1 && (
                            <button onClick={handleSetSyncPoint1} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                                Set Sync Point 1 {syncPoint1 !== null && `(${syncPoint1.toFixed(2)}s)`}
                            </button>
                        )}
                    </div>
                    <input type="file" accept="video/*" onChange={handleFileUpload1} className="w-full text-sm" data-testid="upload-video-1" />
                </div>
                <div className="bg-gray-50 p-4 rounded border">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-gray-700">Video 2 (Attempt)</label>
                        {video2 && (
                            <button onClick={handleSetSyncPoint2} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                                Set Sync Point 2 {syncPoint2 !== null && `(${syncPoint2.toFixed(2)}s)`}
                            </button>
                        )}
                    </div>
                    <input type="file" accept="video/*" onChange={handleFileUpload2} className="w-full text-sm" data-testid="upload-video-2" />
                </div>
            </div>

            <div className={`relative bg-gray-900 rounded overflow-hidden shadow-inner flex items-center justify-center min-h-[300px] ${isOverlayMode ? 'max-w-3xl mx-auto' : 'w-full'}`}>
                {(!video1 && !video2) && <p className="text-gray-500 italic">Upload videos to begin comparison</p>}

                <div className={`${isOverlayMode ? 'relative w-full aspect-video' : 'flex w-full h-full'}`}>
                    {video1 && (
                        <div className={`${isOverlayMode ? 'absolute inset-0' : 'flex-1 border-r border-gray-800'}`} style={{ opacity: isOverlayMode ? video1Opacity : 1 }}>
                            <video ref={video1Ref} src={video1} className="w-full h-full object-contain" muted={isOverlayMode || !!video2} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                        </div>
                    )}
                    {video2 && (
                        <div className={`${isOverlayMode ? 'absolute inset-0 mix-blend-screen pointer-events-none' : 'flex-1'}`} style={{ opacity: isOverlayMode ? video2Opacity : 1 }}>
                            <video ref={video2Ref} src={video2} className={`w-full h-full object-contain ${isFlipped ? 'scale-x-[-1]' : ''}`} muted />
                        </div>
                    )}
                </div>
            </div>

            {(video1 || video2) && (
                <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-4 bg-gray-100 p-3 rounded shadow-inner">
                        <div className="flex gap-2">
                            <button onClick={() => stepFrame(false)} className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 font-medium" data-testid="step-back-btn">
                                {'<'}
                            </button>
                            <button onClick={togglePlay} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium w-24" data-testid="play-pause-btn">
                                {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button onClick={() => stepFrame(true)} className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 font-medium" data-testid="step-forward-btn">
                                {'>'}
                            </button>
                        </div>
                        <span className="text-xs font-mono text-gray-500 w-12 text-right">{currentTime.toFixed(1)}s</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            step="0.01"
                            value={currentTime}
                            onChange={handleSeek}
                            className="flex-1 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-gray-500 w-12">{duration.toFixed(1)}s</span>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center bg-gray-50 p-4 rounded border">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sync Offset (s)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={syncOffset}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSyncOffset(val);
                                    syncVideos(val);
                                }}
                                className="border p-2 w-24 rounded focus:ring focus:ring-blue-200 outline-none"
                                data-testid="sync-offset-input"
                            />
                        </div>

                        <div className="flex flex-col gap-1 w-32">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Speed ({playbackRate}x)</label>
                            <input
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.1"
                                value={playbackRate}
                                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                className="cursor-pointer"
                                data-testid="playback-speed-slider"
                            />
                        </div>

                        <div className="flex flex-col gap-1 w-32">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">V1 Opacity ({video1Opacity})</label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={video1Opacity}
                                onChange={(e) => setVideo1Opacity(parseFloat(e.target.value))}
                                className="cursor-pointer"
                                disabled={!isOverlayMode}
                                data-testid="opacity-1-slider"
                            />
                        </div>

                        <div className="flex flex-col gap-1 w-32">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">V2 Opacity ({video2Opacity})</label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={video2Opacity}
                                onChange={(e) => setVideo2Opacity(parseFloat(e.target.value))}
                                className="cursor-pointer"
                                disabled={!isOverlayMode}
                                data-testid="opacity-2-slider"
                            />
                        </div>

                        <div className="flex-1"></div>

                        <label className="flex items-center gap-2 cursor-pointer bg-white border px-4 py-2 rounded shadow-sm hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={isFlipped}
                                onChange={(e) => setIsFlipped(e.target.checked)}
                                className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"
                                data-testid="flip-video-checkbox"
                            />
                            <span className="text-sm font-semibold text-gray-800">Flip V2 Horizontally</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white border px-4 py-2 rounded shadow-sm hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={isOverlayMode}
                                onChange={(e) => setIsOverlayMode(e.target.checked)}
                                className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"
                                data-testid="overlay-mode-checkbox"
                            />
                            <span className="text-sm font-semibold text-gray-800">Overlay Mode</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SideBySideComparison;
