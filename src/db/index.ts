import { SQLocal } from 'sqlocal';

const { sql } = new SQLocal('mag-app.sqlite3');

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS athletes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      athlete_id INTEGER NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      video_path TEXT,
      metrics_json TEXT, -- stores raw per-session metric distributions
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `;

  // Default setting for pruning (e.g. 7 days)
  await sql`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('video_retention_days', '7');
  `;
}

export async function addAthlete(name: string) {
  return await sql`INSERT INTO athletes (name) VALUES (${name}) RETURNING *`;
}

export async function getAthletes() {
  return await sql`SELECT * FROM athletes ORDER BY name ASC`;
}

// --- OPFS Utility Functions ---

export async function saveVideoToOPFS(file: File): Promise<string> {
  const opfsRoot = await navigator.storage.getDirectory();
  const filename = `video_${Date.now()}_${file.name}`;
  const fileHandle = await opfsRoot.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return filename;
}

export async function getVideoFromOPFS(filename: string): Promise<string | null> {
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch (e) {
    console.error(`Failed to retrieve video ${filename} from OPFS`, e);
    return null;
  }
}

export async function deleteVideoFromOPFS(filename: string): Promise<boolean> {
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    await opfsRoot.removeEntry(filename);
    return true;
  } catch (e) {
    console.warn(`Failed to delete video ${filename} from OPFS. It may have already been deleted.`, e);
    return false;
  }
}

// --- Pruning Logic ---

export async function pruneOldVideos() {
  const settingsResult = await sql`SELECT value FROM settings WHERE key = 'video_retention_days'`;
  if (settingsResult.length === 0) return;
  const days = parseInt(settingsResult[0].value, 10);
  if (isNaN(days)) return;

  // Find videos that need to be pruned
  const oldAttempts = await sql`
    SELECT id, video_path FROM attempts
    WHERE video_path IS NOT NULL
      AND created_at < datetime('now', '-' || ${days.toString()} || ' days')
  `;

  for (const attempt of oldAttempts) {
    if (attempt.video_path) {
      // Actually delete the file from OPFS
      await deleteVideoFromOPFS(attempt.video_path);

      // Update the database to nullify the path
      await sql`UPDATE attempts SET video_path = NULL WHERE id = ${attempt.id}`;
    }
  }

  return oldAttempts.length;
}

export async function addSession(athleteId: number, notes: string = '') {
  return await sql`INSERT INTO sessions (athlete_id, notes) VALUES (${athleteId}, ${notes}) RETURNING *`;
}

export async function getSessionsForAthlete(athleteId: number) {
  return await sql`SELECT * FROM sessions WHERE athlete_id = ${athleteId} ORDER BY date DESC`;
}

export async function addAttempt(sessionId: number, videoPath: string | null, metricsJson: string) {
  return await sql`INSERT INTO attempts (session_id, video_path, metrics_json) VALUES (${sessionId}, ${videoPath}, ${metricsJson}) RETURNING *`;
}

export async function updateAttemptMetrics(attemptId: number, metricsJson: string) {
  return await sql`UPDATE attempts SET metrics_json = ${metricsJson} WHERE id = ${attemptId} RETURNING *`;
}

export async function getAttemptsForSession(sessionId: number) {
  return await sql`SELECT * FROM attempts WHERE session_id = ${sessionId} ORDER BY created_at ASC`;
}

export async function getRecentAttemptsForAthlete(athleteId: number, limit: number = 50) {
  return await sql`
    SELECT a.* FROM attempts a
    JOIN sessions s ON a.session_id = s.id
    WHERE s.athlete_id = ${athleteId}
    ORDER BY a.created_at DESC LIMIT ${limit}`;
}

export async function getAllAttemptsForAthlete(athleteId: number) {
  return await sql`
    SELECT a.* FROM attempts a
    JOIN sessions s ON a.session_id = s.id
    WHERE s.athlete_id = ${athleteId}
    ORDER BY a.created_at ASC`;
}

export { sql };
