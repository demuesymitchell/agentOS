import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Room, Agent, Task, LogEntry, PanelState, TaskOutput, PanelId } from '@/types';
import {
  seedIfEmpty, saveRoom, deleteRoomById,
  saveAgent, deleteAgentById, saveTask, saveLog, resetAll,
} from './db/persist';

const DEFAULT_PANELS: PanelState[] = [
  { id:'terminal',     label:'COMMAND HALL',   open:true,  minimized:false },
  { id:'tasks',        label:'QUEST LOG',      open:true,  minimized:false },
  { id:'media',        label:'MEDIA ROOM',     open:false, minimized:false },
  { id:'agentInspect', label:'AGENT INSPECT',  open:false, minimized:false },
  { id:'admin',        label:'GUILD HALL',     open:true,  minimized:false },
];

// Directive history key
const HISTORY_KEY = 'agentOS_directive_history';
function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50))); } catch {}
}

interface Store {
  rooms: Room[]; agents: Agent[]; tasks: Task[]; logs: LogEntry[];
  panels: PanelState[];
  selectedAgentId: string | null;
  selectedTaskId: string | null;   // for output viewer
  goalInput: string;
  isProcessing: boolean;
  activeTaskIds: Set<string>;      // for cancel
  directiveHistory: string[];
  historyIndex: number;
  apiKeyStatus: 'unknown' | 'valid' | 'invalid' | 'missing';

  openPanel(id: PanelId): void;
  closePanel(id: PanelId): void;
  toggleMinimize(id: PanelId): void;

  addRoom(room: Omit<Room,'id'|'createdAt'>): Room;
  updateRoom(id: string, patch: Partial<Room>): void;
  deleteRoom(id: string): void;
  addRoomAttachment(roomId: string, attachment: import('@/types').RoomAttachment): void;
  removeRoomAttachment(roomId: string, attachmentId: string): void;

  addAgent(agent: Omit<Agent,'id'|'createdAt'|'status'|'currentTask'|'tasksCompleted'|'tasksErrored'>): Agent;
  updateAgent(id: string, patch: Partial<Agent>): void;
  deleteAgent(id: string): void;

  addTask(task: Task): void;
  updateTask(id: string, patch: Partial<Task>): void;
  addOutput(taskId: string, output: TaskOutput): void;
  cancelTask(taskId: string): void;
  retryTask(taskId: string): void;
  addLog(entry: Omit<LogEntry,'id'|'ts'>): void;

  setSelectedAgent(id: string | null): void;
  setSelectedTask(id: string | null): void;
  setGoalInput(v: string): void;
  setIsProcessing(v: boolean): void;
  historyUp(): void;
  historyDown(): void;

  checkApiKey(): Promise<void>;
  hydrate(): Promise<void>;
  resetToDefaults(): void;
  submitGoal(goal: string): Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  rooms:[], agents:[], tasks:[], logs:[],
  panels: DEFAULT_PANELS,
  selectedAgentId: null,
  selectedTaskId: null,
  goalInput: '',
  isProcessing: false,
  activeTaskIds: new Set(),
  directiveHistory: loadHistory(),
  historyIndex: -1,
  apiKeyStatus: 'unknown',

  // ── Panels ──────────────────────────────────────────────────────────────────
  openPanel:      (id) => set(s=>({panels:s.panels.map(p=>p.id===id?{...p,open:true,minimized:false}:p)})),
  closePanel:     (id) => set(s=>({panels:s.panels.map(p=>p.id===id?{...p,open:false}:p)})),
  toggleMinimize: (id) => set(s=>({panels:s.panels.map(p=>p.id===id?{...p,minimized:!p.minimized}:p)})),

  // ── Rooms ────────────────────────────────────────────────────────────────────
  addRoom(data) {
    const room: Room = {...data, id:uuid(), createdAt:Date.now()};
    set(s=>({rooms:[...s.rooms,room]}));
    saveRoom(room);
    return room;
  },
  updateRoom(id, patch) {
    set(s=>{
      const rooms=s.rooms.map(r=>r.id===id?{...r,...patch}:r);
      const room=rooms.find(r=>r.id===id);
      if(room) saveRoom(room);
      return {rooms};
    });
  },
  deleteRoom(id) {
    set(s=>({rooms:s.rooms.filter(r=>r.id!==id)}));
    deleteRoomById(id);
  },
  addRoomAttachment(roomId, attachment) {
    set(s=>{
      const rooms=s.rooms.map(r=>r.id===roomId
        ? {...r, attachments:[...(r.attachments||[]),attachment]}
        : r);
      const room=rooms.find(r=>r.id===roomId);
      if(room) saveRoom(room);
      return {rooms};
    });
  },
  removeRoomAttachment(roomId, attachmentId) {
    set(s=>{
      const rooms=s.rooms.map(r=>r.id===roomId
        ? {...r, attachments:(r.attachments||[]).filter(a=>a.id!==attachmentId)}
        : r);
      const room=rooms.find(r=>r.id===roomId);
      if(room) saveRoom(room);
      return {rooms};
    });
  },

  // ── Agents ───────────────────────────────────────────────────────────────────
  addAgent(data) {
    const agent: Agent = {
      ...data, id:uuid(), status:'idle', currentTask:null,
      tasksCompleted:0, tasksErrored:0, createdAt:Date.now(),
      charModel:(data as any).charModel||'knight_m',
    };
    set(s=>({agents:[...s.agents,agent]}));
    saveAgent(agent);
    return agent;
  },
  updateAgent(id,patch) {
    set(s=>{
      const agents=s.agents.map(a=>a.id===id?{...a,...patch}:a);
      const agent=agents.find(a=>a.id===id);
      if(agent) saveAgent(agent);
      return {agents};
    });
  },
  deleteAgent(id) {
    set(s=>({agents:s.agents.filter(a=>a.id!==id)}));
    deleteAgentById(id);
  },

  // ── Tasks ────────────────────────────────────────────────────────────────────
  addTask(task) {
    set(s=>({tasks:[task,...s.tasks]}));
    saveTask(task);
  },
  updateTask(id,patch) {
    set(s=>{
      const tasks=s.tasks.map(t=>t.id===id?{...t,...patch}:t);
      const task=tasks.find(t=>t.id===id);
      if(task) saveTask(task);
      return {tasks};
    });
  },
  addOutput(taskId,output) {
    set(s=>{
      const tasks=s.tasks.map(t=>t.id===taskId?{...t,outputs:[...t.outputs,output]}:t);
      const task=tasks.find(t=>t.id===taskId);
      if(task) saveTask(task);
      return {tasks};
    });
  },
  cancelTask(taskId) {
    const { updateTask, updateAgent, addLog, agents, tasks } = get();
    const task = tasks.find(t=>t.id===taskId);
    if (!task || task.status==='done' || task.status==='error') return;
    updateTask(taskId, { status:'error', error:'Cancelled by user', completedAt:Date.now() });
    const agent = agents.find(a=>a.id===task.agentId);
    if (agent) updateAgent(agent.id, { status:'idle', currentTask:null });
    addLog({ level:'warn', from:'USER', message:`Task cancelled: ${task.goal.slice(0,50)}` });
    set(s=>{ const ids=new Set(s.activeTaskIds); ids.delete(taskId); return {activeTaskIds:ids}; });
  },
  retryTask(taskId) {
    const { tasks, agents, rooms, addLog, updateTask, updateAgent, addOutput, activeTaskIds } = get();
    const task = tasks.find(t=>t.id===taskId);
    if (!task) return;
    const agent = agents.find(a=>a.id===task.agentId);
    const room  = rooms.find(r=>r.id===task.roomId);
    if (!agent || !room) return;

    updateTask(taskId, { status:'running', error:null, outputs:[], startedAt:Date.now(), completedAt:null });
    updateAgent(agent.id, { status:'working', currentTask:task.goal });
    addLog({ level:'info', from:'USER', to:agent.name, message:`Retrying: ${task.goal.slice(0,50)}` });

    set(s=>{ const ids=new Set(s.activeTaskIds); ids.add(taskId); return {activeTaskIds:ids}; });

    fetch('/api/agent', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        task:task.goal,
        agent:{ name:agent.name, role:agent.role, purpose:agent.purpose, tools:agent.tools },
        apiKey:agent.apiKeyOverride||null,
        roomConfig: room ? { systemPromptOverride:room.systemPromptOverride, maxTokens:room.maxTokens, outputFormat:room.outputFormat } : null,
        attachments: room?.attachments || [],
      }),
    }).then(r=>r.json()).then(d=>{
      if(d.outputs) for(const out of d.outputs) addOutput(taskId,out);
      updateTask(taskId,{status:d.error?'error':'done',rawResponse:d.rawResponse||null,completedAt:Date.now(),error:d.error||null});
      updateAgent(agent.id,{status:d.error?'error':'idle',currentTask:null,tasksCompleted:(get().agents.find(a=>a.id===agent.id)?.tasksCompleted||0)+1});
      addLog({level:d.error?'error':'success',from:agent.name,message:d.error||`Done: ${task.goal.slice(0,50)}`});
      set(s=>{ const ids=new Set(s.activeTaskIds); ids.delete(taskId); return {activeTaskIds:ids}; });
    }).catch(e=>{
      updateTask(taskId,{status:'error',error:e?.message,completedAt:Date.now()});
      updateAgent(agent.id,{status:'error',currentTask:null});
      set(s=>{ const ids=new Set(s.activeTaskIds); ids.delete(taskId); return {activeTaskIds:ids}; });
    });
  },

  // ── Logs ─────────────────────────────────────────────────────────────────────
  addLog(entry) {
    const log: LogEntry = {...entry, id:uuid(), ts:Date.now()};
    set(s=>({logs:[log,...s.logs].slice(0,300)}));
    saveLog(log);
  },

  // ── UI ───────────────────────────────────────────────────────────────────────
  setSelectedAgent(id) { set({selectedAgentId:id}); if(id) get().openPanel('agentInspect'); },
  setSelectedTask(id)  { set({selectedTaskId:id}); },
  setGoalInput(v)      { set({goalInput:v, historyIndex:-1}); },
  setIsProcessing(v)   { set({isProcessing:v}); },

  historyUp() {
    const { directiveHistory, historyIndex, goalInput } = get();
    if (!directiveHistory.length) return;
    const nextIdx = historyIndex === -1 ? 0 : Math.min(historyIndex+1, directiveHistory.length-1);
    set({ historyIndex:nextIdx, goalInput:directiveHistory[nextIdx] });
  },
  historyDown() {
    const { historyIndex } = get();
    if (historyIndex <= 0) { set({historyIndex:-1, goalInput:''}); return; }
    const nextIdx = historyIndex - 1;
    set({ historyIndex:nextIdx, goalInput:get().directiveHistory[nextIdx] });
  },

  // ── API key check ─────────────────────────────────────────────────────────────
  async checkApiKey() {
    const { agents } = get();
    const leader = agents.find(a=>a.name==='SUPREME LEADER'||a.role.toLowerCase().includes('manager'));
    const key = leader?.apiKeyOverride || (typeof window!=='undefined'?null:null);
    // Just check if env key is set via a quick ping
    try {
      const res = await fetch('/api/check-key');
      const data = await res.json();
      set({ apiKeyStatus: data.valid ? 'valid' : data.missing ? 'missing' : 'invalid' });
    } catch {
      set({ apiKeyStatus: 'unknown' });
    }
  },

  // ── Hydrate ───────────────────────────────────────────────────────────────────
  async hydrate() {
    const { rooms, agents } = await seedIfEmpty();
    set({ rooms, agents });
    get().checkApiKey();
  },

  resetToDefaults() {
    resetAll();
    if (typeof window!=='undefined') window.location.reload();
  },

  // ── Submit goal ───────────────────────────────────────────────────────────────
  async submitGoal(goal: string) {
    const { agents, rooms, addLog, addTask, updateTask, updateAgent,
            addOutput, setIsProcessing, directiveHistory } = get();
    setIsProcessing(true);

    // Save to directive history
    const newHistory = [goal, ...directiveHistory.filter(h=>h!==goal)].slice(0,50);
    set({ directiveHistory: newHistory, historyIndex: -1 });
    saveHistory(newHistory);

    const leader = agents.find(a=>
      a.name==='SUPREME LEADER'||
      a.role.toLowerCase().includes('manager')||
      a.role.toLowerCase().includes('director')
    ) || agents[0];

    if (!leader) {
      addLog({level:'error',from:'OS',message:'No agents found. Recruit agents in Guild Hall first.'});
      setIsProcessing(false); return;
    }

    addLog({level:'info',from:'USER',to:leader.name,message:`Directive: "${goal}"`});
    updateAgent(leader.id,{status:'working',currentTask:`Analyzing: ${goal}`});

    try {
      const res = await fetch('/api/manager',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({goal,agents,rooms}),
      });
      const data = await res.json();

      if (data.error) {
        addLog({level:'error',from:leader.name,message:data.error});
        // Show API key banner
        if (data.error.includes('API key')||data.error.includes('401')) {
          set({apiKeyStatus:'invalid'});
        }
        updateAgent(leader.id,{status:'idle',currentTask:null});
        setIsProcessing(false); return;
      }

      addLog({level:'success',from:leader.name,message:data.thought||'Delegating to departments...'});
      updateAgent(leader.id,{status:'idle',currentTask:null});
      set({apiKeyStatus:'valid'});

      const subtasks: {roomName:string;agentRole:string;task:string}[] = data.tasks||[];

      for (const sub of subtasks) {
        const room = rooms.find(r=>r.name.toLowerCase().includes(sub.roomName.toLowerCase()))
          || rooms.find(r=>r.id!==leader.roomId);
        if (!room) continue;

        const agent = agents.find(a=>a.roomId===room.id);
        if (!agent) {
          addLog({level:'warn',from:leader.name,to:room.name,message:`No agent in ${room.name} — skipping`});
          continue;
        }

        const taskId = uuid();
        addLog({level:'delegate',from:leader.name,to:agent.name,message:sub.task});
        const task: Task = {
          id:taskId, goal:sub.task, roomId:room.id,
          agentId:agent.id, agentName:agent.name,
          status:'queued', outputs:[], rawResponse:null, error:null,
          createdAt:Date.now(), startedAt:null, completedAt:null, parentGoal:goal,
        };
        addTask(task);
        set(s=>{ const ids=new Set(s.activeTaskIds); ids.add(taskId); return {activeTaskIds:ids}; });

        setTimeout(async ()=>{
          if (!get().activeTaskIds.has(taskId)) return; // was cancelled
          updateAgent(agent.id,{status:'working',currentTask:sub.task});
          updateTask(taskId,{status:'running',startedAt:Date.now()});
          try {
            const r = await fetch('/api/agent',{
              method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                task:sub.task,
                agent:{name:agent.name,role:agent.role,purpose:agent.purpose,tools:agent.tools},
                apiKey:agent.apiKeyOverride||null,
                roomConfig:{
                  systemPromptOverride:room.systemPromptOverride,
                  maxTokens:room.maxTokens,
                  outputFormat:room.outputFormat,
                },
                attachments: room.attachments||[],
              }),
            });
            const d = await r.json();
            if (d.outputs) for(const out of d.outputs) addOutput(taskId,out);
            const success = !d.error;
            updateTask(taskId,{status:success?'done':'error',rawResponse:d.rawResponse||null,completedAt:Date.now(),error:d.error||null});
            addLog({level:success?'success':'error',from:agent.name,message:success?`Done: ${sub.task.slice(0,60)}`:d.error});
            updateAgent(agent.id,{
              status:success?'idle':'error',currentTask:null,
              tasksCompleted:(get().agents.find(a=>a.id===agent.id)?.tasksCompleted||0)+(success?1:0),
              tasksErrored:(get().agents.find(a=>a.id===agent.id)?.tasksErrored||0)+(success?0:1),
            });
            // Auto-open media panel if media room completed
            if (success && room.name.toLowerCase().includes('media')) {
              get().openPanel('media');
            }
          } catch(e:any) {
            updateTask(taskId,{status:'error',error:e?.message,completedAt:Date.now()});
            updateAgent(agent.id,{status:'error',currentTask:null});
            addLog({level:'error',from:agent.name,message:`Failed: ${sub.task.slice(0,50)}`});
          }
          set(s=>{ const ids=new Set(s.activeTaskIds); ids.delete(taskId); return {activeTaskIds:ids}; });
        }, 400+Math.random()*600);
      }
    } catch(e:any) {
      addLog({level:'error',from:'OS',message:e?.message||'Network error'});
    }
    setIsProcessing(false);
    set({goalInput:''});
  },
}));