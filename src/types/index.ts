export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error' | 'offline';
export type TaskStatus  = 'queued' | 'running' | 'done' | 'error';
export type LogLevel    = 'info' | 'success' | 'warn' | 'error' | 'delegate' | 'system';
export type PanelId     = 'terminal' | 'tasks' | 'media' | 'agentInspect' | 'admin';

export interface Room {
  id: string;
  name: string;
  color: string;
  icon: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  createdAt: number;
  // Room config
  systemPromptOverride?: string;
  maxTokens?: number;
  outputFormat?: 'text' | 'image' | 'listing' | 'json';
  // Attached media files
  attachments?: RoomAttachment[];
}

export interface RoomAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'text' | 'other';
  url: string;        // object URL or remote URL
  size: number;
  addedAt: number;
}

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
  role: string;
  purpose: string;
  color: string;
  status: AgentStatus;
  currentTask: string | null;
  tools: AgentTool[];
  apiKeyOverride: string | null;
  charModel: string;
  tasksCompleted: number;
  tasksErrored: number;
  createdAt: number;
}

export interface TaskOutput {
  id?: string;
  type: 'text' | 'image' | 'listing' | 'json' | 'file';
  content: string;
  label?: string;
  mimeType?: string;
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
  parentGoal: string | null;
}

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  from: string;
  to?: string;
  message: string;
}

export interface PanelState {
  id: PanelId;
  label: string;
  open: boolean;
  minimized: boolean;
}