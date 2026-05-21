'use client';
import { useState } from 'react';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';
import type { AgentTool } from '@/types';
import { v4 as uuid } from 'uuid';

// All 25 character models from the tileset
const ALL_CHARS = [
  { key:'big_demon',    label:'Big Demon',    emoji:'👹' },
  { key:'big_zombie',   label:'Big Zombie',   emoji:'🧟' },
  { key:'ogre',         label:'Ogre',         emoji:'👾' },
  { key:'knight_m',     label:'Knight M',     emoji:'⚔️' },
  { key:'knight_f',     label:'Knight F',     emoji:'🛡️' },
  { key:'wizzard_m',    label:'Wizard M',     emoji:'🧙' },
  { key:'wizzard_f',    label:'Wizard F',     emoji:'🪄' },
  { key:'elf_m',        label:'Elf M',        emoji:'🏹' },
  { key:'elf_f',        label:'Elf F',        emoji:'🌿' },
  { key:'lizard_m',     label:'Lizard M',     emoji:'🦎' },
  { key:'lizard_f',     label:'Lizard F',     emoji:'🐉' },
  { key:'dwarf_m',      label:'Dwarf M',      emoji:'⛏️' },
  { key:'dwarf_f',      label:'Dwarf F',      emoji:'🪓' },
  { key:'orc_warrior',  label:'Orc Warrior',  emoji:'🗡️' },
  { key:'orc_shaman',   label:'Orc Shaman',   emoji:'🔮' },
  { key:'masked_orc',   label:'Masked Orc',   emoji:'🎭' },
  { key:'chort',        label:'Chort',        emoji:'😈' },
  { key:'imp',          label:'Imp',          emoji:'🐾' },
  { key:'goblin',       label:'Goblin',       emoji:'👺' },
  { key:'skelet',       label:'Skeleton',     emoji:'💀' },
  { key:'tiny_zombie',  label:'Tiny Zombie',  emoji:'🧠' },
  { key:'wogol',        label:'Wogol',        emoji:'👿' },
  { key:'pumpkin_dude', label:'Pumpkin',      emoji:'🎃' },
  { key:'doc',          label:'Doc',          emoji:'🔬' },
  { key:'angel',        label:'Angel',        emoji:'😇' },
];

const ROOM_GRID_COLS = 2;
const ROOM_SLOT_W    = 18;
const ROOM_SLOT_H    = 14;
const HALL           = 5;
const PAD            = 4;

const AGENT_COLORS = ['#ff4444','#00e5ff','#cc44ff','#ffaa00','#00ff88','#4488ff','#ff88cc','#ffffff'];
const ROOM_COLORS  = ['#00e5ff','#cc44ff','#ffaa00','#00ff88','#ff4444','#4488ff'];

const DEFAULT_TOOLS: AgentTool[] = [
  { id:uuid(), name:'claude_completion', description:'Claude AI completions',    enabled:true  },
  { id:uuid(), name:'web_search',        description:'Search the web',           enabled:false },
  { id:uuid(), name:'image_gen',         description:'Generate images (DALL-E)', enabled:false },
  { id:uuid(), name:'etsy_api',          description:'Etsy store API',          enabled:false },
  { id:uuid(), name:'email_send',        description:'Send emails',             enabled:false },
];

// ─── Character Selector ────────────────────────────────────────────────────────

function CharSelector({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <div>
      <label className="cinzel text-[11px] dim block mb-2">CHARACTER MODEL</label>
      <div className="grid gap-1" style={{ gridTemplateColumns:'repeat(5,1fr)' }}>
        {ALL_CHARS.map(c => (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            title={c.label}
            className="flex flex-col items-center justify-center p-1 transition-all"
            style={{
              background: value === c.key ? '#241a10' : '#0c0806',
              border: value === c.key ? '1px solid #e8c84a' : '1px solid #3a2818',
              boxShadow: value === c.key ? '0 0 6px #e8c84a44' : 'none',
              minHeight: 44,
            }}
          >
            <img
              src={`/assets/tiles/frames/${c.key}_idle_anim_f0.png`}
              alt={c.label}
              style={{ imageRendering:'pixelated', width:32, height:32, objectFit:'contain' }}
            />
            <span className="cinzel text-[7px] dim mt-0.5 text-center leading-tight">
              {c.label.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Room Grid Picker ─────────────────────────────────────────────────────────

function RoomGridPicker({ rooms, onSelect }: { rooms: any[]; onSelect: (col:number,row:number)=>void }) {
  const [hover, setHover] = useState<{col:number,row:number}|null>(null);
  const occupiedSlots = new Set(rooms.map((_,i) => `${i%ROOM_GRID_COLS},${Math.floor(i/ROOM_GRID_COLS)}`));
  const maxSlots = Math.max(4, rooms.length + 2);
  const showCols = Math.min(ROOM_GRID_COLS + 1, 4);
  const showRows = Math.min(Math.ceil(maxSlots/ROOM_GRID_COLS) + 1, 4);

  return (
    <div className="p-3">
      <p className="cinzel text-[11px] dim mb-1">SELECT ROOM POSITION</p>
      <p className="cinzel text-[10px] dim mb-3 opacity-60">Click an empty slot to place your room</p>
      <div className="flex flex-col gap-1">
        {Array.from({length:showRows}).map((_,row) => (
          <div key={row} className="flex gap-1">
            {Array.from({length:showCols}).map((_,col) => {
              const key = `${col},${row}`;
              const isOccupied = occupiedSlots.has(key);
              const room = isOccupied ? rooms[col+row*ROOM_GRID_COLS] : null;
              const isHov = hover?.col===col && hover?.row===row;
              return (
                <div key={col}
                  className="flex items-center justify-center transition-all"
                  style={{
                    width:72, height:56,
                    background: isOccupied ? '#1a1206' : isHov ? '#1e1408' : '#0c0806',
                    border: isOccupied ? `1px solid ${room?.color||'#4a3820'}44`
                           : isHov ? '1px solid #e8c84a' : '1px solid #3a2818',
                    cursor: isOccupied ? 'default' : 'pointer',
                  }}
                  onMouseEnter={() => !isOccupied && setHover({col,row})}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => !isOccupied && onSelect(col,row)}
                >
                  {isOccupied && room ? (
                    <div className="text-center">
                      <div className="text-sm">{room.icon}</div>
                      <div className="cinzel text-[8px]" style={{color:room.color}}>{room.name.slice(0,7)}</div>
                    </div>
                  ) : (
                    <div className="cinzel dim text-[18px]">{isHov ? '+' : '·'}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Agent Form ────────────────────────────────────────────────────────────────

function AgentForm({ onClose }: { onClose:()=>void }) {
  const { rooms, addAgent, addLog } = useStore();
  const [form, setForm] = useState({
    name:'', role:'', roomId:rooms[0]?.id||'',
    purpose:'', color:AGENT_COLORS[1], apiKeyOverride:'',
    charModel:'knight_m',
    tools: DEFAULT_TOOLS.map(t=>({...t,id:uuid()})),
    showApiKey: false,
  });
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));
  const toggleTool = (id:string) => setForm(f=>({...f,tools:f.tools.map(t=>t.id===id?{...t,enabled:!t.enabled}:t)}));
  const valid = form.name.trim() && form.role.trim() && form.roomId;

  const submit = () => {
    if (!valid) return;
    addAgent({
      name: form.name.trim().toUpperCase(),
      role: form.role.trim(),
      roomId: form.roomId,
      purpose: form.purpose.trim(),
      color: form.color,
      charModel: form.charModel,
      tools: form.tools.filter(t=>t.enabled),
      apiKeyOverride: form.apiKeyOverride.trim() || null,
    });
    addLog({ level:'success', from:'GUILD', message:`${form.name.toUpperCase()} has joined` });
    onClose();
  };

  return (
    <div className="scroll-dungeon p-3 space-y-3" style={{maxHeight:'calc(100vh - 200px)', overflowY:'auto'}}>
      <p className="cinzel text-[12px] gold">⚔ Recruit Agent</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="cinzel text-[11px] dim block mb-1">NAME *</label>
          <input value={form.name} onChange={e=>set('name',e.target.value)}
            placeholder="e.g. HERALD-01" className="input-dungeon" />
        </div>
        <div>
          <label className="cinzel text-[11px] dim block mb-1">ROLE *</label>
          <input value={form.role} onChange={e=>set('role',e.target.value)}
            placeholder="e.g. Designer" className="input-dungeon" />
        </div>
      </div>

      <div>
        <label className="cinzel text-[11px] dim block mb-1">ASSIGN TO ROOM *</label>
        <select value={form.roomId} onChange={e=>set('roomId',e.target.value)} className="input-dungeon">
          {rooms.length===0
            ? <option value="">Build a room first</option>
            : rooms.map(r=><option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
        </select>
      </div>

      {/* Character model selector */}
      <CharSelector value={form.charModel} onChange={v=>set('charModel',v)} />

      <div>
        <label className="cinzel text-[11px] dim block mb-1">PURPOSE / ORDERS</label>
        <textarea value={form.purpose} onChange={e=>set('purpose',e.target.value)} rows={3}
          placeholder="Describe this agent's mission and behavior..."
          className="input-dungeon resize-none" style={{lineHeight:1.5}} />
      </div>

      {/* Agent color */}
      <div>
        <label className="cinzel text-[11px] dim block mb-2">AGENT COLOR</label>
        <div className="flex gap-2 flex-wrap">
          {AGENT_COLORS.map(c=>(
            <button key={c} onClick={()=>set('color',c)}
              className="w-6 h-6 transition-transform hover:scale-110"
              style={{background:c,border:form.color===c?'2px solid #fff':'2px solid transparent',
                boxShadow:form.color===c?`0 0 6px ${c}`:'none'}} />
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="cinzel text-[11px] dim">API KEY OVERRIDE</label>
          <button onClick={()=>set('showApiKey',!form.showApiKey)}
            className="cinzel dim text-[10px] hover:gold transition-colors">
            {form.showApiKey ? 'hide' : 'show'}
          </button>
        </div>
        <input
          type={form.showApiKey ? 'text' : 'password'}
          value={form.apiKeyOverride}
          onChange={e=>set('apiKeyOverride',e.target.value)}
          placeholder="Leave blank to use global ANTHROPIC_API_KEY"
          className="input-dungeon"
        />
        <p className="cinzel text-[9px] dim mt-1">Set a per-agent key to use different Anthropic accounts</p>
      </div>

      {/* Tools */}
      <div>
        <label className="cinzel text-[11px] dim block mb-2">ABILITIES</label>
        <div className="space-y-1">
          {form.tools.map(t=>(
            <label key={t.id} className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={t.enabled} onChange={()=>toggleTool(t.id)} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="cinzel text-[11px] parchment">{t.name}</p>
                <p className="cinzel text-[10px] dim">{t.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={!valid} className="btn-dungeon primary flex-1">RECRUIT</button>
        <button onClick={onClose} className="btn-dungeon px-3">Cancel</button>
      </div>
    </div>
  );
}

// ─── Room Form ─────────────────────────────────────────────────────────────────

function RoomForm({ onClose }: { onClose:()=>void }) {
  const { rooms, addRoom, addLog } = useStore();
  const [step, setStep] = useState<'grid'|'details'>('grid');
  const [gridPos, setGridPos] = useState<{col:number,row:number}|null>(null);
  const [form, setForm] = useState({ name:'', color:ROOM_COLORS[0], icon:'🏰' });
  const icons = ['🏰','⚔','🎨','🏭','🔬','📡','💎','🗡','⚗','🧪','🏛','🔮'];

  const submit = () => {
    if (!form.name.trim() || !gridPos) return;
    const col=gridPos.col, row=gridPos.row;
    const gx = PAD + col*(ROOM_SLOT_W+HALL);
    const gy = PAD + row*(ROOM_SLOT_H+HALL);
    addRoom({ name:form.name.trim(), color:form.color, icon:form.icon,
      gridX:gx, gridY:gy, gridW:ROOM_SLOT_W, gridH:ROOM_SLOT_H });
    addLog({ level:'success', from:'GUILD', message:`"${form.name}" established` });
    onClose();
  };

  if (step==='grid') return (
    <div>
      <RoomGridPicker rooms={rooms} onSelect={(col,row)=>{ setGridPos({col,row}); setStep('details'); }} />
      <div className="px-3 pb-3">
        <button onClick={onClose} className="btn-dungeon w-full">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={()=>setStep('grid')} className="btn-dungeon text-[10px] px-2 py-1">← Back</button>
        <p className="cinzel text-[12px] gold">Room Details</p>
        {gridPos && <span className="cinzel text-[10px] dim ml-auto">Slot [{gridPos.col},{gridPos.row}]</span>}
      </div>
      <div>
        <label className="cinzel text-[11px] dim block mb-1">ROOM NAME *</label>
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
          placeholder="e.g. Blacksmith" className="input-dungeon" />
      </div>
      <div>
        <label className="cinzel text-[11px] dim block mb-2">SIGIL</label>
        <div className="flex gap-1 flex-wrap">
          {icons.map(e=>(
            <button key={e} onClick={()=>setForm(f=>({...f,icon:e}))}
              className="w-8 h-8 flex items-center justify-center text-base transition-transform hover:scale-110"
              style={{background:form.icon===e?'#241a10':'transparent',
                border:form.icon===e?'1px solid #e8c84a':'1px solid #3a2818'}}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="cinzel text-[11px] dim block mb-2">ROOM COLOR</label>
        <div className="flex gap-2 flex-wrap">
          {ROOM_COLORS.map(c=>(
            <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
              className="w-6 h-6 transition-transform hover:scale-110"
              style={{background:c,border:form.color===c?'2px solid #fff':'2px solid transparent',
                boxShadow:form.color===c?`0 0 6px ${c}`:'none'}} />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={!form.name} className="btn-dungeon primary flex-1">ESTABLISH</button>
        <button onClick={onClose} className="btn-dungeon px-3">Cancel</button>
      </div>
    </div>
  );
}

// ─── Agent Edit Modal (API key + charModel) ───────────────────────────────────

function AgentEditModal({ agentId, onClose }: { agentId:string; onClose:()=>void }) {
  const { agents, updateAgent, rooms } = useStore();
  const agent = agents.find(a=>a.id===agentId);
  const [apiKey, setApiKey] = useState(agent?.apiKeyOverride||'');
  const [charModel, setCharModel] = useState(agent?.charModel||'knight_m');
  const [showKey, setShowKey] = useState(false);
  if (!agent) return null;

  const save = () => {
    updateAgent(agentId, { apiKeyOverride: apiKey.trim()||null, charModel });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="panel-dungeon w-96 max-h-[80vh] overflow-y-auto">
        <div className="panel-header">
          <span className="cinzel gold text-[11px]">Edit {agent.name}</span>
          <button onClick={onClose} className="btn-dungeon danger" style={{fontSize:9,padding:'1px 5px'}}>✕</button>
        </div>
        <div className="p-3 space-y-4">
          {/* Char model */}
          <CharSelector value={charModel} onChange={setCharModel} />

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="cinzel text-[11px] dim">API KEY OVERRIDE</label>
              <button onClick={()=>setShowKey(v=>!v)} className="cinzel dim text-[10px] hover:gold">{showKey?'hide':'show'}</button>
            </div>
            <input
              type={showKey?'text':'password'}
              value={apiKey}
              onChange={e=>setApiKey(e.target.value)}
              placeholder="sk-ant-... (blank = global key)"
              className="input-dungeon"
            />
            {apiKey && (
              <div className="flex items-center gap-1 mt-1">
                <span style={{width:6,height:6,borderRadius:'50%',background:'#50a060',display:'inline-block'}}/>
                <span className="cinzel text-[10px]" style={{color:'#50a060'}}>Custom key set</span>
              </div>
            )}
            {!apiKey && (
              <div className="flex items-center gap-1 mt-1">
                <span style={{width:6,height:6,borderRadius:'50%',background:'#4a3820',display:'inline-block'}}/>
                <span className="cinzel text-[10px] dim">Using global key from .env.local</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="btn-dungeon primary flex-1">SAVE CHANGES</button>
            <button onClick={onClose} className="btn-dungeon px-3">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { rooms, agents, deleteAgent, deleteRoom, addLog, resetToDefaults } = useStore();
  const [view, setView] = useState<'list'|'newAgent'|'newRoom'>('list');
  const [editAgentId, setEditAgentId] = useState<string|null>(null);

  return (
    <>
      {editAgentId && (
        <AgentEditModal agentId={editAgentId} onClose={()=>setEditAgentId(null)} />
      )}

      <Panel id="admin" title="GUILD HALL" icon="⚙">
        {view==='newAgent' && <AgentForm onClose={()=>setView('list')} />}
        {view==='newRoom'  && <RoomForm  onClose={()=>setView('list')} />}
        {view==='list' && (
          <div className="flex flex-col overflow-hidden">
            <div className="flex gap-2 p-2 border-b border-[#3a2818] flex-shrink-0">
              <button onClick={()=>setView('newAgent')} className="btn-dungeon primary flex-1 text-[10px]">⚔ Recruit</button>
              <button onClick={()=>setView('newRoom')}  className="btn-dungeon flex-1 text-[10px]">🏰 Build Room</button>
            </div>

            <div className="scroll-dungeon overflow-y-auto" style={{maxHeight:'calc(100vh - 260px)'}}>
              {/* Rooms */}
              <div className="p-2">
                <p className="cinzel text-[10px] dim mb-2 uppercase tracking-wider">Rooms ({rooms.length})</p>
                {rooms.length===0
                  ? <p className="cinzel text-[11px] dim py-2">No rooms established</p>
                  : rooms.map(room=>{
                    const ra=agents.filter(a=>a.roomId===room.id);
                    return (
                      <div key={room.id} className="flex items-center gap-2 p-2 mb-1"
                        style={{background:'#0c0806',border:`1px solid ${room.color}33`}}>
                        <span className="text-sm">{room.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="cinzel text-[11px]" style={{color:room.color}}>{room.name}</p>
                          <p className="cinzel text-[10px] dim">{ra.length} agent{ra.length!==1?'s':''}</p>
                        </div>
                        <button onClick={()=>{
                          if(confirm(`Destroy "${room.name}"?`)){
                            deleteRoom(room.id);
                            addLog({level:'warn',from:'GUILD',message:`"${room.name}" destroyed`});
                          }
                        }} className="btn-dungeon danger text-[9px] px-2 py-1">DEL</button>
                      </div>
                    );
                  })}
              </div>

              {/* Agents */}
              <div className="p-2 border-t border-[#3a2818]">
                <p className="cinzel text-[10px] dim mb-2 uppercase tracking-wider">Agents ({agents.length})</p>
                {agents.length===0
                  ? <div style={{background:'#0c0806',border:'1px dashed #3a2818'}} className="p-4 text-center">
                      <p className="cinzel text-[11px] dim">No agents recruited</p>
                    </div>
                  : agents.map(agent=>{
                    const room=rooms.find(r=>r.id===agent.roomId);
                    const sc:Record<string,string>={idle:'#4a3820',working:'#e87830',error:'#c83030',offline:'#2a1810'};
                    const charImg=`/assets/tiles/frames/${agent.charModel||'knight_m'}_idle_anim_f0.png`;
                    return (
                      <div key={agent.id} style={{background:'#0c0806',border:`1px solid ${agent.color}33`}} className="p-2 mb-1">
                        <div className="flex items-start gap-2">
                          {/* Character thumbnail */}
                          <img src={charImg} alt=""
                            style={{width:24,height:24,imageRendering:'pixelated',objectFit:'contain',flexShrink:0,marginTop:2}} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="cinzel text-[11px]" style={{color:agent.color}}>{agent.name}</p>
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:sc[agent.status]||'#4a3820'}} />
                            </div>
                            <p className="cinzel text-[10px] dim">{agent.role} · {room?.name||'Unassigned'}</p>
                            {agent.apiKeyOverride && (
                              <p className="cinzel text-[9px]" style={{color:'#50a060'}}>🔑 Custom API key</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button onClick={()=>setEditAgentId(agent.id)}
                              className="btn-dungeon text-[9px] px-2 py-1">EDIT</button>
                            <button onClick={()=>{
                              if(confirm(`Dismiss "${agent.name}"?`)){
                                deleteAgent(agent.id);
                                addLog({level:'warn',from:'GUILD',message:`${agent.name} dismissed`});
                              }
                            }} className="btn-dungeon danger text-[9px] px-2 py-1">DEL</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Reset */}
              <div className="p-2 border-t border-[#3a2818]">
                <button onClick={()=>{
                  if(confirm('Reset to defaults?\nRestores 4 base rooms + SUPREME LEADER. All quests cleared.'))
                    resetToDefaults?.();
                }} className="btn-dungeon danger w-full text-[10px]">↺ Restore Defaults</button>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}