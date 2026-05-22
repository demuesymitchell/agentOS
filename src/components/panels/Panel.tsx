'use client';
import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { PanelId } from '@/types';

// Default docked positions for each panel
export const PANEL_DEFAULTS: Record<string, {
  edge: 'left'|'right'|'bottom'; order: number;
  w: number; h: number;
}> = {
  terminal:     { edge:'left',   order:0, w:340, h:380 },
  tasks:        { edge:'left',   order:1, w:340, h:360 },
  admin:        { edge:'right',  order:0, w:340, h:440 },
  agentInspect: { edge:'right',  order:1, w:340, h:300 },
  media:        { edge:'bottom', order:0, w:420, h:280 },
};

interface PanelState { x:number; y:number; w:number; h:number; locked:boolean; }

function getStoredState(id:string, defaults:{x:number;y:number;w:number;h:number}): PanelState {
  if (typeof window==='undefined') return {...defaults,locked:false};
  try {
    const raw = localStorage.getItem(`agentOS_panel_${id}`);
    return raw ? JSON.parse(raw) : {...defaults,locked:false};
  } catch { return {...defaults,locked:false}; }
}

function setStoredState(id:string, state:PanelState) {
  try { localStorage.setItem(`agentOS_panel_${id}`, JSON.stringify(state)); } catch {}
}

// Compute default x/y from edge + order
function defaultPosition(id: string, winW: number, winH: number): {x:number;y:number;w:number;h:number} {
  const d = PANEL_DEFAULTS[id] || { edge:'left', order:0, w:340, h:400 };
  const TASKBAR = 44;
  if (d.edge==='left') {
    return { x:0, y: TASKBAR + d.order*(d.h+4), w:d.w, h:d.h };
  }
  if (d.edge==='right') {
    return { x: winW-d.w, y: TASKBAR + d.order*(d.h+4), w:d.w, h:d.h };
  }
  // bottom
  return { x: winW/2-d.w/2, y: winH-d.h, w:d.w, h:d.h };
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
  id, title, icon='🕯', children, headerExtra,
  minW=260, minH=160,
}: PanelProps) {
  const { panels, closePanel, toggleMinimize } = useStore();
  const panel = panels.find(p => p.id === id);

  const [winSize, setWinSize] = useState({ w: typeof window!=='undefined'?window.innerWidth:1400, h: typeof window!=='undefined'?window.innerHeight:900 });
  useEffect(() => {
    const onResize = () => setWinSize({ w:window.innerWidth, h:window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const defaults = defaultPosition(id, winSize.w, winSize.h);
  const [state, setState] = useState<PanelState>(() => getStoredState(id, defaults));

  // Persist on change
  useEffect(() => { setStoredState(id, state); }, [id, state]);

  const dragRef   = useRef<{sx:number;sy:number;ox:number;oy:number}|null>(null);
  const resizeRef = useRef<{sx:number;sy:number;ow:number;oh:number;dir:string}|null>(null);

  const resetToDefault = useCallback(() => {
    const d = defaultPosition(id, winSize.w, winSize.h);
    setState({ ...d, locked: false });
  }, [id, winSize]);

  // ── Drag ────────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (state.locked) return;
    e.preventDefault();
    dragRef.current = { sx:e.clientX, sy:e.clientY, ox:state.x, oy:state.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setState(s => ({
        ...s,
        x: Math.max(0, Math.min(winSize.w-s.w, dragRef.current!.ox + ev.clientX - dragRef.current!.sx)),
        y: Math.max(44, Math.min(winSize.h-80, dragRef.current!.oy + ev.clientY - dragRef.current!.sy)),
      }));
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [state.locked, state.x, state.y, winSize]);

  // ── Resize ───────────────────────────────────────────────────────────────
  const onResizeStart = useCallback((e: React.MouseEvent, dir: string) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { sx:e.clientX, sy:e.clientY, ow:state.w, oh:state.h, dir };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const { sx,sy,ow,oh,dir } = resizeRef.current;
      setState(s => ({
        ...s,
        w: dir.includes('e') ? Math.max(minW, ow+(ev.clientX-sx)) : s.w,
        h: dir.includes('s') ? Math.max(minH, oh+(ev.clientY-sy)) : s.h,
      }));
    };
    const onUp = () => {
      resizeRef.current = null;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = dir==='se'?'nwse-resize':dir==='e'?'ew-resize':'s-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [state.w, state.h, minW, minH]);

  if (!panel?.open) return null;

  const h = panel.minimized ? 'auto' : state.h;

  return (
    <div
      className="panel-dungeon flex flex-col"
      style={{
        position: 'fixed',
        left: state.x,
        top:  state.y,
        width: state.w,
        height: h,
        zIndex: 30,
        userSelect: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        transition: 'box-shadow 0.1s',
      }}
    >
      {/* Header */}
      <div
        className="panel-header flex-shrink-0"
        style={{ cursor: state.locked ? 'default' : 'grab' }}
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span style={{fontSize:12}}>{icon}</span>
          <span className="cinzel gold font-semibold tracking-wide" style={{fontSize:11}}>{title}</span>
          {headerExtra}
        </div>
        <div className="flex gap-1 flex-shrink-0" onMouseDown={e=>e.stopPropagation()}>
          {/* Lock toggle */}
          <button
            onClick={()=>setState(s=>({...s,locked:!s.locked}))}
            className="btn-dungeon"
            style={{fontSize:9,padding:'1px 5px',color:state.locked?'#e8c84a':'#4a3820'}}
            title={state.locked?'Unlock panel':'Lock panel'}
          >
            {state.locked ? '🔒' : '🔓'}
          </button>
          {/* Reset position */}
          <button
            onClick={resetToDefault}
            className="btn-dungeon"
            style={{fontSize:9,padding:'1px 5px'}}
            title="Reset to default position"
          >↺</button>
          {/* Minimize */}
          <button
            onClick={()=>toggleMinimize(id)}
            className="btn-dungeon"
            style={{fontSize:9,padding:'1px 5px'}}
          >{panel.minimized?'▲':'▼'}</button>
          {/* Close */}
          <button
            onClick={()=>closePanel(id)}
            className="btn-dungeon danger"
            style={{fontSize:9,padding:'1px 5px'}}
          >✕</button>
        </div>
      </div>

      {/* Body */}
      {!panel.minimized && (
        <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden" style={{zIndex:1}}>
          {children}
        </div>
      )}

      {/* Resize handles */}
      {!panel.minimized && !state.locked && (
        <>
          <div onMouseDown={e=>onResizeStart(e,'e')}
            style={{position:'absolute',right:0,top:8,bottom:8,width:5,cursor:'ew-resize',zIndex:10}}/>
          <div onMouseDown={e=>onResizeStart(e,'s')}
            style={{position:'absolute',bottom:0,left:8,right:8,height:5,cursor:'s-resize',zIndex:10}}/>
          <div onMouseDown={e=>onResizeStart(e,'se')}
            style={{
              position:'absolute',right:0,bottom:0,width:14,height:14,
              cursor:'nwse-resize',zIndex:11,
              background:'linear-gradient(135deg,transparent 50%,#4a3820 50%)',
            }}/>
        </>
      )}
    </div>
  );
}
