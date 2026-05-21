'use client';
import { ReactNode } from 'react';
import { useStore } from '@/lib/store';
import type { PanelId } from '@/types';

interface PanelProps {
  id: PanelId; title: string; icon?: string;
  children: ReactNode; headerExtra?: ReactNode;
}

export default function Panel({ id, title, icon='🕯', children, headerExtra }: PanelProps) {
  const { panels, closePanel, toggleMinimize } = useStore();
  const panel = panels.find(p => p.id === id);
  if (!panel?.open) return null;
  return (
    <div className="panel-dungeon flex flex-col w-full" style={{borderBottom:'1px solid #4a3820'}}>
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span style={{fontSize:12}}>{icon}</span>
          <span className="cinzel gold font-semibold tracking-wide" style={{fontSize:11}}>{title}</span>
          {headerExtra}
        </div>
        <div className="flex gap-1">
          <button onClick={()=>toggleMinimize(id)} className="btn-dungeon"
            style={{fontSize:9,padding:'1px 5px'}}>{panel.minimized?'▲':'▼'}</button>
          <button onClick={()=>closePanel(id)} className="btn-dungeon danger"
            style={{fontSize:9,padding:'1px 5px'}}>✕</button>
        </div>
      </div>
      {!panel.minimized && children}
    </div>
  );
}
