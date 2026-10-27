CREATE TABLE IF NOT EXISTS consultation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  business_type TEXT NOT NULL,
  website TEXT,
  interest TEXT NOT NULL,
  project_summary TEXT NOT NULL,
  notification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_created_at ON consultation_requests(created_at);
