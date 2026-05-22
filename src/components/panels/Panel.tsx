'use client';
import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { PanelId } from '@/types';

// Default docked positions
export const PANEL_DEFAULTS: Record<string, {
  edge: 'left'|'right'|'bottom'; order: number; w: number; h: number;
}> = {
  terminal:     { edge:'left',   order:0, w:340, h:360 },
  tasks:        { edge:'left',   order:1, w:340, h:340 },
  admin:        { edge:'right',  order:0, w:340, h:440 },
  agentInspect: { edge:'right',  order:1, w:340, h:300 },
  media:        { edge:'bottom', order:0, w:420, h:280 },
};

interface PosState { x:number; y:number; w:number; h:number; locked:boolean; }

function computeDefault(id: string): PosState {
  if (typeof window === 'undefined') return { x:0, y:44, w:340, h:400, locked:false };
  const d = PANEL_DEFAULTS[id] || { edge:'left', order:0, w:340, h:400 };
  const W = window.innerWidth, H = window.innerHeight;
  const TASKBAR = 44;
  let x = 0, y = TASKBAR;
  if (d.edge === 'left')  { x = 0;       y = TASKBAR + d.order * (d.h + 4); }
  if (d.edge === 'right') { x = W - d.w; y = TASKBAR + d.order * (d.h + 4); }
  if (d.edge === 'bottom'){ x = W/2 - d.w/2; y = H - d.h; }
  return { x, y, w:d.w, h:d.h, locked:false };
}

function loadPos(id: string): PosState {
  if (typeof window === 'undefined') return computeDefault(id);
  try {
    const raw = localStorage.getItem(`agentOS_panel_${id}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return computeDefault(id);
}

function savePos(id: string, p: PosState) {
  try { localStorage.setItem(`agentOS_panel_${id}`, JSON.stringify(p)); } catch {}
}

interface PanelProps {
  id: PanelId;
  title: string;
  icon?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
  minW?: number;
  minH?: number;
}

export default function Panel({
  id, title, icon='🕯', children, headerExtra, minW=260, minH=160,
}: PanelProps) {
  const { panels, closePanel, toggleMinimize } = useStore();
  const panel = panels.find(p => p.id === id);

  // Use a ref to always hold the latest position — avoids stale closure on drag
  const [pos, setPos] = useState<PosState>(() => loadPos(id));
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { savePos(id, pos); }, [id, pos]);

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (posRef.current.locked) return;
    if ((e.target as HTMLElement).closest('button')) return; // don't drag on button clicks
    e.preventDefault();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPanelX = posRef.current.x;
    const startPanelY = posRef.current.y;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      const W = window.innerWidth, H = window.innerHeight;
      const { w, h } = posRef.current;
      setPos(s => ({
        ...s,
        x: Math.max(0, Math.min(W - w, startPanelX + dx)),
        y: Math.max(44, Math.min(H - 80, startPanelY + dy)),
      }));
    };

    const onUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []); // empty deps — reads from refs only

  // ── Resize ────────────────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e: React.MouseEvent, dir: string) => {
    e.preventDefault(); e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startW = posRef.current.w;
    const startH = posRef.current.h;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      setPos(s => ({
        ...s,
        w: dir.includes('e') ? Math.max(minW, startW + dx) : s.w,
        h: dir.includes('s') ? Math.max(minH, startH + dy) : s.h,
      }));
    };

    const cursors: Record<string,string> = { e:'ew-resize', s:'s-resize', se:'nwse-resize' };
    const onUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    document.body.style.cursor = cursors[dir] || 'nwse-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [minW, minH]);

  const resetToDefault = () => {
    const d = computeDefault(id);
    setPos(d);
    savePos(id, d);
  };

  if (!panel?.open) return null;

  return (
    <div
      className="panel-dungeon flex flex-col"
      style={{
        position: 'fixed',
        left:   pos.x,
        top:    pos.y,
        width:  pos.w,
        height: panel.minimized ? 'auto' : pos.h,
        zIndex: 30,
        userSelect: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}
    >
      {/* Header — drag handle */}
      <div
        className="panel-header flex-shrink-0"
        style={{ cursor: pos.locked ? 'default' : 'grab' }}
        onMouseDown={onHeaderMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span style={{fontSize:12}}>{icon}</span>
          <span className="cinzel gold font-semibold tracking-wide" style={{fontSize:11}}>
            {title}
          </span>
          {headerExtra}
        </div>
        <div className="flex gap-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={() => setPos(s => { const n={...s,locked:!s.locked}; savePos(id,n); return n; })}
            className="btn-dungeon"
            style={{fontSize:9,padding:'1px 5px',color:pos.locked?'#e8c84a':'#4a3820'}}
            title={pos.locked ? 'Unlock' : 'Lock position'}
          >{pos.locked ? '🔒' : '🔓'}</button>
          <button
            onClick={resetToDefault}
            className="btn-dungeon"
            style={{fontSize:9,padding:'1px 5px'}}
            title="Reset to default position"
          >↺</button>
          <button
            onClick={() => toggleMinimize(id)}
            className="btn-dungeon"
            style={{fontSize:9,padding:'1px 5px'}}
          >{panel.minimized ? '▲' : '▼'}</button>
          <button
            onClick={() => closePanel(id)}
            className="btn-dungeon danger"
            style={{fontSize:9,padding:'1px 5px'}}
          >✕</button>
        </div>
      </div>

      {/* Body */}
      {!panel.minimized && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{zIndex:1,position:'relative'}}>
          {children}
        </div>
      )}

      {/* Resize handles */}
      {!panel.minimized && !pos.locked && (
        <>
          <div
            onMouseDown={e => onResizeMouseDown(e,'e')}
            style={{position:'absolute',right:0,top:8,bottom:8,width:5,cursor:'ew-resize',zIndex:10}}
          />
          <div
            onMouseDown={e => onResizeMouseDown(e,'s')}
            style={{position:'absolute',bottom:0,left:8,right:8,height:5,cursor:'s-resize',zIndex:10}}
          />
          <div
            onMouseDown={e => onResizeMouseDown(e,'se')}
            style={{
              position:'absolute',right:0,bottom:0,width:14,height:14,
              cursor:'nwse-resize',zIndex:11,
              background:'linear-gradient(135deg,transparent 50%,#4a3820 50%)',
            }}
          />
        </>
      )}
    </div>
  );
}