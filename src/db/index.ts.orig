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

export async function pruneOldVideos() {
  const settingsResult = await sql`SELECT value FROM settings WHERE key = 'video_retention_days'`;
  if (settingsResult.length === 0) return;
  const days = parseInt(settingsResult[0].value, 10);
  if (isNaN(days)) return;

  // In a real app we'd also delete the actual files from OPFS.
  // Here we simulate pruning by nullifying the video_path field for old attempts.
  const pruneQuery = await sql`
    UPDATE attempts
    SET video_path = NULL
    WHERE video_path IS NOT NULL
      AND created_at < datetime('now', '-' || ${days.toString()} || ' days')
  `;
  return pruneQuery;
}

export { sql };
