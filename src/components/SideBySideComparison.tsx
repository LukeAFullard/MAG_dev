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
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Video 1 (Reference)</label>
                    <input type="file" accept="video/*" onChange={handleFileUpload1} className="w-full text-sm" data-testid="upload-video-1" />
                </div>
                <div className="bg-gray-50 p-4 rounded border">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Video 2 (Attempt)</label>
                    <input type="file" accept="video/*" onChange={handleFileUpload2} className="w-full text-sm" data-testid="upload-video-2" />
                </div>
            </div>

            <div className={`relative bg-gray-900 rounded overflow-hidden shadow-inner flex items-center justify-center min-h-[300px] ${isOverlayMode ? 'max-w-3xl mx-auto' : 'w-full'}`}>
                {(!video1 && !video2) && <p className="text-gray-500 italic">Upload videos to begin comparison</p>}

                <div className={`${isOverlayMode ? 'relative w-full aspect-video' : 'flex w-full h-full'}`}>
                    {video1 && (
                        <div className={`${isOverlayMode ? 'absolute inset-0' : 'flex-1 border-r border-gray-800'}`}>
                            <video ref={video1Ref} src={video1} className="w-full h-full object-contain" muted={isOverlayMode || !!video2} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                        </div>
                    )}
                    {video2 && (
                        <div className={`${isOverlayMode ? 'absolute inset-0 opacity-50 mix-blend-screen' : 'flex-1'}`}>
                            <video ref={video2Ref} src={video2} className="w-full h-full object-contain" muted />
                        </div>
                    )}
                </div>
            </div>

            {(video1 || video2) && (
                <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-4 bg-gray-100 p-3 rounded shadow-inner">
                        <button onClick={togglePlay} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium w-24" data-testid="play-pause-btn">
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
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

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Speed</label>
                            <select value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="border p-2 rounded outline-none focus:ring focus:ring-blue-200 bg-white min-w-[80px]">
                                <option value="0.25">0.25x</option>
                                <option value="0.5">0.5x</option>
                                <option value="1">1x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>

                        <div className="flex-1"></div>

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
