'use client';
import { useState } from 'react';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';
import type { Task, TaskOutput } from '@/types';
import dynamic from 'next/dynamic';

const XlsxDownload = dynamic(() => import('./XlsxDownload'), { ssr: false });

const SS: Record<string,{c:string;i:string;label:string}> = {
  queued: {c:'#4a3820',i:'○',label:'QUEUED'},
  running:{c:'#e87830',i:'◉',label:'RUNNING'},
  done:   {c:'#50a060',i:'●',label:'DONE'},
  error:  {c:'#c83030',i:'✕',label:'ERROR'},
};

function OutputBlock({o, agentApiKey}:{o:TaskOutput, agentApiKey?:string|null}) {
  const [expanded, setExpanded] = useState(false);

  // File output — xlsx generator (explicit file type)
  if (o.type === 'file') {
    try {
      const parsed = JSON.parse(o.content);
      if (parsed.type === 'xlsx_spec') {
        return (
          <div className="mt-2" style={{background:'#080604',border:'1px solid #3a2818',borderRadius:4}}>
            <div className="px-2 py-1.5 border-b border-[#2a1e12]" style={{background:'#0c0806'}}>
              <span className="cinzel gold" style={{fontSize:10}}>{o.label||'File Output'}</span>
            </div>
            <div className="p-2">
              <XlsxDownload spec={parsed.spec} apiKey={agentApiKey}/>
            </div>
          </div>
        );
      }
    } catch {}
  }

  // Also detect xlsx spec stored as text (from older tasks or label match)
  const isXlsxSpec = o.label?.includes('Generate .xlsx') || o.label?.includes('⬇️');
  if (isXlsxSpec) {
    try {
      const parsed = JSON.parse(o.content);
      if (parsed.type === 'xlsx_spec') {
        return (
          <div className="mt-2" style={{background:'#080604',border:'1px solid #3a2818',borderRadius:4}}>
            <div className="px-2 py-1.5 border-b border-[#2a1e12]" style={{background:'#0c0806'}}>
              <span className="cinzel gold" style={{fontSize:10}}>{o.label}</span>
            </div>
            <div className="p-2">
              <XlsxDownload spec={parsed.spec} apiKey={agentApiKey}/>
            </div>
          </div>
        );
      }
    } catch {}
    // Fallback — treat content directly as spec
    return (
      <div className="mt-2" style={{background:'#080604',border:'1px solid #3a2818',borderRadius:4}}>
        <div className="px-2 py-1.5 border-b border-[#2a1e12]" style={{background:'#0c0806'}}>
          <span className="cinzel gold" style={{fontSize:10}}>{o.label}</span>
        </div>
        <div className="p-2">
          <XlsxDownload spec={o.content} apiKey={agentApiKey}/>
        </div>
      </div>
    );
  }
  if (o.type==='image') return (
    <div className="mt-2 rounded overflow-hidden" style={{border:'1px solid #4a3820'}}>
      {o.label && <p className="cinzel gold px-2 py-1" style={{fontSize:10,background:'#120e06'}}>{o.label}</p>}
      {o.content
        ? <img src={o.content} alt="output" className="w-full" style={{display:'block'}}/>
        : <div className="py-4 text-center" style={{background:'#0c0806'}}>
            <p className="cinzel dim" style={{fontSize:11}}>🎨 Image output — connect DALL-E to generate</p>
          </div>}
    </div>
  );
  const preview = o.content?.slice(0,120);
  const hasMore = (o.content?.length||0) > 120;
  return (
    <div className="mt-2" style={{background:'#080604',border:'1px solid #3a2818'}}>
      {o.label && (
        <div className="px-2 py-1 border-b border-[#2a1e12]"
          style={{background:'#0c0806'}}>
          <span className="cinzel gold" style={{fontSize:10}}>{o.label}</span>
        </div>
      )}
      <div className="p-2">
        <p className="cinzel parchment leading-relaxed whitespace-pre-wrap break-all"
          style={{fontSize:12}}>
          {expanded ? o.content : preview}{hasMore && !expanded ? '…' : ''}
        </p>
        {hasMore && (
          <button onClick={()=>setExpanded(v=>!v)}
            className="cinzel mt-1" style={{fontSize:10,color:'#e8c84a88'}}>
            {expanded ? 'Show less ▲' : `Show more (${o.content?.length} chars) ▼`}
          </button>
        )}
      </div>
    </div>
  );
}

function TaskCard({task}:{task:Task}) {
  const [exp, setExp] = useState(false);
  const {rooms, cancelTask, retryTask, setSelectedTask, agents} = useStore();
  const room = rooms.find(r=>r.id===task.roomId);
  const s = SS[task.status]||SS.queued;
  const elapsed = task.completedAt&&task.startedAt
    ? `${((task.completedAt-task.startedAt)/1000).toFixed(1)}s` : null;
  const canCancel = task.status==='running'||task.status==='queued';
  const canRetry  = task.status==='error';

  return (
    <div style={{borderLeft:`2px solid ${room?.color||'#4a3820'}`,background:'#0c0806',marginBottom:3}}>
      <button className="w-full flex items-start gap-2 p-2 text-left hover:bg-[#140e08] transition-colors"
        onClick={()=>{ setExp(v=>!v); setSelectedTask(task.id); }}>
        <span className="flex-shrink-0 mt-0.5 cinzel" style={{color:s.c,fontSize:13}}>
          {s.i}
          {task.status==='running'&&<span className="flicker ml-1">🔥</span>}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="cinzel font-semibold" style={{color:room?.color||'#e8c84a',fontSize:10}}>
              {room?.name||'?'}
            </span>
            {task.agentName && (
              <span className="cinzel dim" style={{fontSize:10}}>· {task.agentName}</span>
            )}
            <span className="cinzel ml-auto" style={{fontSize:9,color:s.c}}>{s.label}</span>
            {elapsed && <span className="cinzel dim" style={{fontSize:9}}>{elapsed}</span>}
          </div>
          <p className="cinzel parchment" style={{fontSize:12,lineHeight:1.4}}>
            {task.goal.length>80 ? task.goal.slice(0,80)+'…' : task.goal}
          </p>
          {task.parentGoal && task.parentGoal!==task.goal && (
            <p className="cinzel dim truncate" style={{fontSize:10}}>↳ {task.parentGoal}</p>
          )}
        </div>
        <span className="cinzel dim flex-shrink-0 ml-1" style={{fontSize:11}}>{exp?'▲':'▼'}</span>
      </button>

      {exp && (
        <div className="px-2 pb-2 border-t border-[#1e1208]">
          {/* Action buttons */}
          <div className="flex gap-2 mt-2 mb-2">
            {canCancel && (
              <button onClick={()=>cancelTask(task.id)}
                className="btn-dungeon danger flex-1" style={{fontSize:9}}>
                ✕ Cancel
              </button>
            )}
            {canRetry && (
              <button onClick={()=>retryTask(task.id)}
                className="btn-dungeon primary flex-1" style={{fontSize:9}}>
                ↺ Retry
              </button>
            )}
          </div>

          {/* Xlsx download — show if any output looks like a spreadsheet spec */}
          {task.status==='done' && task.outputs.some(o=>
            o.label?.includes('Spreadsheet') || o.label?.includes('xlsx') || o.label?.includes('⬇️')
          ) && (
            <div className="mt-2 p-2" style={{background:'#080604',border:'1px solid #e8c84a44',borderRadius:4}}>
              <p className="cinzel gold mb-2" style={{fontSize:10}}>📊 Generate Downloadable File</p>
              <XlsxDownload
                spec={task.outputs.find(o=>o.label?.includes('Specification'))?.content || task.outputs[0]?.content || ''}
                apiKey={agents.find(a=>a.id===task.agentId)?.apiKeyOverride}
              />
            </div>
          )}

          {/* Outputs */}
          {task.outputs.length > 0 ? (
            <div>
              <p className="cinzel dim mb-1" style={{fontSize:9}}>
                {task.outputs.length} output{task.outputs.length>1?'s':''}
              </p>
              {task.outputs.map((o,i)=>{
                const agent = agents.find(a=>a.id===task.agentId);
                return <OutputBlock key={i} o={o} agentApiKey={agent?.apiKeyOverride}/>;
              })}
            </div>
          ) : task.status==='error' ? (
            <div className="p-2 mt-1" style={{background:'#1a0808',border:'1px solid #6a202044'}}>
              <p className="cinzel" style={{fontSize:10,color:'#c83030'}}>
                {task.error||'Unknown error'}
              </p>
            </div>
          ) : (
            <div className="p-2 text-center mt-1">
              <p className="cinzel dim" style={{fontSize:12}}>
                {task.status==='running'?'⟳ Agent working...':'Awaiting dispatch...'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TasksPanel() {
  const {tasks} = useStore();
  const [filter, setFilter] = useState<'all'|'running'|'done'|'error'>('all');
  const filtered = tasks.filter(t=>filter==='all'||t.status===filter);
  const counts = {
    all:tasks.length,
    running:tasks.filter(t=>t.status==='running'||t.status==='queued').length,
    done:tasks.filter(t=>t.status==='done').length,
    error:tasks.filter(t=>t.status==='error').length,
  };

  return (
    <Panel id="tasks" title="QUEST LOG" icon="📜" minW={300} minH={200}
      headerExtra={
        <span className="cinzel dim ml-2" style={{fontSize:11}}>
          {counts.running>0 && <span className="fire flicker">{counts.running} active · </span>}
          {tasks.length} total
        </span>
      }>
      <div className="flex flex-shrink-0 border-b border-[#3a2818]">
        {(['all','running','done','error'] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className="flex-1 py-1.5 cinzel hover:bg-[#140e08] transition-colors relative"
            style={{
              fontSize:11,color:filter===f?'#e8c84a':'#4a3820',
              borderBottom:filter===f?'2px solid #e8c84a':'2px solid transparent',
            }}>
            {f.toUpperCase()}
            {counts[f]>0 && (
              <span className="ml-1 cinzel" style={{fontSize:9,color:f==='error'?'#c83030':f==='running'?'#e87830':'#4a3820'}}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="scroll-dungeon flex-1 min-h-0" style={{overflowY:'auto'}}>
        {filtered.length===0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="cinzel dim text-center" style={{fontSize:11}}>
              {tasks.length===0?'No quests yet\nIssue a directive':'Nothing in this filter'}
            </p>
          </div>
        ) : (
          <div className="p-1">{filtered.map(t=><TaskCard key={t.id} task={t}/>)}</div>
        )}
      </div>
    </Panel>
  );
}