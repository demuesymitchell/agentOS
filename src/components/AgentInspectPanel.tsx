'use client';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';

const SC: Record<string,string> = {
  idle:'#4a3820', working:'#e87830', waiting:'#6090c8', error:'#c83030', offline:'#2a1810'
};

export default function AgentInspectPanel() {
  const { agents, selectedAgentId, tasks, rooms } = useStore();
  const agent = agents.find(a => a.id === selectedAgentId);

  return (
    <Panel id="agentInspect" title={agent ? agent.name : 'AGENT INSPECT'} icon="🧙"
      defaultX={820} defaultY={54} defaultW={320} defaultH={500} minW={260} minH={200}>
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
            <div>
              <p className="cinzel font-semibold" style={{color:agent.color,fontSize:13}}>{agent.name}</p>
              <p className="cinzel dim" style={{fontSize:11}}>{agent.role}</p>
              <p className="cinzel dim" style={{fontSize:10}}>
                {rooms.find(r=>r.id===agent.roomId)?.name||'Unassigned'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div style={{background:'#080604',border:`1px solid ${SC[agent.status]}44`,padding:'10px 12px'}}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:SC[agent.status]}} />
              <span className="cinzel font-semibold" style={{color:SC[agent.status],fontSize:12}}>
                {agent.status.toUpperCase()}
              </span>
            </div>
            <p className="cinzel leading-snug" style={{color:agent.status==='working'?'#e87830':'#4a3820',fontSize:12}}>
              {agent.currentTask || 'Standing by'}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {l:'QUESTS DONE', v:agent.tasksCompleted||0,      c:'#50a060'},
              {l:'ERRORS',      v:agent.tasksErrored||0,        c:'#c83030'},
              {l:'ABILITIES',   v:agent.tools?.length||0,       c:'#e8c84a'},
              {l:'API KEY',     v:agent.apiKeyOverride?'CUSTOM':'GLOBAL', c:'#6090c8'},
            ].map(({l,v,c}) => (
              <div key={l} style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
                <p className="cinzel dim mb-0.5" style={{fontSize:9}}>{l}</p>
                <p className="cinzel font-semibold" style={{fontSize:14,color:v===0?'#3a2818':c}}>{String(v)}</p>
              </div>
            ))}
          </div>

          {/* Purpose */}
          {agent.purpose && (
            <div>
              <p className="cinzel dim mb-1 uppercase tracking-wider" style={{fontSize:10}}>Orders</p>
              <div style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
                <p className="cinzel parchment leading-snug" style={{fontSize:12}}>{agent.purpose}</p>
              </div>
            </div>
          )}

          {/* Abilities */}
          {agent.tools && agent.tools.length > 0 && (
            <div>
              <p className="cinzel dim mb-1 uppercase tracking-wider" style={{fontSize:10}}>Abilities</p>
              <div className="space-y-1">
                {agent.tools.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-2 py-1"
                    style={{background:'#080604',border:'1px solid #2a1e12'}}>
                    <span style={{color:'#50a060',fontSize:10}}>◆</span>
                    <p className="cinzel parchment" style={{fontSize:12}}>{t.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent quests */}
          <div>
            <p className="cinzel dim mb-2 uppercase tracking-wider" style={{fontSize:10}}>Recent Quests</p>
            {tasks.filter(t=>t.agentId===agent.id).length === 0
              ? <p className="cinzel dim" style={{fontSize:11}}>No quests undertaken yet</p>
              : <div className="space-y-1">
                  {tasks.filter(t=>t.agentId===agent.id).slice(0,8).map(t => (
                    <div key={t.id} style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
                      <div className="flex justify-between mb-0.5">
                        <span className="cinzel dim" style={{fontSize:9}}>{new Date(t.createdAt).toLocaleTimeString()}</span>
                        <span className="cinzel" style={{fontSize:11,color:t.status==='done'?'#50a060':t.status==='error'?'#c83030':'#e87830'}}>{t.status}</span>
                      </div>
                      <p className="cinzel parchment truncate" style={{fontSize:12}}>{t.goal}</p>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      )}
    </Panel>
  );
}