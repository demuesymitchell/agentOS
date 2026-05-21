'use client';
import { useRef, useEffect, KeyboardEvent } from 'react';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';

const LS: Record<string,{color:string;icon:string}> = {
  info:{color:'#6090c8',icon:'◆'},success:{color:'#50a060',icon:'✓'},
  warn:{color:'#e87830',icon:'!'},error:{color:'#c83030',icon:'✕'},
  delegate:{color:'#e8c84a',icon:'→'},system:{color:'#4a3820',icon:'·'},
};

export default function TerminalPanel() {
  const {goalInput,setGoalInput,isProcessing,submitGoal,logs,agents}=useStore();
  const logRef=useRef<HTMLDivElement>(null);
  const has=agents.length>0;
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=0;},[logs.length]);
  const onKey=(e:KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==='Enter'&&goalInput.trim()&&!isProcessing&&has) submitGoal(goalInput.trim());
  };
  return (
    <Panel id="terminal" title="COMMAND HALL" icon="⚔">
      <div ref={logRef} className="scroll-dungeon p-2 space-y-0.5"
        style={{background:'#080604',maxHeight:200,overflowY:'auto'}}>
        {logs.slice(0,80).map(entry=>{
          const s=LS[entry.level]||LS.info;
          return (
            <div key={entry.id} className="flex gap-2 items-baseline log-entry cinzel leading-snug" style={{fontSize:11}}>
              <span className="dim flex-shrink-0" style={{fontSize:10}}>{new Date(entry.ts).toLocaleTimeString('en',{hour12:false})}</span>
              <span className="flex-shrink-0" style={{color:s.color}}>{s.icon}</span>
              {entry.to
                ? <span className="flex-shrink-0" style={{color:s.color+'aa',fontSize:10}}>{entry.from}→{entry.to}</span>
                : <span className="flex-shrink-0 dim" style={{fontSize:10}}>{entry.from}</span>}
              <span className="parchment break-all">{entry.message}</span>
            </div>
          );
        })}
      </div>
      <div className="flex-shrink-0 p-2 border-t border-[#3a2818]">
        {!has&&<div className="mb-2 p-1.5" style={{background:'#1a0808',border:'1px solid #6a202044'}}>
          <span className="cinzel blood" style={{fontSize:11}}>No agents — open Guild Hall to recruit</span>
        </div>}
        <div className="flex items-center gap-2 px-2 py-1.5"
          style={{background:'#080604',border:'1px solid #3a2818'}}>
          <span className="gold flex-shrink-0 cinzel" style={{fontSize:14}}>{isProcessing?'⟳':'›'}</span>
          <input value={goalInput} onChange={e=>setGoalInput(e.target.value)} onKeyDown={onKey}
            disabled={isProcessing||!has} className="input-dungeon border-0 bg-transparent flex-1 min-w-0"
            style={{fontSize:13}}
            placeholder={!has?'recruit agents first...':isProcessing?'dispatching orders...':'issue directive to Supreme Leader...'} />
          <button onClick={()=>goalInput.trim()&&!isProcessing&&has&&submitGoal(goalInput.trim())}
            disabled={isProcessing||!goalInput.trim()||!has} className="btn-dungeon primary flex-shrink-0 text-[10px]">
            SEND
          </button>
        </div>
        <p className="cinzel dim mt-1 px-1" style={{fontSize:10}}>
          Press Enter · Supreme Leader delegates to departments
        </p>
      </div>
    </Panel>
  );
}
