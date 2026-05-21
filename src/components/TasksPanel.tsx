'use client';
import { useState } from 'react';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';
import type { Task, TaskOutput } from '@/types';

const SS: Record<string,{c:string;i:string}> = {
  queued:{c:'#4a3820',i:'○'}, running:{c:'#e87830',i:'◉'},
  done:{c:'#50a060',i:'●'},   error:{c:'#c83030',i:'✕'},
};

function OutBlock({ o }: { o: TaskOutput }) {
  if (o.type === 'image') return (
    <div className="mt-1">
      {o.label && <p className="cinzel dim mb-1" style={{fontSize:9}}>{o.label}</p>}
      {o.content
        ? <img src={o.content} alt="artifact" className="w-full" style={{border:'1px solid #4a3820'}}/>
        : <div className="py-3 text-center" style={{background:'#080604',border:'1px dashed #3a2818'}}>
            <p className="cinzel dim" style={{fontSize:11}}>Connect DALL-E to conjure image</p>
          </div>}
    </div>
  );
  return (
    <div className="mt-1 p-2" style={{background:'#080604',border:'1px solid #3a2818'}}>
      {o.label && <p className="cinzel gold mb-1" style={{fontSize:10}}>{o.label}</p>}
      <p className="cinzel parchment leading-snug whitespace-pre-wrap break-all" style={{fontSize:12}}>
        {o.content}
      </p>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [exp, setExp] = useState(false);
  const { rooms } = useStore();
  const room = rooms.find(r => r.id === task.roomId);
  const s = SS[task.status] || SS.queued;
  const elapsed = task.completedAt && task.startedAt
    ? `${((task.completedAt - task.startedAt)/1000).toFixed(1)}s` : null;

  return (
    <div style={{ borderLeft:`2px solid ${room?.color||'#4a3820'}`, background:'#0c0806', marginBottom:2 }}>
      <button className="w-full flex items-start gap-2 p-2 text-left hover:bg-[#140e08] transition-colors"
        onClick={() => setExp(e => !e)}>
        <span className="flex-shrink-0 cinzel mt-0.5" style={{color:s.c,fontSize:13}}>{s.i}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="cinzel font-semibold" style={{color:room?.color||'#e8c84a',fontSize:10}}>
              {room?.name||'?'}
            </span>
            {task.agentName && <span className="cinzel dim" style={{fontSize:10}}>· {task.agentName}</span>}
            {elapsed && <span className="cinzel dim ml-auto" style={{fontSize:10}}>{elapsed}</span>}
          </div>
          <p className="cinzel parchment truncate" style={{fontSize:12}}>{task.goal}</p>
        </div>
        <span className="cinzel dim flex-shrink-0" style={{fontSize:11}}>{exp?'▲':'▼'}</span>
      </button>
      {exp && (
        <div className="px-2 pb-2 border-t border-[#1e1208]">
          <div className="grid grid-cols-3 gap-1 my-1">
            {[{l:'STATUS',v:task.status,c:s.c},{l:'OUTPUTS',v:task.outputs.length||'—',c:'#e8c84a'},{l:'TIME',v:elapsed||'—',c:'#4a3820'}].map(({l,v,c})=>(
              <div key={l} style={{background:'#080604',border:'1px solid #2a1e12'}} className="p-1">
                <p className="cinzel dim" style={{fontSize:8}}>{l}</p>
                <p className="cinzel" style={{fontSize:12,color:String(v)==='—'?'#3a2818':c}}>{String(v)}</p>
              </div>
            ))}
          </div>
          {task.outputs.length > 0
            ? task.outputs.map((o,i) => <OutBlock key={i} o={o}/>)
            : task.status==='error'
              ? <div className="p-2" style={{background:'#1a0808',border:'1px solid #6a202044'}}>
                  <p className="cinzel blood" style={{fontSize:12}}>{task.error||'Unknown error'}</p>
                </div>
              : <div className="p-2 text-center">
                  <p className="cinzel dim" style={{fontSize:12}}>
                    {task.status==='running'?'Agent working...':'Awaiting dispatch...'}
                  </p>
                </div>}
        </div>
      )}
    </div>
  );
}

export default function TasksPanel() {
  const { tasks } = useStore();
  const [filter, setFilter] = useState<'all'|'running'|'done'|'error'>('all');
  const filtered = tasks.filter(t => filter==='all' || t.status===filter);

  return (
    <Panel id="tasks" title="QUEST LOG" icon="📜"
      defaultX={10} defaultY={444} defaultW={400} defaultH={380} minW={300} minH={200}
      headerExtra={
        <span className="cinzel dim ml-2" style={{fontSize:11}}>
          {tasks.filter(t=>t.status==='running').length > 0 &&
            <span className="fire flicker">{tasks.filter(t=>t.status==='running').length} active · </span>}
          {tasks.length} total
        </span>
      }>
      <div className="flex flex-shrink-0 border-b border-[#3a2818]">
        {(['all','running','done','error'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 py-1.5 cinzel hover:bg-[#140e08] transition-colors"
            style={{fontSize:11,color:filter===f?'#e8c84a':'#4a3820',borderBottom:filter===f?'2px solid #e8c84a':'2px solid transparent'}}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="scroll-dungeon flex-1 min-h-0" style={{overflowY:'auto'}}>
        {filtered.length === 0
          ? <div className="flex items-center justify-center h-20">
              <p className="cinzel dim text-center leading-relaxed" style={{fontSize:11}}>
                {tasks.length===0 ? 'No quests yet\nIssue a directive' : 'None in this filter'}
              </p>
            </div>
          : <div className="p-1">{filtered.map(t => <TaskCard key={t.id} task={t}/>)}</div>}
      </div>
    </Panel>
  );
}