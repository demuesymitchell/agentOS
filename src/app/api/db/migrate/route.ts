import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export async function POST() {
  const steps: { sql: string; done: boolean; error: string | null }[] = [];

  async function run(sql: string) {
    const step = { sql: sql.slice(0, 80), done: false, error: null as string | null };
    steps.push(step);
    try {
      await query(sql);
      step.done = true;
    } catch (e: any) {
      // Ignore "already exists" and "does not exist" errors — means it's already correct
      if (e.message.includes('already exists') || e.message.includes('does not exist') || e.message.includes('cannot alter')) {
        step.done = true;
        step.error = `skipped: ${e.message.slice(0, 60)}`;
      } else {
        step.error = e.message;
      }
    }
  }

  // ── Step 1: Drop old tables and recreate with TEXT ids ──────────────────────
  // We drop in reverse dependency order, then recreate

  await run(`DROP TABLE IF EXISTS task_outputs`);
  await run(`DROP TABLE IF EXISTS agent_tools`);
  await run(`DROP TABLE IF EXISTS tasks`);
  await run(`DROP TABLE IF EXISTS logs`);
  await run(`DROP TABLE IF EXISTS agents`);
  await run(`DROP TABLE IF EXISTS rooms`);

  // ── Step 2: Recreate all tables with TEXT primary keys ──────────────────────

  await run(`
    CREATE TABLE rooms (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#00e5ff',
      icon        TEXT NOT NULL DEFAULT '⚙',
      grid_x      INTEGER NOT NULL DEFAULT 0,
      grid_y      INTEGER NOT NULL DEFAULT 0,
      grid_w      INTEGER NOT NULL DEFAULT 18,
      grid_h      INTEGER NOT NULL DEFAULT 14,
      created_at  BIGINT NOT NULL DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE agents (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      room_id          TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      role             TEXT NOT NULL DEFAULT 'Agent',
      purpose          TEXT,
      color            TEXT NOT NULL DEFAULT '#00e5ff',
      char_model       TEXT NOT NULL DEFAULT 'knight_m',
      status           TEXT NOT NULL DEFAULT 'idle',
      current_task     TEXT,
      api_key_override TEXT,
      tasks_completed  INTEGER NOT NULL DEFAULT 0,
      tasks_errored    INTEGER NOT NULL DEFAULT 0,
      created_at       BIGINT NOT NULL DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE agent_tools (
      id          TEXT PRIMARY KEY,
      agent_id    TEXT REFERENCES agents(id) ON DELETE CASCADE,
      name        TEXT NOT NULL DEFAULT '',
      description TEXT,
      enabled     BOOLEAN NOT NULL DEFAULT true
    )
  `);

  await run(`
    CREATE TABLE tasks (
      id           TEXT PRIMARY KEY,
      goal         TEXT NOT NULL,
      parent_goal  TEXT,
      room_id      TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      agent_id     TEXT REFERENCES agents(id) ON DELETE SET NULL,
      agent_name   TEXT,
      status       TEXT NOT NULL DEFAULT 'queued',
      raw_response TEXT,
      error        TEXT,
      created_at   BIGINT NOT NULL DEFAULT 0,
      started_at   BIGINT,
      completed_at BIGINT
    )
  `);

  await run(`
    CREATE TABLE task_outputs (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      type       TEXT NOT NULL DEFAULT 'text',
      label      TEXT,
      content    TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE logs (
      id        TEXT PRIMARY KEY,
      ts        BIGINT NOT NULL DEFAULT 0,
      level     TEXT NOT NULL DEFAULT 'info',
      from_name TEXT,
      to_name   TEXT,
      message   TEXT NOT NULL
    )
  `);

  // ── Step 3: Seed default rooms and agent ────────────────────────────────────

  const now = Date.now();

  await run(`INSERT INTO rooms (id,name,color,icon,grid_x,grid_y,grid_w,grid_h,created_at) VALUES ('room-management','Management','#00e5ff','⚙',4,4,18,14,${now}) ON CONFLICT (id) DO NOTHING`);
  await run(`INSERT INTO rooms (id,name,color,icon,grid_x,grid_y,grid_w,grid_h,created_at) VALUES ('room-media','Media','#cc44ff','🎨',27,4,18,14,${now}) ON CONFLICT (id) DO NOTHING`);
  await run(`INSERT INTO rooms (id,name,color,icon,grid_x,grid_y,grid_w,grid_h,created_at) VALUES ('room-factory','Factory','#ffaa00','🏭',4,23,18,14,${now}) ON CONFLICT (id) DO NOTHING`);
  await run(`INSERT INTO rooms (id,name,color,icon,grid_x,grid_y,grid_w,grid_h,created_at) VALUES ('room-research','Research','#00ff88','🔬',27,23,18,14,${now}) ON CONFLICT (id) DO NOTHING`);

  await run(`INSERT INTO agents (id,name,room_id,role,purpose,color,char_model,status,tasks_completed,tasks_errored,created_at) VALUES ('agent-supreme-leader','SUPREME LEADER','room-management','Manager','You are SUPREME LEADER — top-level director of AgentOS. Decompose goals and delegate to departments.','#ff4444','big_demon','idle',0,0,${now}) ON CONFLICT (id) DO NOTHING`);

  // ── Verify ──────────────────────────────────────────────────────────────────
  const rooms  = await query('SELECT id, name FROM rooms').catch(()=>[]);
  const agents = await query('SELECT id, name FROM agents').catch(()=>[]);
  const tables = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`).catch(()=>[]);

  const allDone = steps.every(s => s.done);

  return NextResponse.json({
    ok: allDone,
    steps,
    result: {
      tables: tables.map((t:any) => t.table_name),
      rooms,
      agents,
    }
  });
}

export async function GET() {
  try {
    const tables = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
    const rooms  = await query('SELECT id, name FROM rooms').catch(()=>[]);
    const agents = await query('SELECT id, name FROM agents').catch(()=>[]);
    return NextResponse.json({ tables: tables.map((t:any)=>t.table_name), rooms, agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}