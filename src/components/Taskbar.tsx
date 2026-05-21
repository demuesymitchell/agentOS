'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import type { PanelId } from '@/types';

const PANEL_DEFS: { id: PanelId; label: string; icon: string }[] = [
  { id:'terminal',     label:'COMMAND',   icon:'⚔' },
  { id:'tasks',        label:'QUESTS',    icon:'📜' },
  { id:'media',        label:'ARTIFACTS', icon:'🎨' },
  { id:'agentInspect', label:'AGENT',     icon:'🧙' },
  { id:'admin',        label:'GUILD',     icon:'⚙' },
];

export default function Taskbar() {
  const { panels, openPanel, closePanel, agents, rooms, tasks, isProcessing } = useStore();
  const [clock, setClock] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString('en',{hour12:false})), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const active = agents.filter(a=>a.status==='working').length;
  const done   = tasks.filter(t=>t.status==='done').length;

  return (
    <div className="taskbar absolute top-0 left-0 right-0 h-11 flex items-stretch z-50">

      {/* Logo */}
      <div className="flex items-center gap-2 px-4 border-r border-[#4a3820]">
        <span className="text-sm">🏰</span>
        <span className="cinzel-deco gold-glow font-bold" style={{fontSize:13}}>Agent OS</span>
        <span className="cinzel dim ml-1" style={{fontSize:9}}>v0.3</span>
      </div>

      {/* Panels menu */}
      <div ref={menuRef} className="relative flex items-center">
        <button onClick={()=>setShowMenu(v=>!v)}
          className="h-full px-4 cinzel parchment hover:gold transition-colors border-r border-[#4a3820]"
          style={{fontSize:11}}>
          Panels {showMenu?'▲':'▼'}
        </button>
        {showMenu && (
          <div className="absolute top-full left-0 w-44 z-50 py-1 panel-dungeon">
            {PANEL_DEFS.map(def => {
              const isOpen = panels.find(p=>p.id===def.id)?.open;
              return (
                <button key={def.id} onClick={()=>{isOpen?closePanel(def.id):openPanel(def.id);setShowMenu(false);}}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#1e1208] transition-colors">
                  <div className="flex items-center gap-2">
                    <span style={{fontSize:12}}>{def.icon}</span>
                    <span className="cinzel" style={{fontSize:10,color:isOpen?'#e8c84a':'#6a5840'}}>{def.label}</span>
                  </div>
                  <span className="cinzel dim" style={{fontSize:9}}>{isOpen?'OPEN':'—'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick panel tabs */}
      <div className="flex items-stretch border-r border-[#4a3820]">
        {PANEL_DEFS.map(def => {
          const isOpen = panels.find(p=>p.id===def.id)?.open;
          return (
            <button key={def.id} onClick={()=>isOpen?closePanel(def.id):openPanel(def.id)}
              className="h-full px-3 flex flex-col items-center justify-center transition-colors hover:bg-[#1e1208]"
              style={{borderBottom:isOpen?'2px solid #e8c84a':'2px solid transparent'}} title={def.label}>
              <span style={{fontSize:13}}>{def.icon}</span>
              <span className="cinzel" style={{fontSize:7,color:isOpen?'#e8c84a':'#4a3820'}}>{def.label.slice(0,4)}</span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-4 border-r border-[#4a3820]">
        {[
          {l:'Rooms',  v:rooms.length,                c:'#e8c84a'},
          {l:'Agents', v:agents.length||'null',       c:agents.length>0?'#50a060':'#3a2818'},
          {l:'Active', v:active||'null',              c:active>0?'#e87830':'#3a2818'},
          {l:'Done',   v:done||'null',                c:done>0?'#50a060':'#3a2818'},
        ].map(({l,v,c})=>(
          <div key={l} className="flex items-center gap-1.5">
            <span className="cinzel dim" style={{fontSize:10}}>{l}</span>
            <span className="cinzel font-semibold" style={{fontSize:11,color:c}}>{v}</span>
          </div>
        ))}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 px-3 border-r border-[#4a3820]">
          <span className="flicker" style={{fontSize:12}}>⚔</span>
          <span className="cinzel fire font-semibold" style={{fontSize:10}}>DISPATCHING</span>
        </div>
      )}

      <div className="ml-auto flex items-center px-4 border-l border-[#4a3820]">
        <span className="cinzel dim" style={{fontSize:11}}>{clock}</span>
      </div>
    </div>
  );
}
