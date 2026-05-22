'use client';
import { useState } from 'react';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';

const SC: Record<string,string> = {
  idle:'#4a3820',working:'#e87830',waiting:'#6090c8',error:'#c83030',offline:'#2a1810'
};

export default function AgentInspectPanel() {
  const {agents, selectedAgentId, tasks, rooms, updateAgent} = useStore();
  const agent = agents.find(a=>a.id===selectedAgentId);
  const [editingKey, setEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  return (
    <Panel id="agentInspect" title={agent?agent.name:'AGENT INSPECT'} icon="🧙" minW={260} minH={200}>
      {!agent ? (
        <div className="flex items-center justify-center p-8">
          <p className="cinzel dim text-center leading-relaxed" style={{fontSize:12}}>
            Click an agent<br/>in the dungeon
          </p>
        </div>
      ) : (
        <div className="scroll-dungeon flex-1 p-3 space-y-3 min-h-0" style={{overflowY:'auto'}}>

          {/* Identity */}
          <div className="flex items-center gap-3 pb-3 border-b border-[#3a2818]">
            <img
              src={`/assets/tiles/frames/${agent.charModel||'knight_m'}_idle_anim_f0.png`}
              alt="" style={{width:40,height:40,imageRendering:'pixelated',objectFit:'contain',flexShrink:0}}
            />
            <div className="flex-1 min-w-0">
              <p className="cinzel font-semibold" style={{color:agent.color,fontSize:13}}>{agent.name}</p>
              <p className="cinzel dim" style={{fontSize:11}}>{agent.role}</p>
              <p className="cinzel dim" style={{fontSize:10}}>
                {rooms.find(r=>r.id===agent.roomId)?.name||'Unassigned'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div style={{background:'#080604',border:`1px solid ${SC[agent.status]}44`,padding:'8px 10px'}}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:SC[agent.status]}}/>
              <span className="cinzel font-semibold" style={{color:SC[agent.status],fontSize:11}}>
                {agent.status.toUpperCase()}
                {agent.status==='working'&&<span className="flicker ml-1">🔥</span>}
              </span>
            </div>
            <p className="cinzel" style={{
              color:agent.status==='working'?'#e87830':'#4a3820',fontSize:11,lineHeight:1.5
            }}>
              {agent.currentTask||'Standing by'}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              {l:'DONE',   v:agent.tasksCompleted, c:'#50a060'},
              {l:'ERRORS', v:agent.tasksErrored,   c:'#c83030'},
            ].map(({l,v,c})=>(
              <div key={l} style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
                <p className="cinzel dim mb-0.5" style={{fontSize:9}}>{l}</p>
                <p className="cinzel font-semibold" style={{fontSize:16,color:v===0?'#3a2818':c}}>{v}</p>
              </div>
            ))}
          </div>

          {/* API Key */}
          <div style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
            <div className="flex items-center justify-between mb-1">
              <p className="cinzel dim" style={{fontSize:10}}>API KEY</p>
              <div className="flex gap-1">
                <button onClick={()=>setShowKey(v=>!v)} className="cinzel dim" style={{fontSize:10}}>
                  {showKey?'hide':'show'}
                </button>
                <button onClick={()=>{setEditingKey(true);setNewKey(agent.apiKeyOverride||'');}}
                  className="cinzel" style={{fontSize:10,color:'#e8c84a88'}}>edit</button>
              </div>
            </div>
            {editingKey ? (
              <div className="space-y-1">
                <input
                  type={showKey?'text':'password'}
                  value={newKey}
                  onChange={e=>setNewKey(e.target.value)}
                  placeholder="sk-ant-... (blank = global key)"
                  className="input-dungeon w-full"
                  style={{fontSize:11}}
                />
                <div className="flex gap-1">
                  <button onClick={()=>{
                    updateAgent(agent.id,{apiKeyOverride:newKey.trim()||null});
                    setEditingKey(false);
                  }} className="btn-dungeon primary flex-1" style={{fontSize:9}}>SAVE</button>
                  <button onClick={()=>setEditingKey(false)} className="btn-dungeon" style={{fontSize:9}}>
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{background:agent.apiKeyOverride?'#50a060':'#4a3820',flexShrink:0}}/>
                <p className="cinzel" style={{fontSize:11,color:agent.apiKeyOverride?'#50a060':'#4a3820'}}>
                  {agent.apiKeyOverride
                    ? (showKey ? agent.apiKeyOverride : '••••••••' + agent.apiKeyOverride.slice(-4))
                    : 'Using global key'}
                </p>
              </div>
            )}
          </div>

          {/* Purpose */}
          {agent.purpose && (
            <div>
              <p className="cinzel dim mb-1 uppercase tracking-wider" style={{fontSize:10}}>Orders</p>
              <div style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
                <p className="cinzel parchment leading-relaxed" style={{fontSize:11}}>{agent.purpose}</p>
              </div>
            </div>
          )}

          {/* Abilities */}
          {agent.tools?.length>0 && (
            <div>
              <p className="cinzel dim mb-1 uppercase tracking-wider" style={{fontSize:10}}>Abilities</p>
              <div className="space-y-1">
                {agent.tools.map(t=>(
                  <div key={t.id} className="flex items-center gap-2 px-2 py-1"
                    style={{background:'#080604',border:'1px solid #2a1e12'}}>
                    <span style={{color:t.enabled?'#50a060':'#3a2818',fontSize:10}}>◆</span>
                    <span className="cinzel parchment" style={{fontSize:11}}>{t.name}</span>
                    {!t.enabled&&<span className="cinzel dim ml-auto" style={{fontSize:9}}>disabled</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quest history */}
          <div>
            <p className="cinzel dim mb-2 uppercase tracking-wider" style={{fontSize:10}}>
              Quest History ({tasks.filter(t=>t.agentId===agent.id).length})
            </p>
            {tasks.filter(t=>t.agentId===agent.id).length===0 ? (
              <p className="cinzel dim" style={{fontSize:11}}>No quests yet</p>
            ) : (
              <div className="space-y-1">
                {tasks.filter(t=>t.agentId===agent.id).slice(0,10).map(t=>(
                  <div key={t.id} style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="cinzel dim" style={{fontSize:9}}>
                        {new Date(t.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="cinzel" style={{fontSize:10,color:
                        t.status==='done'?'#50a060':t.status==='error'?'#c83030':'#e87830'}}>
                        {t.status}
                      </span>
                    </div>
                    <p className="cinzel parchment" style={{fontSize:11,lineHeight:1.4}}>{t.goal}</p>
                    {t.outputs.length>0&&(
                      <p className="cinzel dim mt-0.5" style={{fontSize:9}}>
                        {t.outputs.length} output{t.outputs.length>1?'s':''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}