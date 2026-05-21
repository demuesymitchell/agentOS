-- AgentOS v0.3 — PostgreSQL Migration
-- Run this on Railway when ready: psql $DATABASE_URL -f migrate.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#00e5ff',
  icon        TEXT NOT NULL DEFAULT '🏢',
  grid_x      INTEGER NOT NULL DEFAULT 0,
  grid_y      INTEGER NOT NULL DEFAULT 0,
  grid_w      INTEGER NOT NULL DEFAULT 16,
  grid_h      INTEGER NOT NULL DEFAULT 14,
  created_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE TABLE IF NOT EXISTS agents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  room_id           UUID REFERENCES rooms(id) ON DELETE SET NULL,
  role              TEXT NOT NULL DEFAULT 'Agent',
  purpose           TEXT NOT NULL DEFAULT '',
  color             TEXT NOT NULL DEFAULT '#00e5ff',
  status            TEXT NOT NULL DEFAULT 'offline',
  current_task      TEXT,
  tools             JSONB NOT NULL DEFAULT '[]',
  api_key_override  TEXT,
  tasks_completed   INTEGER NOT NULL DEFAULT 0,
  tasks_errored     INTEGER NOT NULL DEFAULT 0,
  created_at        BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal          TEXT NOT NULL,
  room_id       UUID REFERENCES rooms(id) ON DELETE SET NULL,
  agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  agent_name    TEXT,
  status        TEXT NOT NULL DEFAULT 'queued',
  outputs       JSONB NOT NULL DEFAULT '[]',
  raw_response  TEXT,
  error         TEXT,
  parent_goal   TEXT,
  created_at    BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  started_at    BIGINT,
  completed_at  BIGINT
);

CREATE TABLE IF NOT EXISTS logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ts        BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  level     TEXT NOT NULL DEFAULT 'info',
  "from"    TEXT NOT NULL,
  "to"      TEXT,
  message   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_room    ON tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent   ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_logs_ts       ON logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_agents_room   ON agents(room_id);
