/**
 * persist.ts — storage layer
 * 
 * - In the browser: calls /api/db/* endpoints → PostgreSQL on Railway
 * - Falls back to localStorage if the API fails (offline / dev mode)
 */

import type { Room, Agent, Task, LogEntry } from '@/types';

// ─── Seed defaults ─────────────────────────────────────────────────────────────

export const SEED_ROOMS: Room[] = [
  { id:'room-management', name:'Management', color:'#00e5ff', icon:'⚙', gridX:4,  gridY:4,  gridW:18, gridH:14, createdAt:Date.now() },
  { id:'room-media',      name:'Media',      color:'#cc44ff', icon:'🎨',gridX:27, gridY:4,  gridW:18, gridH:14, createdAt:Date.now() },
  { id:'room-factory',    name:'Factory',    color:'#ffaa00', icon:'🏭',gridX:4,  gridY:23, gridW:18, gridH:14, createdAt:Date.now() },
  { id:'room-research',   name:'Research',   color:'#00ff88', icon:'🔬',gridX:27, gridY:23, gridW:18, gridH:14, createdAt:Date.now() },
];

export const SEED_AGENT: Agent = {
  id:'agent-supreme-leader', name:'SUPREME LEADER', roomId:'room-management',
  role:'Manager', purpose:'You are SUPREME LEADER — top-level director of AgentOS. Receive high-level goals and decompose into concrete tasks for each department. Delegate everything.',
  color:'#ff4444', charModel:'big_demon', status:'idle', currentTask:null,
  tools:[{id:'tool-claude',name:'claude_completion',description:'Claude AI completions',enabled:true}],
  apiKeyOverride:null, tasksCompleted:0, tasksErrored:0, createdAt:Date.now(),
};

// ─── API helpers ───────────────────────────────────────────────────────────────

async function apiGet<T>(path: string, fallback: T[]): Promise<T[]> {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data as T[];
  } catch {
    return fallback;
  }
}

async function apiPost(path: string, body: any): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

async function apiDelete(path: string, body: any): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

// ─── localStorage fallback ────────────────────────────────────────────────────

const LS = {
  get<T>(key: string, fallback: T[]): T[] {
    if (typeof window === 'undefined') return fallback;
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
    catch { return fallback; }
  },
  set(key: string, data: any[]): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  },
};

// ─── Public API ────────────────────────────────────────────────────────────────

export async function getRooms(): Promise<Room[]> {
  const rows = await apiGet<Room>('/api/db/rooms', []);
  if (rows.length > 0) return rows;
  // Fallback to localStorage
  const local = LS.get<Room>('agentOS_rooms', []);
  return local.length > 0 ? local : SEED_ROOMS;
}

export async function getAgents(): Promise<Agent[]> {
  const rows = await apiGet<Agent>('/api/db/agents', []);
  if (rows.length > 0) return rows;
  const local = LS.get<Agent>('agentOS_agents', []);
  return local.length > 0 ? local : [SEED_AGENT];
}

export async function getTasks(): Promise<Task[]> {
  return apiGet<Task>('/api/db/tasks', LS.get<Task>('agentOS_tasks', []));
}

export async function getLogs(): Promise<LogEntry[]> {
  const rows = await apiGet<LogEntry>('/api/db/logs', []);
  if (rows.length > 0) return rows;
  return [
    { id:'0', ts:Date.now(), level:'system', from:'OS',             message:'AgentOS v0.3 initialized' },
    { id:'1', ts:Date.now(), level:'system', from:'SUPREME LEADER', message:'Standing by for directives.' },
  ];
}

export async function saveRoom(room: Room): Promise<void> {
  await apiPost('/api/db/rooms', room);
  const rooms = LS.get<Room>('agentOS_rooms', []);
  const updated = [...rooms.filter(r=>r.id!==room.id), room];
  LS.set('agentOS_rooms', updated);
}

export async function deleteRoomById(id: string): Promise<void> {
  await apiDelete('/api/db/rooms', { id });
  LS.set('agentOS_rooms', LS.get<Room>('agentOS_rooms',[]).filter(r=>r.id!==id));
}

export async function saveAgent(agent: Agent): Promise<void> {
  await apiPost('/api/db/agents', agent);
  const agents = LS.get<Agent>('agentOS_agents', []);
  const updated = [...agents.filter(a=>a.id!==agent.id), agent];
  LS.set('agentOS_agents', updated);
}

export async function deleteAgentById(id: string): Promise<void> {
  await apiDelete('/api/db/agents', { id });
  LS.set('agentOS_agents', LS.get<Agent>('agentOS_agents',[]).filter(a=>a.id!==id));
}

export async function saveTask(task: Task): Promise<void> {
  await apiPost('/api/db/tasks', task);
}

export async function saveLog(entry: LogEntry): Promise<void> {
  await apiPost('/api/db/logs', entry);
}

export async function seedIfEmpty(): Promise<{ rooms: Room[]; agents: Agent[] }> {
  const rooms  = await getRooms();
  const agents = await getAgents();
  return { rooms, agents };
}

export function resetAll(): void {
  if (typeof window === 'undefined') return;
  ['agentOS_rooms','agentOS_agents','agentOS_tasks','agentOS_logs','agentOS_seeded']
    .forEach(k => localStorage.removeItem(k));
}