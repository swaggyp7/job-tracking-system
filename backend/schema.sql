PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_soft_skill INTEGER NOT NULL DEFAULT 0 CHECK (is_soft_skill IN (0, 1)),
  create_time TEXT NOT NULL DEFAULT (datetime('now')),
  update_time TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS application (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  job_title TEXT,
  location TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'interview', 'rejected', 'closed')),
  create_time TEXT NOT NULL DEFAULT (datetime('now')),
  update_time TEXT NOT NULL DEFAULT (datetime('now')),
  apply_time TEXT
);

CREATE TABLE IF NOT EXISTS application_skill_set (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  create_time TEXT NOT NULL DEFAULT (datetime('now')),
  update_time TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (application_id, skill_id),
  FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_skill_set_application_id
  ON application_skill_set(application_id);

CREATE INDEX IF NOT EXISTS idx_application_skill_set_skill_id
  ON application_skill_set(skill_id);

CREATE VIEW IF NOT EXISTS v_application_skills AS
SELECT
  app.id AS application_id,
  ass.skill_id,
  s.name AS skill_name,
  s.is_soft_skill,
  ass.create_time AS linked_time
FROM application AS app
JOIN application_skill_set AS ass
  ON ass.application_id = app.id
JOIN skills AS s
  ON s.id = ass.skill_id;

CREATE TRIGGER IF NOT EXISTS trg_skills_update_time
AFTER UPDATE ON skills
FOR EACH ROW
BEGIN
  UPDATE skills
  SET update_time = datetime('now')
  WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS trg_application_update_time
AFTER UPDATE ON application
FOR EACH ROW
BEGIN
  UPDATE application
  SET update_time = datetime('now')
  WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS trg_application_skill_set_update_time
AFTER UPDATE ON application_skill_set
FOR EACH ROW
BEGIN
  UPDATE application_skill_set
  SET update_time = datetime('now')
  WHERE rowid = NEW.rowid;
END;
