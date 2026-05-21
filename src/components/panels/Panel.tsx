'use client';
import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { PanelId } from '@/types';

interface PanelProps {
  id: PanelId;
  title: string;
  icon?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
  defaultX?: number;
  defaultY?: number;
  defaultW?: number;
  defaultH?: number;
  minW?: number;
  minH?: number;
}

const PANEL_STORAGE_KEY = (id: string) => `agentOS_panel_${id}`;

function loadPos(id: string, defaults: {x:number,y:number,w:number,h:number}) {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY(id));
    return raw ? JSON.parse(raw) : defaults;
  } catch { return defaults; }
}

function savePos(id: string, pos: {x:number,y:number,w:number,h:number}) {
  try { localStorage.setItem(PANEL_STORAGE_KEY(id), JSON.stringify(pos)); } catch {}
}

export default function Panel({
  id, title, icon = '🕯', children, headerExtra,
  defaultX = 40, defaultY = 60,
  defaultW = 360, defaultH = 480,
  minW = 280, minH = 160,
}: PanelProps) {
  const { panels, closePanel, toggleMinimize } = useStore();
  const panel = panels.find(p => p.id === id);

  const defaults = { x: defaultX, y: defaultY, w: defaultW, h: defaultH };
  const [pos, setPos] = useState(() => loadPos(id, defaults));

  const panelRef   = useRef<HTMLDivElement>(null);
  const dragState  = useRef<{startX:number,startY:number,origX:number,origY:number}|null>(null);
  const resizeState= useRef<{startX:number,startY:number,origW:number,origH:number,dir:string}|null>(null);

  // Persist position whenever it changes
  useEffect(() => { savePos(id, pos); }, [id, pos]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const { startX, startY, origX, origY } = dragState.current;
      setPos(p => ({
        ...p,
        x: Math.max(0, origX + ev.clientX - startX),
        y: Math.max(44, origY + ev.clientY - startY),
      }));
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  // ── Resize ────────────────────────────────────────────────────────────────
  const onResizeStart = useCallback((e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: pos.w, origH: pos.h, dir };

    const onMove = (ev: MouseEvent) => {
      if (!resizeState.current) return;
      const { startX, startY, origW, origH, dir } = resizeState.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setPos(p => ({
        ...p,
        w: dir.includes('e') ? Math.max(minW, origW + dx) : p.w,
        h: dir.includes('s') ? Math.max(minH, origH + dy) : p.h,
      }));
    };
    const onUp = () => {
      resizeState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = dir.includes('e') && dir.includes('s') ? 'nwse-resize' : dir.includes('e') ? 'ew-resize' : 's-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos, minW, minH]);

  const resetPos = () => {
    const fresh = defaults;
    setPos(fresh);
    savePos(id, fresh);
  };

  if (!panel?.open) return null;

  return (
    <div
      ref={panelRef}
      className="panel-dungeon flex flex-col"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: panel.minimized ? 'auto' : pos.h,
        zIndex: 30,
        userSelect: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
      }}
    >
      {/* Header — drag handle */}
      <div
        className="panel-header flex-shrink-0"
        style={{ cursor: 'grab' }}
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ fontSize: 12 }}>{icon}</span>
          <span className="cinzel gold font-semibold tracking-wide truncate" style={{ fontSize: 11 }}>
            {title}
          </span>
          {headerExtra}
        </div>
        <div className="flex gap-1 flex-shrink-0 ml-2" onMouseDown={e => e.stopPropagation()}>
          <button onClick={resetPos} className="btn-dungeon" style={{ fontSize: 8, padding: '1px 4px' }} title="Reset position">↺</button>
          <button onClick={() => toggleMinimize(id)} className="btn-dungeon" style={{ fontSize: 9, padding: '1px 5px' }}>
            {panel.minimized ? '▲' : '▼'}
          </button>
          <button onClick={() => closePanel(id)} className="btn-dungeon danger" style={{ fontSize: 9, padding: '1px 5px' }}>✕</button>
        </div>
      </div>

      {/* Body */}
      {!panel.minimized && (
        <div className="flex flex-col flex-1 min-h-0 relative z-[1] overflow-hidden">
          {children}
        </div>
      )}

      {/* Resize handles */}
      {!panel.minimized && (
        <>
          {/* Right edge */}
          <div onMouseDown={e => onResizeStart(e, 'e')}
            style={{ position:'absolute', right:0, top:8, bottom:8, width:6, cursor:'ew-resize', zIndex:10 }} />
          {/* Bottom edge */}
          <div onMouseDown={e => onResizeStart(e, 's')}
            style={{ position:'absolute', bottom:0, left:8, right:8, height:6, cursor:'s-resize', zIndex:10 }} />
          {/* Bottom-right corner */}
          <div onMouseDown={e => onResizeStart(e, 'se')}
            style={{ position:'absolute', right:0, bottom:0, width:14, height:14, cursor:'nwse-resize', zIndex:11,
              background:'linear-gradient(135deg, transparent 50%, #4a3820 50%)',
            }} />
        </>
      )}
    </div>
  );
}