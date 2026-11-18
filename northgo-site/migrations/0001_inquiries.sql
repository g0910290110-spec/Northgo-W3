CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo TEXT NOT NULL,
  ready_date TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'zh-tw',
  status TEXT NOT NULL DEFAULT 'new',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS inquiries_created_at ON inquiries (created_at DESC);
