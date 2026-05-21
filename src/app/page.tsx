'use client';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Taskbar           from '@/components/Taskbar';
import TerminalPanel     from '@/components/TerminalPanel';
import TasksPanel        from '@/components/TasksPanel';
import MediaPanel        from '@/components/MediaPanel';
import AdminPanel        from '@/components/AdminPanel';
import AgentInspectPanel from '@/components/AgentInspectPanel';
import { useStore }      from '@/lib/store';

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center" style={{top:44,background:'#0a0808'}}>
      <div className="text-center space-y-3">
        <p className="cinzel-deco text-xl gold-glow">AgentOS</p>
        <p className="cinzel text-sm dim">Summoning the dungeon...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const hydrate = useStore(s => s.hydrate);
  useEffect(() => { hydrate(); }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{background:'#0a0808'}}>

      {/* Game world fills everything below taskbar */}
      <div className="absolute inset-0" style={{top:44}}>
        <GameCanvas />
      </div>

      {/* Taskbar */}
      <Taskbar />

      {/* LEFT COLUMN — docked, stacked */}
      <div className="absolute left-0 flex flex-col z-20"
        style={{top:44, bottom:0, width:320, pointerEvents:'none'}}>
        <div style={{pointerEvents:'auto', flex:'0 0 auto'}}>
          <TerminalPanel />
        </div>
        <div style={{pointerEvents:'auto', flex:'1 1 auto', minHeight:0}}>
          <TasksPanel />
        </div>
      </div>

      {/* RIGHT COLUMN — docked, stacked */}
      <div className="absolute right-0 flex flex-col z-20"
        style={{top:44, bottom:0, width:320, pointerEvents:'none'}}>
        <div style={{pointerEvents:'auto', flex:'0 1 auto', maxHeight:'65%'}}>
          <AdminPanel />
        </div>
        <div style={{pointerEvents:'auto', flex:'0 1 auto', maxHeight:'35%'}}>
          <AgentInspectPanel />
        </div>
      </div>

      {/* BOTTOM CENTER — Media panel */}
      <div className="absolute z-20" style={{bottom:0, left:'50%', transform:'translateX(-50%)', width:340}}>
        <MediaPanel />
      </div>

    </div>
  );
}
