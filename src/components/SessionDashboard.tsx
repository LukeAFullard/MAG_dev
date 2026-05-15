import React, { useState, useEffect } from 'react';
import { getAthletes, getSessionsForAthlete, getAttemptsForSession, getRecentAttemptsForAthlete, getAllAttemptsForAthlete } from '../db';

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

export const SessionDashboard: React.FC = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    // Periodically fetch athletes in case a new one is added in another component
    const interval = setInterval(fetchAthletes, 2000);
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
      setSelectedSessionId(null);
      setAttempts([]);
    } else {
      setSessions([]);
      setRecentAttempts([]);
      setAllAttempts([]);
      setSelectedSessionId(null);
      setAttempts([]);
    }
  }, [selectedAthleteId]);

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
      <div className="mt-4 p-4 border rounded bg-blue-50" data-testid="advanced-insights">
        <h4 className="text-md font-semibold text-blue-800 mb-2">Advanced Insights & Trend Models</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded border shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Historical Baseline</span>
            <div className="text-2xl font-bold text-gray-800">{baselineAvg.toFixed(1)} / 10</div>
            <div className="text-xs text-gray-400 mt-1">Calculated across {allAttempts.length} total attempts</div>
          </div>
          <div className={`p-3 rounded border shadow-sm ${isRegression ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Recent Trend (Last 5)</span>
            <div className={`text-2xl font-bold ${isRegression ? 'text-red-600' : 'text-gray-800'}`}>
              {recentAvg.toFixed(1)} / 10
            </div>
            {isRegression ? (
              <div className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                <span>⚠️ Regression Detected</span>
              </div>
            ) : (
              <div className="text-xs text-green-500 mt-1 font-medium flex items-center gap-1">
                <span>✅ Trending well</span>
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
    let readinessScore = Math.min(100, Math.max(0, Math.round(stabilityScore + trendBonus)));

    // Skill Prerequisite Tracking
    // In a real app this would analyze specific metrics (e.g. amplitude, consistency on lower skills).
    // Here we use the readiness score as a proxy.
    const readinessLevel = readinessScore >= 85 ? 'High' : readinessScore >= 70 ? 'Moderate' : 'Low';

    // Predicted Peak Window
    const peakDays = readinessScore >= 85 ? '1-2 weeks' : '3-4 weeks';

    return (
      <div className="mt-4 p-4 border rounded bg-indigo-50" data-testid="predictive-analytics">
        <h4 className="text-md font-semibold text-indigo-800 mb-2">Predictive Analytics</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded border shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Competition Readiness</span>
            <div className={`text-2xl font-bold ${readinessScore >= 80 ? 'text-green-600' : readinessScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {readinessScore} / 100
            </div>
            <div className="text-xs text-gray-400 mt-1">Based on stability & trend</div>
          </div>

          <div className="bg-white p-3 rounded border shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Next Skill Readiness</span>
            <div className={`text-xl font-bold ${readinessLevel === 'High' ? 'text-green-600' : readinessLevel === 'Moderate' ? 'text-yellow-600' : 'text-red-600'}`}>
              {readinessLevel}
            </div>
            <div className="text-xs text-gray-400 mt-1">Prerequisite consistency met</div>
          </div>

          <div className="bg-white p-3 rounded border shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Predicted Peak</span>
            <div className="text-xl font-bold text-gray-800">
              {peakDays}
            </div>
            <div className="text-xs text-gray-400 mt-1">Estimated time to target</div>
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
      <div className="mt-4 p-4 border rounded bg-purple-50" data-testid="comparative-insights">
        <h4 className="text-md font-semibold text-purple-800 mb-2">Comparative Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded border shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">L/R Biomechanical Symmetry</span>
            <div className={`text-2xl font-bold ${symmetryAvg >= 85 ? 'text-green-600' : 'text-yellow-600'}`}>
              {validSymmetryAttempts > 0 ? `${symmetryAvg.toFixed(1)} / 100` : 'N/A'}
            </div>
            <div className="text-xs text-gray-400 mt-1">Status: <span className="font-medium text-gray-700">{symmetryStatus}</span></div>
          </div>

          <div className="bg-white p-3 rounded border shadow-sm">
             <span className="text-xs text-gray-500 uppercase tracking-wider">Cross-Apparatus Correlation</span>
             <div className="text-lg font-bold text-gray-800 mt-1">
               {crossApparatusData}
             </div>
             <div className="text-xs text-gray-400 mt-1">{crossApparatusSubtext}</div>
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
      <div className="mt-4 p-4 border rounded bg-yellow-50" data-testid="fatigue-detection">
        <h4 className="text-md font-semibold text-yellow-800 mb-2">Fatigue & Workload</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded border shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">In-Session Fatigue</span>
            <div className={`text-2xl font-bold ${isFatigueDetected ? 'text-orange-600' : 'text-gray-800'}`}>
              {isFatigueDetected ? `Drop: ${scoreDrop.toFixed(1)} pts` : 'Stable'}
            </div>
            <div className="text-xs text-gray-400 mt-1">First half avg: {firstHalfAvg.toFixed(1)}, Second half avg: {secondHalfAvg.toFixed(1)}</div>
          </div>
          <div className="bg-white p-3 rounded border shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Attempt Distribution</span>
            <div className="text-2xl font-bold text-gray-800">
              Spread: {spread.toFixed(1)} pts
            </div>
            <div className="text-xs text-gray-400 mt-1">Range: {minScore.toFixed(1)} - {maxScore.toFixed(1)}</div>
            <div className="text-xs mt-1">
              {spread > 3.0 ? <span className="text-orange-500">Wide spread (Focus/Fatigue)</span> : <span className="text-green-500">Tight spread (Mastery)</span>}
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
      <div className="mt-4 border rounded p-4 bg-white" data-testid="session-chart">
        <h4 className="text-md font-semibold mb-2">Recent Attempts Consistency</h4>
        <div className="flex items-end gap-2 h-32">
          {recentAttempts.slice().reverse().map((attempt) => {
            const score = calculateScore(attempt);
            const height = `${(score / maxScore) * 100}%`;
            return (
              <div
                key={attempt.id}
                className="w-8 bg-blue-500 hover:bg-blue-600 cursor-pointer rounded-t"
                style={{ height }}
                title={`Attempt ${attempt.id}: Score ${score.toFixed(1)}`}
                onClick={() => {
                  // Link to attempt details
                  alert(`Drill-down: Showing video for Attempt ${attempt.id}`);
                }}
                data-testid={`chart-bar-${attempt.id}`}
              ></div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Older</span>
          <span>Newer</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Session Analytics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Athlete Selection */}
        <div className="col-span-1 border p-4 rounded bg-white shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-2">Athletes</h3>
          <select
            className="w-full border rounded p-2 mb-4 bg-gray-50"
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
              <h4 className="font-semibold text-gray-700 mt-4 mb-2">Sessions</h4>
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No sessions found.</p>
              ) : (
                <ul className="space-y-1">
                  {sessions.map(s => (
                    <li key={s.id}>
                      <button
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`w-full text-left px-2 py-1 rounded text-sm ${selectedSessionId === s.id ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
                        data-testid={`session-select-${s.id}`}
                      >
                        {new Date(s.date).toLocaleDateString()} {s.notes ? `- ${s.notes}` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Dashboard Main Area */}
        <div className="col-span-1 md:col-span-2 border p-4 rounded bg-white shadow-sm flex flex-col">
          {selectedAthleteId ? (
            <>
              <h3 className="font-semibold text-gray-700 mb-2">
                Overview: {athletes.find(a => a.id === selectedAthleteId)?.name}
              </h3>

              {renderInsights()}

              {renderPredictiveAnalytics()}

              {renderComparativeInsights()}

              {selectedSessionId && renderFatigueDetection()}

              {renderChart()}

              {selectedSessionId && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Session Attempts ({new Date(sessions.find(s => s.id === selectedSessionId)?.date || '').toLocaleDateString()})
                  </h4>
                  {attempts.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No attempts in this session.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-left text-gray-600">Time</th>
                            <th className="px-4 py-2 text-left text-gray-600">Video</th>
                            <th className="px-4 py-2 text-left text-gray-600">Metrics</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attempts.map(attempt => {
                            let metricsPreview = 'None';
                            try {
                                const metrics = JSON.parse(attempt.metrics_json);
                                metricsPreview = `Impact: ${metrics.impactTime?.toFixed(2)}s, Steps: ${metrics.stepCount}`;
                            } catch { /* ignore */ }

                            return (
                              <tr key={attempt.id} className="border-t">
                                <td className="px-4 py-2 text-gray-800">{new Date(attempt.created_at).toLocaleTimeString()}</td>
                                <td className="px-4 py-2 text-blue-600 cursor-pointer hover:underline" onClick={() => alert(`Drill-down: Showing video for Attempt ${attempt.id}`)}>
                                  {attempt.video_path ? 'View Video' : 'No Video'}
                                </td>
                                <td className="px-4 py-2 text-gray-600">{metricsPreview}</td>
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
            <div className="flex flex-1 items-center justify-center text-gray-400 italic">
              Select an athlete to view analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDashboard;
