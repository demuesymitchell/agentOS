import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Room, Agent, Task, LogEntry, PanelState, TaskOutput, PanelId } from '@/types';
import {
  seedIfEmpty, saveRoom, deleteRoomById,
  saveAgent, deleteAgentById, saveTask, saveLog, resetAll,
} from './db/persist';

const DEFAULT_PANELS: PanelState[] = [
  { id:'terminal',     label:'COMMAND HALL',    open:true,  minimized:false },
  { id:'tasks',        label:'QUEST LOG',       open:true,  minimized:false },
  { id:'media',        label:'ARTIFACT VAULT',  open:false, minimized:false },
  { id:'agentInspect', label:'AGENT INSPECT',   open:false, minimized:false },
  { id:'admin',        label:'GUILD HALL',      open:true,  minimized:false },
];

interface Store {
  rooms: Room[]; agents: Agent[]; tasks: Task[]; logs: LogEntry[];
  panels: PanelState[];
  selectedAgentId: string | null;
  goalInput: string; isProcessing: boolean;

  openPanel(id: PanelId): void;
  closePanel(id: PanelId): void;
  toggleMinimize(id: PanelId): void;

  addRoom(room: Omit<Room,'id'|'createdAt'>): Room;
  updateRoom(id: string, patch: Partial<Room>): void;
  deleteRoom(id: string): void;

  addAgent(agent: Omit<Agent,'id'|'createdAt'|'status'|'currentTask'|'tasksCompleted'|'tasksErrored'>): Agent;
  updateAgent(id: string, patch: Partial<Agent>): void;
  deleteAgent(id: string): void;

  addTask(task: Task): void;
  updateTask(id: string, patch: Partial<Task>): void;
  addOutput(taskId: string, output: TaskOutput): void;
  addLog(entry: Omit<LogEntry,'id'|'ts'>): void;

  setSelectedAgent(id: string | null): void;
  setGoalInput(v: string): void;
  setIsProcessing(v: boolean): void;

  hydrate(): Promise<void>;
  resetToDefaults(): void;
  submitGoal(goal: string): Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  rooms:[], agents:[], tasks:[], logs:[],
  panels: DEFAULT_PANELS,
  selectedAgentId:null, goalInput:'', isProcessing:false,

  // ── Hydrate ────────────────────────────────────────────────────────────────
  async hydrate() {
    const { rooms, agents } = await seedIfEmpty();
    set({ rooms, agents });
  },

  resetToDefaults() {
    resetAll();
    window.location.reload();
  },

  // ── Panels ─────────────────────────────────────────────────────────────────
  openPanel:(id)=>set(s=>({panels:s.panels.map(p=>p.id===id?{...p,open:true,minimized:false}:p)})),
  closePanel:(id)=>set(s=>({panels:s.panels.map(p=>p.id===id?{...p,open:false}:p)})),
  toggleMinimize:(id)=>set(s=>({panels:s.panels.map(p=>p.id===id?{...p,minimized:!p.minimized}:p)})),

  // ── Rooms ──────────────────────────────────────────────────────────────────
  addRoom(data) {
    const room: Room = {...data, id:uuid(), createdAt:Date.now()};
    set(s=>({rooms:[...s.rooms,room]}));
    saveRoom(room);
    return room;
  },
  updateRoom(id, patch) {
    set(s=>{
      const rooms = s.rooms.map(r=>r.id===id?{...r,...patch}:r);
      const room = rooms.find(r=>r.id===id);
      if (room) saveRoom(room);
      return {rooms};
    });
  },
  deleteRoom(id) {
    set(s=>({rooms:s.rooms.filter(r=>r.id!==id)}));
    deleteRoomById(id);
  },

  // ── Agents ─────────────────────────────────────────────────────────────────
  addAgent(data) {
    const agent: Agent = {
      ...data, id:uuid(), status:'idle', currentTask:null,
      tasksCompleted:0, tasksErrored:0, createdAt:Date.now(),
      charModel: (data as any).charModel || 'knight_m',
    };
    set(s=>({agents:[...s.agents,agent]}));
    saveAgent(agent);
    return agent;
  },
  updateAgent(id, patch) {
    set(s=>{
      const agents = s.agents.map(a=>a.id===id?{...a,...patch}:a);
      const agent = agents.find(a=>a.id===id);
      if (agent) saveAgent(agent);
      return {agents};
    });
  },
  deleteAgent(id) {
    set(s=>({agents:s.agents.filter(a=>a.id!==id)}));
    deleteAgentById(id);
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────
  addTask(task) {
    set(s=>({tasks:[task,...s.tasks]}));
    saveTask(task);
  },
  updateTask(id, patch) {
    set(s=>{
      const tasks = s.tasks.map(t=>t.id===id?{...t,...patch}:t);
      const task = tasks.find(t=>t.id===id);
      if (task) saveTask(task);
      return {tasks};
    });
  },
  addOutput(taskId, output) {
    set(s=>{
      const tasks = s.tasks.map(t=>t.id===taskId?{...t,outputs:[...t.outputs,output]}:t);
      const task = tasks.find(t=>t.id===taskId);
      if (task) saveTask(task);
      return {tasks};
    });
  },

  // ── Logs ───────────────────────────────────────────────────────────────────
  addLog(entry) {
    const log: LogEntry = {...entry, id:uuid(), ts:Date.now()};
    set(s=>({logs:[log,...s.logs].slice(0,300)}));
    saveLog(log);
  },

  // ── UI ─────────────────────────────────────────────────────────────────────
  setSelectedAgent(id) { set({selectedAgentId:id}); if(id) get().openPanel('agentInspect'); },
  setGoalInput(v) { set({goalInput:v}); },
  setIsProcessing(v) { set({isProcessing:v}); },

  // ── Submit goal ─────────────────────────────────────────────────────────────
  async submitGoal(goal: string) {
    const { agents, rooms, addLog, addTask, updateTask, updateAgent, addOutput, setIsProcessing } = get();
    setIsProcessing(true);

    const leader = agents.find(a =>
      a.name === 'SUPREME LEADER' ||
      a.role.toLowerCase().includes('manager') ||
      a.role.toLowerCase().includes('director')
    ) || agents[0];

    if (!leader) {
      addLog({ level:'error', from:'OS', message:'No agents found. Recruit agents in the Guild Hall first.' });
      setIsProcessing(false);
      return;
    }

    addLog({ level:'info', from:'USER', to:leader.name, message:`Directive: "${goal}"` });
    updateAgent(leader.id, { status:'working', currentTask:`Analyzing: ${goal}` });

    try {
      const res = await fetch('/api/manager', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ goal, agents, rooms }),
      });
      const data = await res.json();

      if (data.error) {
        addLog({ level:'error', from:leader.name, message:data.error });
        updateAgent(leader.id, { status:'idle', currentTask:null });
        setIsProcessing(false);
        return;
      }

      addLog({ level:'success', from:leader.name, message:data.thought || 'Orders issued. Delegating...' });
      updateAgent(leader.id, { status:'idle', currentTask:null });

      const subtasks: { roomName:string; agentRole:string; task:string }[] = data.tasks || [];

      for (const sub of subtasks) {
        const room = rooms.find(r => r.name.toLowerCase().includes(sub.roomName.toLowerCase()))
          || rooms.find(r => r.id !== leader.roomId);
        if (!room) continue;

        const agent = agents.find(a => a.roomId === room.id);
        if (!agent) {
          addLog({ level:'warn', from:leader.name, to:room.name, message:`No agent in ${room.name} — skipping` });
          continue;
        }

        const taskId = uuid();
        addLog({ level:'delegate', from:leader.name, to:agent.name, message:sub.task });
        addTask({
          id:taskId, goal:sub.task, roomId:room.id,
          agentId:agent.id, agentName:agent.name,
          status:'queued', outputs:[], rawResponse:null, error:null,
          createdAt:Date.now(), startedAt:null, completedAt:null, parentGoal:goal,
        });

        setTimeout(async () => {
          updateAgent(agent.id, { status:'working', currentTask:sub.task });
          updateTask(taskId, { status:'running', startedAt:Date.now() });
          try {
            const r = await fetch('/api/agent', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                task:sub.task,
                agent:{ name:agent.name, role:agent.role, purpose:agent.purpose, tools:agent.tools },
                apiKey:agent.apiKeyOverride || null,
              }),
            });
            const d = await r.json();
            if (d.outputs) for (const out of d.outputs) addOutput(taskId, out);
            updateTask(taskId, { status:'done', rawResponse:d.rawResponse||null, completedAt:Date.now() });
            addLog({ level:'success', from:agent.name, message:`Done: ${sub.task.slice(0,60)}` });
            updateAgent(agent.id, {
              status:'idle', currentTask:null,
              tasksCompleted:(get().agents.find(a=>a.id===agent.id)?.tasksCompleted||0)+1,
            });
          } catch (e: any) {
            updateTask(taskId, { status:'error', error:e?.message });
            addLog({ level:'error', from:agent.name, message:`Failed: ${sub.task.slice(0,50)}` });
            updateAgent(agent.id, {
              status:'error', currentTask:null,
              tasksErrored:(get().agents.find(a=>a.id===agent.id)?.tasksErrored||0)+1,
            });
          }
        }, 600 + Math.random()*800);
      }
    } catch (e: any) {
      addLog({ level:'error', from:'OS', message:e?.message || 'Network error' });
    }

    setIsProcessing(false);
    set({ goalInput:'' });
  },
}));
