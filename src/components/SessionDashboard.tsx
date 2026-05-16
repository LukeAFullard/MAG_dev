import React, { useState, useEffect } from 'react';
import { getAthletes, getSessionsForAthlete, getAttemptsForSession, getRecentAttemptsForAthlete, getAllAttemptsForAthlete, getVideoFromOPFS } from '../db';
import { ChartBarIcon, LayoutDashboardIcon, ActivityIcon, PlayIcon, AlertCircleIcon, SettingsIcon } from './LucideIcons';

interface Athlete {
  id: number;
  name: string;
}

interface Session {
  id: number;
  athlete_id: number;
  date: string;
  notes: string;
}

interface Attempt {
  id: number;
  session_id: number;
  video_path: string | null;
  metrics_json: string;
  created_at: string;
}

interface SessionDashboardProps {
  onSelectAttempt?: (attempt: Attempt) => void;
  refreshTrigger?: number; // Pass a number to trigger a refresh
}

export const SessionDashboard: React.FC<SessionDashboardProps> = ({ onSelectAttempt, refreshTrigger = 0 }) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    // Periodically fetch athletes in case a new one is added in another component
    const interval = setInterval(fetchAthletes, 5000);
    fetchAthletes(); // Initial fetch
    return () => clearInterval(interval);
  }, []);

  const fetchAthletes = async () => {
    const data = await getAthletes();
    setAthletes(data as Athlete[]);
  };

  useEffect(() => {
    if (selectedAthleteId) {
      fetchSessions(selectedAthleteId);
      fetchRecentAttempts(selectedAthleteId);
      fetchAllAttempts(selectedAthleteId);

      // If we are refreshing, we might want to keep the selected session
      if (refreshTrigger === 0) {
        setSelectedSessionId(null);
        setAttempts([]);
      } else if (selectedSessionId) {
        // Just refresh the attempts if one is selected
        fetchAttempts(selectedSessionId);
      }
    } else {
      setSessions([]);
      setRecentAttempts([]);
      setAllAttempts([]);
      setSelectedSessionId(null);
      setAttempts([]);
    }
  }, [selectedAthleteId, refreshTrigger]);

  const fetchSessions = async (athleteId: number) => {
    const data = await getSessionsForAthlete(athleteId);
    setSessions(data as Session[]);
  };

  const fetchRecentAttempts = async (athleteId: number) => {
    const data = await getRecentAttemptsForAthlete(athleteId, 10); // Fetch last 10 attempts
    setRecentAttempts(data as Attempt[]);
  };

  const fetchAllAttempts = async (athleteId: number) => {
    const data = await getAllAttemptsForAthlete(athleteId);
    setAllAttempts(data as Attempt[]);
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchAttempts(selectedSessionId);
    } else {
      setAttempts([]);
    }
  }, [selectedSessionId]);

  const fetchAttempts = async (sessionId: number) => {
    const data = await getAttemptsForSession(sessionId);
    setAttempts(data as Attempt[]);
  };

  const calculateScore = (attempt: Attempt) => {
    let score = 0;
    try {
      const metrics = JSON.parse(attempt.metrics_json);
      const stepPenalty = (metrics.stepCount || 0) * 1.5;
      const driftPenalty = (metrics.lateralDrift || 0) / 20;
      score = Math.max(0, 10 - stepPenalty - driftPenalty);
    } catch {
      score = 5; // Default score
    }
    return score;
  };

  const renderInsights = () => {
    if (allAttempts.length < 5) {
      return <p className="text-gray-500 text-sm mt-2">Not enough historical data to establish baselines. Keep recording!</p>;
    }

    const allScores = allAttempts.map(calculateScore);
    const baselineAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

    // Compare recent 5 attempts against baseline
    const recent5 = recentAttempts.slice(0, 5);
    const recentScores = recent5.map(calculateScore);
    const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : baselineAvg;

    const regressionThreshold = 1.5; // If recent avg is 1.5 points lower than baseline, flag it
    const isRegression = (baselineAvg - recentAvg) > regressionThreshold;

    return (
      <div className="mt-6 p-5 border border-blue-100 rounded-xl bg-blue-50/50" data-testid="advanced-insights">
        <h4 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4" /> Advanced Insights & Trend Models
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Historical Baseline</span>
            <div className="text-3xl font-bold text-slate-800 mt-1">{baselineAvg.toFixed(1)} <span className="text-sm text-slate-400 font-normal">/ 10</span></div>
            <div className="text-xs text-slate-400 mt-2">Calculated across {allAttempts.length} total attempts</div>
          </div>
          <div className={`p-4 rounded-xl border shadow-sm transition-colors ${isRegression ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Recent Trend (Last 5)</span>
            <div className={`text-3xl font-bold mt-1 ${isRegression ? 'text-red-600' : 'text-slate-800'}`}>
              {recentAvg.toFixed(1)} <span className="text-sm text-slate-400 font-normal">/ 10</span>
            </div>
            {isRegression ? (
              <div className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1.5">
                <AlertCircleIcon className="w-3.5 h-3.5" /> Regression Detected
              </div>
            ) : (
              <div className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Trending well
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPredictiveAnalytics = () => {
    if (allAttempts.length < 5) {
      return null;
    }

    const allScores = allAttempts.map(calculateScore);
    const baselineAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

    const recent5 = recentAttempts.slice(0, 5);
    const recentScores = recent5.map(calculateScore);
    const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : baselineAvg;

    // Competition Readiness Score (0-100)
    // Formula: Base metric stability + recent trend bonus/penalty
    const stabilityScore = Math.min(100, Math.max(0, baselineAvg * 10));
    const trendBonus = (recentAvg - baselineAvg) * 5; // up to +/- ~10-15 pts based on trend
    const readinessScore = Math.min(100, Math.max(0, Math.round(stabilityScore + trendBonus)));

    // Skill Prerequisite Tracking
    // In a real app this would analyze specific metrics (e.g. amplitude, consistency on lower skills).
    // Here we use the readiness score as a proxy.
    const readinessLevel = readinessScore >= 85 ? 'High' : readinessScore >= 70 ? 'Moderate' : 'Low';

    // Predicted Peak Window
    const peakDays = readinessScore >= 85 ? '1-2 weeks' : '3-4 weeks';

    return (
      <div className="mt-6 p-5 border border-indigo-100 rounded-xl bg-indigo-50/50" data-testid="predictive-analytics">
        <h4 className="text-sm font-semibold text-indigo-800 mb-4 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4" /> Predictive Analytics
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Comp Readiness</span>
            <div className={`text-3xl font-bold mt-1 ${readinessScore >= 80 ? 'text-emerald-600' : readinessScore >= 60 ? 'text-amber-500' : 'text-red-600'}`}>
              {readinessScore} <span className="text-sm text-slate-400 font-normal">/ 100</span>
            </div>
            <div className="text-xs text-slate-400 mt-2">Based on stability & trend</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Skill Readiness</span>
            <div className={`text-2xl font-bold mt-2 ${readinessLevel === 'High' ? 'text-emerald-600' : readinessLevel === 'Moderate' ? 'text-amber-500' : 'text-red-600'}`}>
              {readinessLevel}
            </div>
            <div className="text-xs text-slate-400 mt-2">Prerequisite consistency</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Predicted Peak</span>
            <div className="text-2xl font-bold text-slate-800 mt-2">
              {peakDays}
            </div>
            <div className="text-xs text-slate-400 mt-2">Estimated time to target</div>
          </div>
        </div>
      </div>
    );
  };


  const renderComparativeInsights = () => {
    if (allAttempts.length < 3) {
      return null;
    }

    // Calculate Symmetry Index average
    let validSymmetryAttempts = 0;
    const symmetryAvg = allAttempts.reduce((acc, attempt) => {
      try {
        const metrics = JSON.parse(attempt.metrics_json);
        if (metrics.symmetryIndex !== undefined) {
          validSymmetryAttempts++;
          return acc + metrics.symmetryIndex;
        }
      } catch { /* ignore */ }
      return acc;
    }, 0) / (validSymmetryAttempts || 1);

    const symmetryStatus = validSymmetryAttempts === 0 ? 'N/A' :
                           symmetryAvg >= 90 ? 'Excellent' :
                           symmetryAvg >= 75 ? 'Good' : 'Needs Work';

    // Group by attempt.category via parsed metrics_json
    const categoryScores: Record<string, number[]> = {};
    allAttempts.forEach(attempt => {
      try {
        const metrics = JSON.parse(attempt.metrics_json);
        const cat = metrics.category || 'Attempt';
        const score = calculateScore(attempt);
        if (!categoryScores[cat]) {
          categoryScores[cat] = [];
        }
        categoryScores[cat].push(score);
      } catch { /* ignore */ }
    });

    let crossApparatusData = "N/A (Not enough apparatus data)";
    let crossApparatusSubtext = "Record more attempts across events";

    const categories = Object.keys(categoryScores);
    if (categories.length > 1) {
      const avgScores = categories.map(cat => ({
        cat,
        avg: categoryScores[cat].reduce((a, b) => a + b, 0) / categoryScores[cat].length
      }));
      // Sort descending
      avgScores.sort((a, b) => b.avg - a.avg);

      const best = avgScores[0];
      const worst = avgScores[avgScores.length - 1];

      if (best.cat !== worst.cat) {
        const diff = best.avg - worst.avg;
        crossApparatusData = `${best.cat} > ${worst.cat} (+${diff.toFixed(1)} pts)`;
        crossApparatusSubtext = "Performance delta between best and worst events";
      }
    }

    return (
      <div className="mt-6 p-5 border border-purple-100 rounded-xl bg-purple-50/50" data-testid="comparative-insights">
        <h4 className="text-sm font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <SettingsIcon className="w-4 h-4" /> Comparative Insights
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-200 transition-colors">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">L/R Biomechanical Symmetry</span>
            <div className={`text-3xl font-bold mt-1 ${symmetryAvg >= 85 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {validSymmetryAttempts > 0 ? `${symmetryAvg.toFixed(1)}` : 'N/A'} {validSymmetryAttempts > 0 && <span className="text-sm text-slate-400 font-normal">/ 100</span>}
            </div>
            <div className="text-xs text-slate-400 mt-2">Status: <span className="font-semibold text-slate-700">{symmetryStatus}</span></div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-200 transition-colors flex flex-col justify-center">
             <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Cross-Apparatus Correlation</span>
             <div className="text-lg font-bold text-slate-800 mt-2 truncate">
               {crossApparatusData}
             </div>
             <div className="text-xs text-slate-400 mt-1">{crossApparatusSubtext}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderFatigueDetection = () => {
    if (attempts.length < 4) {
      return null;
    }

    const sessionScores = attempts.map(calculateScore);
    const halfIndex = Math.floor(sessionScores.length / 2);
    const firstHalfAvg = sessionScores.slice(0, halfIndex).reduce((a, b) => a + b, 0) / halfIndex;
    const secondHalfAvg = sessionScores.slice(halfIndex).reduce((a, b) => a + b, 0) / (sessionScores.length - halfIndex);
    const scoreDrop = firstHalfAvg - secondHalfAvg;

    const isFatigueDetected = scoreDrop > 1.0;

    const minScore = Math.min(...sessionScores);
    const maxScore = Math.max(...sessionScores);
    const spread = maxScore - minScore;

    return (
      <div className="mt-6 p-5 border border-amber-100 rounded-xl bg-amber-50/50" data-testid="fatigue-detection">
        <h4 className="text-sm font-semibold text-amber-800 mb-4 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4" /> Fatigue & Workload
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-200 transition-colors">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">In-Session Fatigue</span>
            <div className={`text-2xl font-bold mt-2 ${isFatigueDetected ? 'text-orange-600' : 'text-slate-800'}`}>
              {isFatigueDetected ? `Drop: ${scoreDrop.toFixed(1)} pts` : 'Stable'}
            </div>
            <div className="text-xs text-slate-400 mt-2">First half: {firstHalfAvg.toFixed(1)}, Second half: {secondHalfAvg.toFixed(1)}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-200 transition-colors">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Attempt Distribution</span>
            <div className="text-2xl font-bold text-slate-800 mt-2">
              Spread: {spread.toFixed(1)} pts
            </div>
            <div className="text-xs text-slate-400 mt-1">Range: {minScore.toFixed(1)} - {maxScore.toFixed(1)}</div>
            <div className="text-xs mt-1 font-medium">
              {spread > 3.0 ? <span className="text-orange-500">Wide spread (Focus/Fatigue)</span> : <span className="text-emerald-500">Tight spread (Mastery)</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    if (recentAttempts.length === 0) return <p className="text-gray-500 text-sm">No recent attempts data for chart.</p>;

    // Simple bar chart visualization
    const maxScore = 10;

    return (
      <div className="mt-6 border border-slate-200 rounded-xl p-6 bg-white shadow-sm" data-testid="session-chart">
        <h4 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-blue-500" /> Recent Attempts Consistency
        </h4>
        <div className="flex items-end gap-3 h-40 mt-4 border-b border-slate-100 pb-2">
          {recentAttempts.slice().reverse().map((attempt) => {
            const score = calculateScore(attempt);
            const height = `${(score / maxScore) * 100}%`;
            const isGood = score >= 8;
            const isOk = score >= 6 && score < 8;

            return (
              <div
                key={attempt.id}
                className={`flex-1 min-w-[20px] max-w-[40px] ${isGood ? 'bg-emerald-400 hover:bg-emerald-500' : isOk ? 'bg-blue-400 hover:bg-blue-500' : 'bg-slate-300 hover:bg-slate-400'} cursor-pointer rounded-t-sm transition-colors relative group`}
                style={{ height }}
                onClick={() => {
                  alert(`Drill-down: Showing video for Attempt ${attempt.id}`);
                }}
                data-testid={`chart-bar-${attempt.id}`}
              >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap pointer-events-none transition-opacity z-10">
                  {score.toFixed(1)} pts
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs font-medium text-slate-400 mt-3">
          <span>Older</span>
          <span>Newer</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
        <div className="bg-blue-100 p-2.5 rounded-lg">
          <LayoutDashboardIcon className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Session Analytics Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Athlete Selection */}
        <div className="col-span-1 border-r border-slate-100 pr-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Athletes</h3>
          <select
            className="w-full border border-slate-300 rounded-lg p-2.5 mb-6 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
            value={selectedAthleteId || ''}
            onChange={(e) => setSelectedAthleteId(e.target.value ? parseInt(e.target.value) : null)}
            data-testid="athlete-select"
          >
            <option value="">Select an athlete...</option>
            {athletes.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {selectedAthleteId && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Sessions</h3>
              {sessions.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-center">
                  <p className="text-xs text-slate-500 font-medium">No sessions found.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {sessions.map(s => (
                    <li key={s.id}>
                      <button
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${selectedSessionId === s.id ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'}`}
                        data-testid={`session-select-${s.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{new Date(s.date).toLocaleDateString()}</span>
                          {selectedSessionId === s.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                        </div>
                        {s.notes && <div className="text-xs text-slate-400 font-normal mt-0.5 truncate">{s.notes}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Dashboard Main Area */}
        <div className="col-span-1 md:col-span-3 flex flex-col">
          {selectedAthleteId ? (
            <>
              <div className="flex items-end justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">
                  {athletes.find(a => a.id === selectedAthleteId)?.name}
                </h3>
              </div>

              {renderInsights()}

              {renderPredictiveAnalytics()}

              {renderComparativeInsights()}

              {selectedSessionId && renderFatigueDetection()}

              {renderChart()}

              {selectedSessionId && (
                <div className="mt-8">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 pb-2">
                    Session Attempts
                  </h4>
                  {attempts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                      <p className="font-medium">No attempts in this session.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-5 py-3 text-left font-semibold">Time</th>
                            <th className="px-5 py-3 text-left font-semibold">Apparatus/Skill</th>
                            <th className="px-5 py-3 text-left font-semibold">Metrics Preview</th>
                            <th className="px-5 py-3 text-right font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {attempts.map(attempt => {
                            let metricsPreview = 'None';
                            let apparatus = 'Unknown';
                            try {
                                const metrics = JSON.parse(attempt.metrics_json);
                                metricsPreview = `Impact: ${metrics.impactTime?.toFixed(2)}s, Steps: ${metrics.stepCount}`;
                                apparatus = metrics.category || 'Unknown';
                            } catch { /* ignore */ }

                            return (
                              <tr key={attempt.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-5 py-3.5 text-slate-600 font-medium">{new Date(attempt.created_at).toLocaleTimeString()}</td>
                                <td className="px-5 py-3.5 text-slate-800 font-semibold">{apparatus}</td>
                                <td className="px-5 py-3.5 text-slate-500">{metricsPreview}</td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                    onClick={() => {
                                      if (onSelectAttempt) {
                                        // If video_path is an OPFS filename, we need to load it
                                        if (attempt.video_path && attempt.video_path.startsWith('video_')) {
                                            getVideoFromOPFS(attempt.video_path!).then(url => {
                                                    onSelectAttempt({ ...attempt, video_path: url });
                                                    document.querySelector('[data-testid="manual-annotation"]')?.scrollIntoView({ behavior: 'smooth' });
                                                });
                                        } else {
                                            // Plain URL data (e.g. from tests)
                                            onSelectAttempt(attempt);
                                            document.querySelector('[data-testid="manual-annotation"]')?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                      } else {
                                        alert(`Drill-down: Showing video for Attempt ${attempt.id}`);
                                      }
                                    }}
                                  >
                                    <PlayIcon className="w-4 h-4" />
                                    {attempt.video_path ? 'Analyze' : 'View Data'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400 min-h-[300px] bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center">
              <LayoutDashboardIcon className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-medium text-slate-500 text-lg">Select an athlete to view analytics</p>
              <p className="text-sm mt-2">Their historical data and sessions will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDashboard;
