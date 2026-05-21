'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import type { PanelId } from '@/types';

const PANEL_DEFS: { id: PanelId; label: string; icon: string }[] = [
  { id:'terminal',     label:'Command',   icon:'⚔' },
  { id:'tasks',        label:'Quests',    icon:'📜' },
  { id:'media',        label:'Artifacts', icon:'🎨' },
  { id:'agentInspect', label:'Agent',     icon:'🧙' },
  { id:'admin',        label:'Guild',     icon:'⚙' },
];

export default function Taskbar() {
  const { panels, openPanel, closePanel, agents, rooms, tasks, isProcessing } = useStore();
  const [clock, setClock] = useState('');
  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString('en',{hour12:false})), 1000);
    return () => clearInterval(id);
  }, []);

  const active = agents.filter(a => a.status==='working').length;
  const done   = tasks.filter(t => t.status==='done').length;

  return (
    <div className="taskbar fixed top-0 left-0 right-0 h-11 flex items-stretch z-50">

      {/* Logo */}
      <div className="flex items-center gap-2 px-4 border-r border-[#4a3820]">
        <span className="text-base">🏰</span>
        <span className="cinzel-deco gold-glow font-bold" style={{fontSize:13}}>Agent OS</span>
        <span className="cinzel dim ml-1" style={{fontSize:9}}>v0.3</span>
      </div>

      {/* Panel toggles */}
      <div className="flex items-stretch border-r border-[#4a3820]">
        {PANEL_DEFS.map(def => {
          const isOpen = panels.find(p => p.id===def.id)?.open;
          return (
            <button key={def.id}
              onClick={() => isOpen ? closePanel(def.id) : openPanel(def.id)}
              className="h-full px-3 flex flex-col items-center justify-center transition-colors hover:bg-[#1e1208]"
              style={{ borderBottom: isOpen ? '2px solid #e8c84a' : '2px solid transparent' }}
              title={`${isOpen?'Close':'Open'} ${def.label}`}
            >
              <span style={{fontSize:13}}>{def.icon}</span>
              <span className="cinzel" style={{fontSize:7, color:isOpen?'#e8c84a':'#4a3820'}}>
                {def.label.toUpperCase().slice(0,5)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-4 border-r border-[#4a3820]">
        {[
          {l:'Rooms',  v:rooms.length,          c:'#e8c84a'},
          {l:'Agents', v:agents.length||'—',    c:agents.length>0?'#50a060':'#3a2818'},
          {l:'Active', v:active||'—',           c:active>0?'#e87830':'#3a2818'},
          {l:'Done',   v:done||'—',             c:done>0?'#50a060':'#3a2818'},
        ].map(({l,v,c}) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className="cinzel dim" style={{fontSize:10}}>{l}</span>
            <span className="cinzel font-semibold" style={{fontSize:12,color:c}}>{v}</span>
          </div>
        ))}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 px-3 border-r border-[#4a3820]">
          <span className="flicker" style={{fontSize:12}}>⚔</span>
          <span className="cinzel fire font-semibold" style={{fontSize:10}}>DISPATCHING</span>
        </div>
      )}

      {/* Tip */}
      <div className="flex items-center px-3 border-r border-[#4a3820]">
        <span className="cinzel dim" style={{fontSize:9}}>Drag panel headers · Resize corners</span>
      </div>

      <div className="ml-auto flex items-center px-4 border-l border-[#4a3820]">
        <span className="cinzel dim" style={{fontSize:11}}>{clock}</span>
      </div>
    </div>
  );
}