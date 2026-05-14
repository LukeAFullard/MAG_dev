import React, { useState, useEffect } from 'react';
import { getAthletes, getSessionsForAthlete, getAttemptsForSession, getRecentAttemptsForAthlete } from '../db';

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

  useEffect(() => {
    // Periodically fetch athletes in case a new one is added in another component
    const interval = setInterval(fetchAthletes, 2000);
    fetchAthletes(); // Initial fetch
    return () => clearInterval(interval);
  }, []);

  const fetchAthletes = async () => {
    const data = await getAthletes();
    setAthletes(data);
  };

  useEffect(() => {
    if (selectedAthleteId) {
      fetchSessions(selectedAthleteId);
      fetchRecentAttempts(selectedAthleteId);
      setSelectedSessionId(null);
      setAttempts([]);
    } else {
      setSessions([]);
      setRecentAttempts([]);
      setSelectedSessionId(null);
      setAttempts([]);
    }
  }, [selectedAthleteId]);

  const fetchSessions = async (athleteId: number) => {
    const data = await getSessionsForAthlete(athleteId);
    setSessions(data);
  };

  const fetchRecentAttempts = async (athleteId: number) => {
    const data = await getRecentAttemptsForAthlete(athleteId, 10); // Fetch last 10 attempts
    setRecentAttempts(data);
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
    setAttempts(data);
  };

  const renderChart = () => {
    if (recentAttempts.length === 0) return <p className="text-gray-500 text-sm">No recent attempts data for chart.</p>;

    // Simple bar chart visualization
    const maxScore = 10;

    return (
      <div className="mt-4 border rounded p-4 bg-white" data-testid="session-chart">
        <h4 className="text-md font-semibold mb-2">Recent Attempts Consistency</h4>
        <div className="flex items-end gap-2 h-32">
          {recentAttempts.slice().reverse().map((attempt, index) => {
            // Mock consistency score from metrics_json if possible, else random
            let score = 0;
            try {
              const metrics = JSON.parse(attempt.metrics_json);
              // Calculate a mock score out of 10 based on landing metrics
              const stepPenalty = (metrics.stepCount || 0) * 1.5;
              const driftPenalty = (metrics.lateralDrift || 0) / 20;
              score = Math.max(0, 10 - stepPenalty - driftPenalty);
            } catch (e) {
              score = 5; // Default score
            }

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
                            } catch(e) {}

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
