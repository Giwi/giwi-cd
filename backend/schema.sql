-- PostgreSQL Schema for GiwiCD
-- Usage: psql -d giwicd -f schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credentials table
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('username-password', 'token', 'ssh-key', 'telegram', 'slack', 'teams', 'mail')),
    username VARCHAR(255),
    password VARCHAR(255),
    token TEXT,
    private_key TEXT,
    passphrase VARCHAR(255),
    description TEXT,
    provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    repository_url VARCHAR(500),
    credential_id UUID REFERENCES credentials(id),
    branch VARCHAR(100) DEFAULT 'main',
    stages JSONB DEFAULT '[]',
    triggers JSONB DEFAULT '{"manual": true, "push": false}',
    environment JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('inactive', 'running')),
    enabled BOOLEAN DEFAULT true,
    keep_builds INTEGER DEFAULT 10,
    polling_interval INTEGER DEFAULT 60,
    last_build_at TIMESTAMP,
    last_build_status VARCHAR(20),
    last_commit VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Builds table
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    pipeline_name VARCHAR(100),
    branch VARCHAR(100),
    commit VARCHAR(100),
    commit_message TEXT,
    triggered_by VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'error', 'cancelled')),
    logs JSONB DEFAULT '[]',
    stages JSONB DEFAULT '[]',
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pipeline_id, number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_builds_pipeline_id ON builds(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_created_at ON builds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
    ('maxConcurrentBuilds', '3'),
    ('defaultTimeout', '3600'),
    ('retentionDays', '30'),
    ('allowRegistration', 'true'),
    ('pollingInterval', '60'),
    ('notificationDefaults', '{}')
ON CONFLICT (key) DO NOTHING;
