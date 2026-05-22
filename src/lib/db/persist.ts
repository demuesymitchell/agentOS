import type { Room, Agent, Task, LogEntry } from '@/types';

export const SEED_ROOMS: Room[] = [
  { id:'room-management', name:'Management', color:'#00e5ff', icon:'⚙', gridX:4,  gridY:4,  gridW:18, gridH:14, createdAt:1000 },
  { id:'room-media',      name:'Media',      color:'#cc44ff', icon:'🎨',gridX:27, gridY:4,  gridW:18, gridH:14, createdAt:1000 },
  { id:'room-factory',    name:'Factory',    color:'#ffaa00', icon:'🏭',gridX:4,  gridY:23, gridW:18, gridH:14, createdAt:1000 },
  { id:'room-research',   name:'Research',   color:'#00ff88', icon:'🔬',gridX:27, gridY:23, gridW:18, gridH:14, createdAt:1000 },
];

export const SEED_AGENT: Agent = {
  id:'agent-supreme-leader', name:'SUPREME LEADER', roomId:'room-management',
  role:'Manager',
  purpose:'You are SUPREME LEADER — top-level director of AgentOS. Receive high-level goals and decompose into concrete tasks for each department. Delegate everything.',
  color:'#ff4444', charModel:'big_demon', status:'idle', currentTask:null,
  tools:[{id:'tool-claude',name:'claude_completion',description:'Claude AI completions',enabled:true}],
  apiKeyOverride:null, tasksCompleted:0, tasksErrored:0, createdAt:1000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T[] | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data as T[];
  } catch { return null; }
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
  } catch { return false; }
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
  } catch { return false; }
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

// ─── Seed if empty ─────────────────────────────────────────────────────────────

export async function seedIfEmpty(): Promise<{ rooms: Room[]; agents: Agent[] }> {
  // 1. Try to load from DB
  const dbRooms  = await apiGet<Room>('/api/db/rooms');
  const dbAgents = await apiGet<Agent>('/api/db/agents');

  // 2. If DB has data, use it and sync to localStorage cache
  if (dbRooms && dbRooms.length > 0) {
    LS.set('agentOS_rooms', dbRooms);
    const agents = dbAgents && dbAgents.length > 0 ? dbAgents : [SEED_AGENT];
    LS.set('agentOS_agents', agents);
    return { rooms: dbRooms, agents };
  }

  // 3. DB is empty — auto-seed it via the seed endpoint
  try {
    const res = await fetch('/api/db/seed', { method: 'POST' });
    const data = await res.json();
    if (data.ok && data.rooms?.length > 0) {
      LS.set('agentOS_rooms', data.rooms);
      LS.set('agentOS_agents', data.agents || [SEED_AGENT]);
      return { rooms: data.rooms, agents: data.agents || [SEED_AGENT] };
    }
  } catch {}

  // 4. DB seed failed — fall back to localStorage
  const localRooms  = LS.get<Room>('agentOS_rooms', []);
  const localAgents = LS.get<Agent>('agentOS_agents', []);

  if (localRooms.length > 0) {
    return { rooms: localRooms, agents: localAgents.length > 0 ? localAgents : [SEED_AGENT] };
  }

  // 5. Absolute fallback — use hardcoded defaults and save locally
  LS.set('agentOS_rooms',  SEED_ROOMS);
  LS.set('agentOS_agents', [SEED_AGENT]);
  return { rooms: SEED_ROOMS, agents: [SEED_AGENT] };
}

// ─── CRUD — write to DB first, then update localStorage cache ─────────────────

export async function saveRoom(room: Room): Promise<void> {
  await apiPost('/api/db/rooms', room);
  const rooms = LS.get<Room>('agentOS_rooms', []);
  LS.set('agentOS_rooms', [...rooms.filter(r => r.id !== room.id), room]);
}

export async function deleteRoomById(id: string): Promise<void> {
  await apiDelete('/api/db/rooms', { id });
  LS.set('agentOS_rooms', LS.get<Room>('agentOS_rooms', []).filter(r => r.id !== id));
}

export async function saveAgent(agent: Agent): Promise<void> {
  await apiPost('/api/db/agents', agent);
  const agents = LS.get<Agent>('agentOS_agents', []);
  LS.set('agentOS_agents', [...agents.filter(a => a.id !== agent.id), agent]);
}

export async function deleteAgentById(id: string): Promise<void> {
  await apiDelete('/api/db/agents', { id });
  LS.set('agentOS_agents', LS.get<Agent>('agentOS_agents', []).filter(a => a.id !== id));
}

export async function saveTask(task: Task): Promise<void> {
  await apiPost('/api/db/tasks', task);
}

export async function saveLog(entry: LogEntry): Promise<void> {
  await apiPost('/api/db/logs', entry);
}

export function resetAll(): void {
  if (typeof window === 'undefined') return;
  ['agentOS_rooms','agentOS_agents','agentOS_tasks','agentOS_logs','agentOS_seeded']
    .forEach(k => localStorage.removeItem(k));
}