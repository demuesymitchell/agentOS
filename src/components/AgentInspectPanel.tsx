'use client';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';

const SC:Record<string,string>={idle:'#4a3820',working:'#e87830',waiting:'#6090c8',error:'#c83030',offline:'#2a1810'};

export default function AgentInspectPanel() {
  const {agents,selectedAgentId,tasks,rooms}=useStore();
  const agent=agents.find(a=>a.id===selectedAgentId);
  return (
    <Panel id="agentInspect" title={agent?agent.name:'AGENT INSPECT'} icon="🧙">
      {!agent ? (
        <div className="flex items-center justify-center p-6">
          <p className="cinzel dim text-center leading-relaxed" style={{fontSize:11}}>Click an agent<br/>in the dungeon</p>
        </div>
      ) : (
        <div className="scroll-dungeon p-3 space-y-3" style={{maxHeight:'calc(100vh - 300px)'}}>
          <div className="flex items-center gap-3 pb-2 border-b border-[#3a2818]">
            <div className="w-8 h-8 flex items-center justify-center"
              style={{background:agent.color+'22',border:`1px solid ${agent.color}44`}}>
              <span className="cinzel font-bold" style={{color:agent.color,fontSize:10}}>{agent.name.slice(0,2)}</span>
            </div>
            <div>
              <p className="cinzel font-semibold" style={{color:agent.color,fontSize:12}}>{agent.name}</p>
              <p className="cinzel dim" style={{fontSize:10}}>{agent.role} · {rooms.find(r=>r.id===agent.roomId)?.name||'—'}</p>
            </div>
          </div>
          {/* Status */}
          <div style={{background:'#080604',border:`1px solid ${SC[agent.status]}44`,padding:'8px 10px'}}>
            <div className="flex items-center gap-2 mb-1">
              <span className="cinzel font-semibold" style={{color:SC[agent.status],fontSize:11}}>
                {agent.status.toUpperCase()}
              </span>
            </div>
            <p className="cinzel leading-snug" style={{color:agent.status==='working'?'#e87830':'#4a3820',fontSize:11}}>
              {agent.currentTask||'null'}
            </p>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-1.5">
            {[{l:'DONE',v:agent.tasksCompleted||'null',c:'#50a060'},{l:'ERRORS',v:agent.tasksErrored||'null',c:'#c83030'}].map(({l,v,c})=>(
              <div key={l} style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-2">
                <p className="cinzel dim mb-0.5" style={{fontSize:9}}>{l}</p>
                <p className="cinzel font-semibold" style={{fontSize:13,color:String(v)==='null'||v===0?'#3a2818':c}}>{String(v)}</p>
              </div>
            ))}
          </div>
          {/* Recent quests */}
          <div>
            <p className="cinzel dim mb-2 uppercase tracking-wider" style={{fontSize:10}}>Recent Quests</p>
            {tasks.filter(t=>t.agentId===agent.id).length===0
              ? <p className="cinzel dim" style={{fontSize:11}}>No quests yet</p>
              : <div className="space-y-1">
                  {tasks.filter(t=>t.agentId===agent.id).slice(0,6).map(t=>(
                    <div key={t.id} style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-1.5">
                      <div className="flex justify-between">
                        <span className="cinzel dim" style={{fontSize:9}}>{new Date(t.createdAt).toLocaleTimeString()}</span>
                        <span className="cinzel" style={{fontSize:10,color:t.status==='done'?'#50a060':t.status==='error'?'#c83030':'#e87830'}}>{t.status}</span>
                      </div>
                      <p className="cinzel parchment truncate" style={{fontSize:11}}>{t.goal}</p>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      )}
    </Panel>
  );
}
