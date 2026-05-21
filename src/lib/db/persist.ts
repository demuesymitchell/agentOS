import type { Room, Agent, Task, LogEntry } from '@/types';

const KEYS = {
  rooms:  'agentOS_rooms',
  agents: 'agentOS_agents',
  tasks:  'agentOS_tasks',
  logs:   'agentOS_logs',
  seeded: 'agentOS_seeded',
};

function load<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export const SEED_ROOMS: Room[] = [
  { id:'room-management', name:'Management', color:'#00e5ff', icon:'⚙', gridX:4,  gridY:4,  gridW:18, gridH:16, createdAt:Date.now() },
  { id:'room-media',      name:'Media',      color:'#cc44ff', icon:'🎨',gridX:28, gridY:4,  gridW:16, gridH:16, createdAt:Date.now() },
  { id:'room-factory',    name:'Factory',    color:'#ffaa00', icon:'🏭',gridX:4,  gridY:26, gridW:16, gridH:16, createdAt:Date.now() },
  { id:'room-research',   name:'Research',   color:'#00ff88', icon:'🔬',gridX:26, gridY:26, gridW:18, gridH:16, createdAt:Date.now() },
];

export const SEED_AGENT: Agent = {
  id: 'agent-supreme-leader',
  name: 'SUPREME LEADER',
  roomId: 'room-management',
  role: 'Manager',
  purpose: `You are SUPREME LEADER — the top-level director of AgentOS.
Receive high-level goals and decompose them into concrete tasks for each department.
Delegate: research to Research, creative/visual to Media, product/listings to Factory.
Be decisive. Be efficient. Delegate everything.`,
  color: '#ff4444',
  charModel: 'big_demon',
  status: 'idle',
  currentTask: null,
  tools: [{ id:'tool-claude', name:'claude_completion', description:'Claude AI completions', enabled:true }],
  apiKeyOverride: null,
  tasksCompleted: 0,
  tasksErrored: 0,
  createdAt: Date.now(),
};

export function seedIfEmpty(): { rooms: Room[]; agents: Agent[] } {
  if (typeof window === 'undefined') return { rooms: SEED_ROOMS, agents: [SEED_AGENT] };

  const seeded = localStorage.getItem(KEYS.seeded);
  const existingRooms = localStorage.getItem(KEYS.rooms);

  if (!seeded || !existingRooms) {
    save(KEYS.rooms,  SEED_ROOMS);
    save(KEYS.agents, [SEED_AGENT]);
    localStorage.setItem(KEYS.seeded, '1');
    return { rooms: SEED_ROOMS, agents: [SEED_AGENT] };
  }

  const rooms  = load<Room>(KEYS.rooms,  SEED_ROOMS);
  const agents = load<Agent>(KEYS.agents, [SEED_AGENT]);

  if (rooms.length === 0) {
    save(KEYS.rooms, SEED_ROOMS);
    return { rooms: SEED_ROOMS, agents };
  }

  // Backfill charModel for agents missing it
  const patched = agents.map(a => ({
    ...a,
    charModel: a.charModel || (a.name === 'SUPREME LEADER' ? 'big_demon' : 'knight_m'),
  }));

  return { rooms, agents: patched };
}

export function getRooms():  Room[]     { return load<Room>(KEYS.rooms, SEED_ROOMS); }
export function getAgents(): Agent[]    { return load<Agent>(KEYS.agents, [SEED_AGENT]); }
export function getTasks():  Task[]     { return load<Task>(KEYS.tasks, []); }
export function getLogs():   LogEntry[] {
  return load<LogEntry>(KEYS.logs, [
    { id:'0', ts:Date.now(), level:'system', from:'OS',             message:'AgentOS v0.3 initialized' },
    { id:'1', ts:Date.now(), level:'system', from:'SUPREME LEADER', message:'Standing by for directives.' },
  ]);
}

export function saveRooms(r: Room[]):     void { save(KEYS.rooms, r); }
export function saveAgents(a: Agent[]):   void { save(KEYS.agents, a); }
export function saveTasks(t: Task[]):     void { save(KEYS.tasks, t.slice(0, 500)); }
export function saveLogs(l: LogEntry[]):  void { save(KEYS.logs, l.slice(0, 300)); }

export function resetAll(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
