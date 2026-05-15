import React, { useEffect, useState, useRef } from 'react';
import { initDb, addAthlete, getAthletes, pruneOldVideos } from './db';
import { InferenceEngine } from './inference';
import { PipelineManager, type VideoProcessingJob } from './pipeline';
import CaptureGuidelines from './components/CaptureGuidelines';
import CameraCalibration from './components/CameraCalibration';
import SideBySideComparison from './components/SideBySideComparison';
import SessionDashboard from './components/SessionDashboard';
import ManualAnnotation from './components/ManualAnnotation';

const App: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<string>('Initializing...');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [newAthleteName, setNewAthleteName] = useState('');
  const [inferenceStatus, setInferenceStatus] = useState<string>('Initializing...');
  const [isWebGPU, setIsWebGPU] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<VideoProcessingJob[]>([]);
  const [selectedAttemptForAnnotation, setSelectedAttemptForAnnotation] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function setup() {
      // Setup DB
      try {
        await initDb();
        setDbStatus('Connected');
        await fetchAthletes();
        await pruneOldVideos(); // Trigger pruning on startup
      } catch (err: any) {
        setDbStatus(`Error: ${err.message}`);
      }

      // Setup Inference Engine
      try {
        const engine = InferenceEngine.getInstance();
        await engine.init();
        setInferenceStatus('Ready');
        setIsWebGPU(engine.isWebGPUSupported);
      } catch (err: any) {
        setInferenceStatus(`Error: ${err.message}`);
      }

      // Setup Pipeline Manager
      const pipeline = PipelineManager.getInstance();
      pipeline.setOnJobUpdate((updatedJob) => {
        setJobs(prevJobs => {
          const index = prevJobs.findIndex(j => j.id === updatedJob.id);
          if (index >= 0) {
            const newJobs = [...prevJobs];
            newJobs[index] = updatedJob;
            return newJobs;
          }
          return [...prevJobs, updatedJob];
        });
      });
      setJobs(pipeline.getAllJobs());
    }
    setup();
  }, []);

  const fetchAthletes = async () => {
    const list = await getAthletes();
    setAthletes(list);
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthleteName.trim()) return;
    await addAthlete(newAthleteName);
    setNewAthleteName('');
    await fetchAthletes();
  };

  const handleSimulateVideo = async () => {
    try {
        // Fetch a small test video from the public directory
        const response = await fetch('/test_clip.mp4');
        if (!response.ok) throw new Error("Test clip not found");

        const blob = await response.blob();
        const file = new File([blob], `demo_video_${Date.now()}.mp4`, { type: 'video/mp4' });

        // Use the standard upload flow which saves to OPFS and starts the pipeline
        const e = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(e);

    } catch (e) {
        alert("Could not load test video. Please make sure test_clip.mp4 exists in the public directory.");
        console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      try {
        // 1. Save original video to OPFS
        const { saveVideoToOPFS } = await import('./db');
        const opfsFilename = await saveVideoToOPFS(file);
        console.log(`Saved video to OPFS: ${opfsFilename}`);

        // 2. Start the processing pipeline
        const pipeline = PipelineManager.getInstance();
        pipeline.startJob(opfsFilename, file); // Pass the OPFS filename so it can be tracked
      } catch (err) {
        console.error('Failed to save file to OPFS', err);
        alert('Failed to process video file. Ensure your browser supports OPFS.');
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSavePoses = async (poses: any[]) => {
    if (!selectedAttemptForAnnotation) return;

    try {
      const { updateAttemptMetrics } = await import('./db');
      const metrics = JSON.parse(selectedAttemptForAnnotation.metrics_json || '{}');
      metrics.poses = poses; // Update the poses in the JSON
      const updatedMetricsJson = JSON.stringify(metrics);

      await updateAttemptMetrics(selectedAttemptForAnnotation.id, updatedMetricsJson);

      // Update local state to reflect the saved changes so switching back and forth works
      setSelectedAttemptForAnnotation({
        ...selectedAttemptForAnnotation,
        metrics_json: updatedMetricsJson
      });

      alert('Poses saved successfully!');
    } catch (e) {
      console.error('Failed to save poses', e);
      alert('Failed to save poses. Check console for details.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold">MAG_dev: Gymnastics Analysis Assistant</h1>
        <div className="flex gap-4">
          <div className="text-sm">DB Status: <span className="font-mono bg-blue-800 px-2 py-1 rounded">{dbStatus}</span></div>
          <div className="text-sm">Inference: <span className={`font-mono px-2 py-1 rounded ${inferenceStatus === 'Ready' ? 'bg-green-700' : 'bg-blue-800'}`}>{inferenceStatus} {isWebGPU !== null && `(${isWebGPU ? 'WebGPU' : 'WASM'})`}</span></div>
        </div>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Welcome to the Desktop-First Environment</h2>
            <p className="text-gray-700 mb-6">
              This is the initial scaffold for the local-first gymnastics video analysis application.
              From here, we will implement the 3-pass processing pipeline and local storage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-blue-200 rounded p-4 bg-blue-50">
                <h3 className="font-bold text-blue-800">Pass 1: Auto-Clip</h3>
                <p className="text-sm text-blue-600 italic">Immediate motion detection and trimming.</p>
              </div>
              <div className="border border-green-200 rounded p-4 bg-green-50">
                <h3 className="font-bold text-green-800">Pass 2: Pose Analysis</h3>
                <p className="text-sm text-green-600 italic">Background skeletal tracking and COM extraction.</p>
              </div>
              <div className="border border-purple-200 rounded p-4 bg-purple-50">
                <h3 className="font-bold text-purple-800">Pass 3: Smoothing & Metrics</h3>
                <p className="text-sm text-purple-600 italic">Constraint engine and metric calculations.</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <SessionDashboard onSelectAttempt={(attempt) => setSelectedAttemptForAnnotation(attempt)} />
          </div>

          <SideBySideComparison />

          <div className="mb-8">
            {selectedAttemptForAnnotation ? (
              <ManualAnnotation
                 key={selectedAttemptForAnnotation.id}
                 videoUrl={selectedAttemptForAnnotation.video_path}
                 initialPoses={JSON.parse(selectedAttemptForAnnotation.metrics_json)?.poses || []}
                 onSavePoses={handleSavePoses}
              />
            ) : (
              <div className="border p-4 rounded bg-gray-50 text-center text-gray-500 shadow-sm">
                <p>Select an attempt from the Session Dashboard to view or edit manual annotations.</p>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Pipeline Simulator</h2>
            <div className="mb-6">
              <CameraCalibration />
            </div>

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleSimulateVideo}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                data-testid="simulate-video-btn"
              >
                Simulate Video Drop
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid="upload-video-input"
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 pointer-events-none">
                  Upload Real Video
                </button>
              </div>

              <CaptureGuidelines />
            </div>

            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="border p-4 rounded-lg bg-gray-50 shadow-sm" data-testid="job-item">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{job.filename}</span>
                    <span className="text-sm px-2 py-1 rounded bg-gray-200 font-mono">{job.status}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${job.progress}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{job.message}</p>

                  {job.clips && job.clips.length > 0 && (
                     <div className="mt-4 border-t pt-2">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Extracted Clips</h4>
                        <div className="flex flex-wrap gap-2">
                            {job.clips.map(clip => (
                                <div key={clip.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-xs flex flex-col gap-1 w-full sm:w-auto" data-testid="extracted-clip">
                                    <div>
                                        <span className="font-bold text-blue-800">{clip.category}</span>
                                        <span className="text-blue-600 ml-2">[{clip.startTime}s - {clip.endTime}s]</span>
                                    </div>
                                    {clip.landingMetrics && (
                                        <div className="mt-1 pt-1 border-t border-blue-100 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-700">
                                            <span>Impact: {clip.landingMetrics.impactTime?.toFixed(2)}s</span>
                                            <span>Stabilization: {clip.landingMetrics.timeToStabilization?.toFixed(2)}s</span>
                                            <span>Steps: {clip.landingMetrics.stepCount}</span>
                                            <span>Drift: {clip.landingMetrics.lateralDrift?.toFixed(1)}px</span>
                                            <span>Knee Angle: {clip.landingMetrics.minKneeAngle?.toFixed(1)}°</span>
                                            <span>Torso Lean: {clip.landingMetrics.torsoLeanAngle?.toFixed(1)}°</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                     </div>
                  )}
                </div>
              ))}
              {jobs.length === 0 && (
                <p className="text-gray-500 italic">No videos currently processing.</p>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Athletes</h2>
            <form onSubmit={handleAddAthlete} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newAthleteName}
                onChange={e => setNewAthleteName(e.target.value)}
                placeholder="New Athlete Name"
                className="border p-2 rounded flex-1"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Athlete</button>
            </form>
            {athletes.length === 0 ? (
              <p className="text-gray-500 italic">No athletes found.</p>
            ) : (
              <ul className="list-disc pl-5">
                {athletes.map(a => (
                  <li key={a.id} className="text-gray-800">{a.name} (Added: {new Date(a.created_at).toLocaleDateString()})</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <footer className="bg-gray-200 text-gray-600 p-4 text-center text-sm">
        MAG_dev - Local-First Privacy-Compliant Analytics
      </footer>
    </div>
  )
}

export default App
