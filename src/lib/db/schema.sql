CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT CHECK(status IN ('active', 'archived', 'deleted')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT,
    gender TEXT CHECK(gender IN ('male', 'female', NULL)),
    is_favorite BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_tags (
    voice_id TEXT,
    tag TEXT,
    PRIMARY KEY (voice_id, tag),
    FOREIGN KEY (voice_id) REFERENCES voices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS outputs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    text TEXT NOT NULL,
    exaggeration REAL DEFAULT 0.5,
    temperature REAL DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (voice_id) REFERENCES voices(id) ON DELETE CASCADE
);

-- Insert default voice if it doesn't exist
-- This voice is immediately soft-deleted as it's only needed for foreign key integrity
-- and should not appear in the voice list UI
INSERT OR IGNORE INTO voices (id, name, gender, deleted_at)
VALUES ('default', 'Default Voice', NULL, CURRENT_TIMESTAMP); 