'use client';
import { useRef, useEffect, KeyboardEvent } from 'react';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';

const LS: Record<string,{color:string;icon:string}> = {
  info:    {color:'#6090c8',icon:'◆'},
  success: {color:'#50a060',icon:'✓'},
  warn:    {color:'#e87830',icon:'!'},
  error:   {color:'#c83030',icon:'✕'},
  delegate:{color:'#e8c84a',icon:'→'},
  system:  {color:'#4a3820',icon:'·'},
};

export default function TerminalPanel() {
  const {
    goalInput, setGoalInput, isProcessing, submitGoal, logs, agents,
    historyUp, historyDown, cancelTask, tasks, apiKeyStatus,
  } = useStore();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const has = agents.length > 0;
  const runningTasks = tasks.filter(t=>t.status==='running'||t.status==='queued');

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=0; },[logs.length]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key==='Enter' && goalInput.trim() && !isProcessing && has) {
      submitGoal(goalInput.trim());
    } else if (e.key==='ArrowUp') {
      e.preventDefault(); historyUp();
    } else if (e.key==='ArrowDown') {
      e.preventDefault(); historyDown();
    }
  };

  return (
    <Panel id="terminal" title="COMMAND HALL" icon="⚔" minW={300} minH={220}>
      {/* API Key banner */}
      {apiKeyStatus === 'missing' && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
          style={{background:'#1a0e00',borderBottom:'1px solid #e8780044'}}>
          <span style={{color:'#e87800',fontSize:14}}>⚠</span>
          <span className="cinzel" style={{fontSize:11,color:'#e87800'}}>
            No API key — add ANTHROPIC_API_KEY in Railway, or set per-agent in Guild Hall
          </span>
        </div>
      )}
      {apiKeyStatus === 'invalid' && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
          style={{background:'#1a0000',borderBottom:'1px solid #c8303044'}}>
          <span style={{color:'#c83030',fontSize:14}}>✕</span>
          <span className="cinzel" style={{fontSize:11,color:'#c83030'}}>
            Invalid API key — check your key in Guild Hall → Edit agent
          </span>
        </div>
      )}
      {apiKeyStatus === 'valid' && runningTasks.length === 0 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{background:'#0a1a0a',borderBottom:'1px solid #50a06044'}}>
          <span style={{color:'#50a060',fontSize:10}}>●</span>
          <span className="cinzel" style={{fontSize:10,color:'#50a060'}}>API key active</span>
        </div>
      )}

      {/* Active tasks bar */}
      {runningTasks.length > 0 && (
        <div className="flex-shrink-0 px-3 py-1.5"
          style={{background:'#1a1000',borderBottom:'1px solid #e8c84a33'}}>
          <div className="flex items-center justify-between">
            <span className="cinzel fire flicker" style={{fontSize:11}}>
              ⟳ {runningTasks.length} task{runningTasks.length>1?'s':''} running
            </span>
            <button
              onClick={()=>runningTasks.forEach(t=>cancelTask(t.id))}
              className="btn-dungeon danger"
              style={{fontSize:9,padding:'1px 7px'}}
            >✕ Cancel All</button>
          </div>
        </div>
      )}

      {/* Log */}
      <div ref={logRef} className="scroll-dungeon flex-1 p-2 space-y-0.5 min-h-0"
        style={{background:'#080604',overflowY:'auto'}}>
        {logs.slice(0,100).map(entry=>{
          const s=LS[entry.level]||LS.info;
          return (
            <div key={entry.id} className="flex gap-2 items-baseline log-entry cinzel leading-snug"
              style={{fontSize:12}}>
              <span className="dim flex-shrink-0" style={{fontSize:10}}>
                {new Date(entry.ts).toLocaleTimeString('en',{hour12:false})}
              </span>
              <span className="flex-shrink-0" style={{color:s.color}}>{s.icon}</span>
              {entry.to
                ? <span className="flex-shrink-0" style={{color:s.color+'aa',fontSize:10}}>{entry.from}→{entry.to}</span>
                : <span className="flex-shrink-0 dim" style={{fontSize:10}}>{entry.from}</span>}
              <span className="parchment break-all">{entry.message}</span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-2 border-t border-[#3a2818]">
        {!has && (
          <div className="mb-2 p-1.5" style={{background:'#1a0808',border:'1px solid #6a202044'}}>
            <span className="cinzel blood" style={{fontSize:11}}>
              No agents — open Guild Hall to recruit
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 px-2 py-1.5"
          style={{background:'#080604',border:'1px solid #3a2818'}}>
          <span className="gold flex-shrink-0 cinzel" style={{fontSize:16}}>
            {isProcessing ? '⟳' : '›'}
          </span>
          <input
            ref={inputRef}
            value={goalInput}
            onChange={e=>setGoalInput(e.target.value)}
            onKeyDown={onKey}
            disabled={isProcessing||!has}
            className="input-dungeon border-0 bg-transparent flex-1 min-w-0"
            style={{fontSize:13}}
            placeholder={
              !has ? 'recruit agents first...'
              : isProcessing ? 'dispatching...'
              : 'issue directive... (↑↓ for history)'
            }
          />
          {isProcessing ? (
            <button
              onClick={()=>runningTasks.forEach(t=>cancelTask(t.id))}
              className="btn-dungeon danger flex-shrink-0"
              style={{fontSize:10}}
            >STOP</button>
          ) : (
            <button
              onClick={()=>goalInput.trim()&&has&&submitGoal(goalInput.trim())}
              disabled={!goalInput.trim()||!has}
              className="btn-dungeon primary flex-shrink-0"
              style={{fontSize:10}}
            >SEND</button>
          )}
        </div>
        <p className="cinzel dim mt-1 px-1" style={{fontSize:10}}>
          Enter to send · ↑↓ history · Supreme Leader delegates
        </p>
      </div>
    </Panel>
  );
}