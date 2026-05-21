// ─── Core Types ────────────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error' | 'offline';
export type TaskStatus  = 'queued' | 'running' | 'done' | 'error';
export type LogLevel    = 'info' | 'success' | 'warn' | 'error' | 'delegate' | 'system';
export type PanelId     = 'terminal' | 'tasks' | 'media' | 'agentInspect' | 'admin';

// ─── Room ──────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  color: string;       // hex e.g. '#00e5ff'
  icon: string;        // emoji or short label
  gridX: number;       // tile position on map
  gridY: number;
  gridW: number;
  gridH: number;
  createdAt: number;
}

// ─── Agent ─────────────────────────────────────────────────────────────────────

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface Agent {
  id: string;
  name: string;
  roomId: string;
  role: string;              // e.g. "Designer", "Copywriter"
  purpose: string;           // system prompt / purpose description
  color: string;
  status: AgentStatus;
  currentTask: string | null;
  tools: AgentTool[];
  apiKeyOverride: string | null;  // if null, uses global ANTHROPIC_API_KEY
  charModel: string;              // sprite key e.g. 'big_demon', 'knight_m'
  tasksCompleted: number;
  tasksErrored: number;
  createdAt: number;
  x?: number;
  y?: number;
}

// ─── Task ──────────────────────────────────────────────────────────────────────

export interface TaskOutput {
  type: 'text' | 'image' | 'listing' | 'json';
  content: string;       // text, image URL, JSON string
  label?: string;
}

export interface Task {
  id: string;
  goal: string;
  roomId: string;
  agentId: string | null;
  agentName: string | null;
  status: TaskStatus;
  outputs: TaskOutput[];
  rawResponse: string | null;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  parentGoal: string | null;   // the original user directive
}

// ─── Log ───────────────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  from: string;
  to?: string;
  message: string;
}

// ─── Panel state ───────────────────────────────────────────────────────────────

export interface PanelState {
  id: PanelId;
  label: string;
  open: boolean;
  minimized: boolean;
}

// ─── DB schema (Postgres-ready, localStorage-backed now) ───────────────────────
// Tables: rooms, agents, tasks, logs
// All IDs are UUIDs, timestamps are Unix ms integers
// When migrating to Postgres: run /lib/db/migrate.sql
