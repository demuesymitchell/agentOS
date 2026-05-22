'use client';
import { useState, useEffect } from 'react';

interface HealthData {
  env: { DATABASE_URL: boolean; ANTHROPIC_API_KEY: boolean; NODE_ENV: string };
  database: {
    connected: boolean;
    error: string | null;
    tables?: string[];
    missingTables?: string[];
    roomCount?: number;
    agentCount?: number;
  };
}

export default function DbStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      setHealth(await res.json());
    } catch (e) {
      setHealth(null);
    }
    setLoading(false);
  };

  useEffect(() => { check(); }, []);

  const dbOk  = health?.database?.connected;
  const dbErr = health?.database?.error;
  const noUrl = health && !health.env.DATABASE_URL;
  const hasMissing = (health?.database?.missingTables?.length || 0) > 0;

  const dotColor = loading ? '#6a5840'
    : !health ? '#6a5840'
    : dbOk && !hasMissing ? '#50a060'
    : dbOk && hasMissing ? '#e87830'
    : '#c83030';

  const label = loading ? 'checking...'
    : !health ? 'DB unknown'
    : dbOk && !hasMissing ? 'DB connected'
    : dbOk && hasMissing ? 'DB: missing tables'
    : noUrl ? 'DB: no URL set'
    : 'DB: error';

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(v => !v); if (!open) check(); }}
        className="flex items-center gap-1.5 h-full px-3 hover:bg-[#1e1208] transition-colors"
        title="Database status"
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor,
          display: 'inline-block',
          boxShadow: dbOk && !hasMissing ? `0 0 4px ${dotColor}` : 'none',
        }}/>
        <span className="cinzel" style={{ fontSize: 10, color: dotColor }}>{label}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 w-80 panel-dungeon"
          style={{ minWidth: 300 }}>
          <div className="panel-header">
            <span className="cinzel gold" style={{ fontSize: 11 }}>🗄 System Status</span>
            <button onClick={() => setOpen(false)} className="btn-dungeon danger"
              style={{ fontSize: 9, padding: '1px 5px' }}>✕</button>
          </div>
          <div className="p-3 space-y-3">

            {/* Database */}
            <div>
              <p className="cinzel dim mb-2 uppercase tracking-wider" style={{ fontSize: 10 }}>Database</p>
              <div style={{ background: '#080604', border: '1px solid #2a1e12' }} className="p-2 space-y-1.5">
                <Row label="DATABASE_URL" ok={!!health?.env.DATABASE_URL}
                  value={health?.env.DATABASE_URL ? 'set' : 'NOT SET'} />
                <Row label="Connection" ok={!!dbOk}
                  value={dbOk ? 'Connected' : dbErr || 'Failed'} />
                {dbOk && (
                  <>
                    <Row label="Tables found"
                      ok={(health?.database?.missingTables?.length||0) === 0}
                      value={health?.database?.tables?.join(', ') || 'none'} />
                    {hasMissing && (
                      <Row label="Missing tables" ok={false}
                        value={health?.database?.missingTables?.join(', ') || ''} />
                    )}
                    <Row label="Rooms in DB" ok={(health?.database?.roomCount||0) > 0}
                      value={String(health?.database?.roomCount || 0)} />
                    <Row label="Agents in DB" ok={(health?.database?.agentCount||0) > 0}
                      value={String(health?.database?.agentCount || 0)} />
                  </>
                )}
              </div>
            </div>

            {/* API Key */}
            <div>
              <p className="cinzel dim mb-2 uppercase tracking-wider" style={{ fontSize: 10 }}>API Keys</p>
              <div style={{ background: '#080604', border: '1px solid #2a1e12' }} className="p-2">
                <Row label="ANTHROPIC_API_KEY" ok={!!health?.env.ANTHROPIC_API_KEY}
                  value={health?.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET'} />
              </div>
            </div>

            {/* Fix instructions */}
            {!health?.env.DATABASE_URL && (
              <div className="p-2" style={{ background: '#1a0808', border: '1px solid #c8303044' }}>
                <p className="cinzel" style={{ fontSize: 11, color: '#c83030', marginBottom: 4 }}>
                  Fix: Add DATABASE_URL
                </p>
                <p className="cinzel dim" style={{ fontSize: 10, lineHeight: 1.6 }}>
                  1. Railway → your web service → Variables<br/>
                  2. Add DATABASE_URL = (copy from Postgres service → Connect tab)<br/>
                  3. Redeploy
                </p>
              </div>
            )}

            {dbOk && hasMissing && (
              <div className="p-2" style={{ background: '#1a1000', border: '1px solid #e8780044' }}>
                <p className="cinzel" style={{ fontSize: 11, color: '#e87830', marginBottom: 4 }}>
                  Fix: Run migration SQL
                </p>
                <p className="cinzel dim" style={{ fontSize: 10, lineHeight: 1.6 }}>
                  Railway → PostgreSQL service → Query tab<br/>
                  Paste and run: src/lib/db/migrate.sql
                </p>
              </div>
            )}

            {!health?.env.ANTHROPIC_API_KEY && (
              <div className="p-2" style={{ background: '#1a1000', border: '1px solid #e8780044' }}>
                <p className="cinzel" style={{ fontSize: 11, color: '#e87830', marginBottom: 4 }}>
                  Fix: Add ANTHROPIC_API_KEY
                </p>
                <p className="cinzel dim" style={{ fontSize: 10, lineHeight: 1.6 }}>
                  Railway → your web service → Variables<br/>
                  Add ANTHROPIC_API_KEY = sk-ant-...
                </p>
              </div>
            )}

            <button onClick={check} disabled={loading}
              className="btn-dungeon w-full" style={{ fontSize: 10 }}>
              {loading ? '⟳ Checking...' : '↺ Refresh'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="cinzel dim flex-shrink-0" style={{ fontSize: 10 }}>{label}</span>
      <span className="cinzel text-right" style={{
        fontSize: 10,
        color: ok ? '#50a060' : '#c83030',
        wordBreak: 'break-all',
      }}>{value}</span>
    </div>
  );
}