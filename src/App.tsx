import React, { useEffect, useState } from 'react';
import { initDb, addAthlete, getAthletes, pruneOldVideos, saveVideoToOPFS, updateAttemptMetrics } from './db';
import { InferenceEngine } from './inference';
import { PipelineManager, type VideoProcessingJob } from './pipeline';
import CaptureGuidelines from './components/CaptureGuidelines';
import CameraCalibration from './components/CameraCalibration';
import SideBySideComparison from './components/SideBySideComparison';
import SessionDashboard from './components/SessionDashboard';
import ManualAnnotation from './components/ManualAnnotation';
import CaptureVideo from './components/CaptureVideo';
import { ActivityIcon, CheckCircleIcon, Loader2Icon, FileVideoIcon } from './components/LucideIcons';

const App: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<string>('Initializing...');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [newAthleteName, setNewAthleteName] = useState('');
  const [inferenceStatus, setInferenceStatus] = useState<string>('Initializing...');
  const [isWebGPU, setIsWebGPU] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<VideoProcessingJob[]>([]);
  const [selectedAttemptForAnnotation, setSelectedAttemptForAnnotation] = useState<any>(null);

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

  const handleVideoCaptured = async (file: File) => {
    try {
      // 1. Save original video to OPFS
      const opfsFilename = await saveVideoToOPFS(file);
      console.log(`Saved video to OPFS: ${opfsFilename}`);

      // 2. Start the processing pipeline
      const pipeline = PipelineManager.getInstance();
      pipeline.startJob(opfsFilename, file); // Pass the OPFS filename so it can be tracked
    } catch (err) {
      console.error('Failed to save file to OPFS', err);
      alert('Failed to process video file. Ensure your browser supports OPFS.');
    }
  };

  const handleSavePoses = async (poses: any[]) => {
    if (!selectedAttemptForAnnotation) return;

    try {
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
      <header className="bg-slate-900 text-slate-50 p-4 shadow-md flex flex-col md:flex-row justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-3">
          <ActivityIcon className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold tracking-tight">MAG_dev: Gymnastics Analysis Assistant</h1>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">DB Status:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs ${dbStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-300'}`}>
              {dbStatus}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Inference:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs ${inferenceStatus === 'Ready' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-300'}`}>
              {inferenceStatus} {isWebGPU !== null && `(${isWebGPU ? 'WebGPU' : 'WASM'})`}
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 bg-slate-50">
        <div className="max-w-6xl mx-auto space-y-8">

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to the Desktop-First Environment</h2>
              <p className="text-slate-600">
                This is the initial scaffold for the local-first gymnastics video analysis application.
                From here, we will implement the 3-pass processing pipeline and local storage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <FileVideoIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Pass 1: Auto-Clip</h3>
                </div>
                <p className="text-sm text-slate-600 ml-11">Immediate motion detection and trimming.</p>
              </div>
              <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <ActivityIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Pass 2: Pose Analysis</h3>
                </div>
                <p className="text-sm text-slate-600 ml-11">Background skeletal tracking and COM extraction.</p>
              </div>
              <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                    <CheckCircleIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Pass 3: Metrics</h3>
                </div>
                <p className="text-sm text-slate-600 ml-11">Constraint engine and metric calculations.</p>
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">New Video Analysis</h2>
                <p className="text-slate-500 mt-1">Upload an attempt for automated extraction and pose evaluation.</p>
              </div>
              <CaptureGuidelines />
            </div>

            <div className="mb-6">
              <CameraCalibration />
            </div>

            <CaptureVideo onVideoCaptured={handleVideoCaptured} />

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                Processing Queue {jobs.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">{jobs.length}</span>}
              </h3>

              <div className="space-y-4">
                {jobs.map(job => {
                  const isComplete = job.status === 'completed' || job.status === 'error' || job.status === 'cancelled';
                  const isError = job.status === 'error' || job.status === 'cancelled';

                  return (
                    <div key={job.id} className={`border rounded-xl p-5 shadow-sm transition-all ${isComplete ? (isError ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100') : 'bg-white border-slate-200'}`} data-testid="job-item">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {!isComplete ? (
                            <Loader2Icon className="w-5 h-5 text-blue-500 animate-spin" />
                          ) : isError ? (
                            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600">!</div>
                          ) : (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                          )}
                          <div>
                            <h4 className="font-semibold text-slate-900">{job.filename}</h4>
                            <p className="text-sm text-slate-500">{job.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isComplete && (
                             <button
                               onClick={() => PipelineManager.getInstance().cancelJob(job.id)}
                               className="text-xs font-medium px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                             >
                               Cancel
                             </button>
                          )}
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isComplete ? (isError ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700') : 'bg-blue-100 text-blue-700'}`}>
                            {job.status}
                          </span>
                        </div>
                      </div>

                      {!isComplete && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Processing...</span>
                            <span className="font-medium text-slate-700">{Math.round(job.progress)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out relative" style={{ width: `${job.progress}%` }}>
                              <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {job.clips && job.clips.length > 0 && (
                         <div className="mt-5 border-t border-slate-200/60 pt-4">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Extracted Clips ({job.clips.length})</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {job.clips.map(clip => (
                                    <div key={clip.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-blue-300 transition-colors" data-testid="extracted-clip">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-slate-800 text-sm">{clip.category}</span>
                                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                              {clip.startTime}s - {clip.endTime}s
                                            </span>
                                        </div>
                                        {clip.landingMetrics && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600">
                                                <div className="flex justify-between"><span>Impact</span><span className="font-medium text-slate-900">{clip.landingMetrics.impactTime?.toFixed(2)}s</span></div>
                                                <div className="flex justify-between"><span>Stab.</span><span className="font-medium text-slate-900">{clip.landingMetrics.timeToStabilization?.toFixed(2)}s</span></div>
                                                <div className="flex justify-between"><span>Steps</span><span className="font-medium text-slate-900">{clip.landingMetrics.stepCount}</span></div>
                                                <div className="flex justify-between"><span>Drift</span><span className="font-medium text-slate-900">{clip.landingMetrics.lateralDrift?.toFixed(1)}px</span></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                         </div>
                      )}
                    </div>
                  );
                })}
                {jobs.length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
                    <ActivityIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">No videos currently processing.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Athlete Management</h2>
            <form onSubmit={handleAddAthlete} className="flex gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <input
                type="text"
                value={newAthleteName}
                onChange={e => setNewAthleteName(e.target.value)}
                placeholder="Enter new athlete name..."
                className="border border-slate-300 p-2.5 rounded-lg flex-1 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 font-medium shadow-sm transition-colors whitespace-nowrap">
                Add Athlete
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {athletes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50">No athletes found. Add one above to get started.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {athletes.map(a => (
                    <li key={a.id} className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
                      <span className="font-medium text-slate-900">{a.name}</span>
                      <span className="text-sm text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Added {new Date(a.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </main>
      <footer className="bg-slate-900 text-slate-400 p-6 text-center text-sm border-t border-slate-800">
        <p className="font-medium mb-1">MAG_dev - Gymnastics Analysis Assistant</p>
        <p className="text-xs opacity-75">Local-First Privacy-Compliant Analytics</p>
      </footer>
    </div>
  )
}

export default App
