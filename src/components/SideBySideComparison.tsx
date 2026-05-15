import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon, StepBackIcon, StepForwardIcon } from './LucideIcons';

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
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-xl shadow-sm mt-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Side-by-Side Comparison</h2>
            <p className="text-slate-500 mb-6">Compare two clips, sync to an anchor frame, and overlay to detect slight form deviations.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Video 1 (Reference)</label>
                        {video1 && (
                            <button onClick={handleSetSyncPoint1} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200 transition-colors">
                                Set Sync 1 {syncPoint1 !== null && <span className="opacity-75">({syncPoint1.toFixed(2)}s)</span>}
                            </button>
                        )}
                    </div>
                    <input type="file" accept="video/*" onChange={handleFileUpload1} className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" data-testid="upload-video-1" />
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Video 2 (Attempt)</label>
                        {video2 && (
                            <button onClick={handleSetSyncPoint2} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200 transition-colors">
                                Set Sync 2 {syncPoint2 !== null && <span className="opacity-75">({syncPoint2.toFixed(2)}s)</span>}
                            </button>
                        )}
                    </div>
                    <input type="file" accept="video/*" onChange={handleFileUpload2} className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" data-testid="upload-video-2" />
                </div>
            </div>

            <div className={`relative bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center min-h-[400px] border-4 border-slate-800 ${isOverlayMode ? 'max-w-3xl mx-auto' : 'w-full'}`}>
                {(!video1 && !video2) && <p className="text-slate-500 font-medium">Upload videos to begin comparison</p>}

                <div className={`${isOverlayMode ? 'relative w-full aspect-video' : 'flex w-full h-full'}`}>
                    {video1 && (
                        <div className={`${isOverlayMode ? 'absolute inset-0' : 'flex-1 border-r border-slate-700'}`} style={{ opacity: isOverlayMode ? video1Opacity : 1 }}>
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
                <div className="mt-8 space-y-6">
                    <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-xl shadow-inner border border-slate-200">
                        <div className="flex gap-2">
                            <button onClick={() => stepFrame(false)} className="bg-white border border-slate-300 text-slate-700 p-2.5 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm" data-testid="step-back-btn" title="Step Back">
                                <StepBackIcon className="w-5 h-5" />
                            </button>
                            <button onClick={togglePlay} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium min-w-[120px] flex justify-center items-center gap-2 shadow-sm transition-colors" data-testid="play-pause-btn">
                                {isPlaying ? <><PauseIcon className="w-5 h-5"/> Pause</> : <><PlayIcon className="w-5 h-5"/> Play</>}
                            </button>
                            <button onClick={() => stepFrame(true)} className="bg-white border border-slate-300 text-slate-700 p-2.5 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm" data-testid="step-forward-btn" title="Step Forward">
                                <StepForwardIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <span className="text-sm font-mono font-medium text-slate-600 w-16 text-right bg-white py-1 px-2 rounded border border-slate-200">{currentTime.toFixed(2)}s</span>

                        <div className="flex-1 flex items-center relative group">
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                step="0.01"
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
                            />
                        </div>

                        <span className="text-sm font-mono font-medium text-slate-500 w-16">{duration.toFixed(2)}s</span>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-4 items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sync Offset (s)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={syncOffset}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSyncOffset(val);
                                    syncVideos(val);
                                }}
                                className="border border-slate-300 p-2 w-24 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-center font-mono"
                                data-testid="sync-offset-input"
                            />
                        </div>

                        <div className="flex flex-col gap-2 w-32">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Speed</label>
                                <span className="text-xs font-mono font-medium text-slate-700">{playbackRate}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.1"
                                value={playbackRate}
                                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                className="h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                data-testid="playback-speed-slider"
                            />
                        </div>

                        <div className={`flex flex-col gap-2 w-32 transition-opacity ${!isOverlayMode && 'opacity-50'}`}>
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">V1 Opacity</label>
                                <span className="text-xs font-mono font-medium text-slate-700">{video1Opacity}</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={video1Opacity}
                                onChange={(e) => setVideo1Opacity(parseFloat(e.target.value))}
                                className="h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                disabled={!isOverlayMode}
                                data-testid="opacity-1-slider"
                            />
                        </div>

                        <div className={`flex flex-col gap-2 w-32 transition-opacity ${!isOverlayMode && 'opacity-50'}`}>
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">V2 Opacity</label>
                                <span className="text-xs font-mono font-medium text-slate-700">{video2Opacity}</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={video2Opacity}
                                onChange={(e) => setVideo2Opacity(parseFloat(e.target.value))}
                                className="h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                disabled={!isOverlayMode}
                                data-testid="opacity-2-slider"
                            />
                        </div>

                        <div className="flex-1"></div>

                        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md transition-colors ${isFlipped ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-200 text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={isFlipped}
                                    onChange={(e) => setIsFlipped(e.target.checked)}
                                    className="hidden"
                                    data-testid="flip-video-checkbox"
                                />
                                <span className="text-sm font-semibold select-none">Flip V2</span>
                            </label>

                            <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md transition-colors ${isOverlayMode ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={isOverlayMode}
                                    onChange={(e) => setIsOverlayMode(e.target.checked)}
                                    className="hidden"
                                    data-testid="overlay-mode-checkbox"
                                />
                                <span className="text-sm font-semibold select-none">Overlay Mode</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SideBySideComparison;
