import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

const SEED_ROOMS = [
  { id:'room-management', name:'Management', color:'#00e5ff', icon:'⚙',  grid_x:4,  grid_y:4,  grid_w:18, grid_h:14 },
  { id:'room-media',      name:'Media',      color:'#cc44ff', icon:'🎨', grid_x:27, grid_y:4,  grid_w:18, grid_h:14 },
  { id:'room-factory',    name:'Factory',    color:'#ffaa00', icon:'🏭', grid_x:4,  grid_y:23, grid_w:18, grid_h:14 },
  { id:'room-research',   name:'Research',   color:'#00ff88', icon:'🔬', grid_x:27, grid_y:23, grid_w:18, grid_h:14 },
];

export async function POST() {
  try {
    for (const r of SEED_ROOMS) {
      await query(
        `INSERT INTO rooms (id,name,color,icon,grid_x,grid_y,grid_w,grid_h,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [r.id,r.name,r.color,r.icon,r.grid_x,r.grid_y,r.grid_w,r.grid_h,Date.now()]
      );
    }
    await query(
      `INSERT INTO agents (id,name,room_id,role,purpose,color,char_model,status,tasks_completed,tasks_errored,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,$9) ON CONFLICT (id) DO NOTHING`,
      ['agent-supreme-leader','SUPREME LEADER','room-management','Manager',
       'You are SUPREME LEADER — top-level director of AgentOS. Decompose goals and delegate to departments.',
       '#ff4444','big_demon','idle',Date.now()]
    );
    const rooms  = await query('SELECT id,name FROM rooms');
    const agents = await query('SELECT id,name FROM agents');
    return NextResponse.json({ ok:true, rooms, agents });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

export async function GET() {
  try {
    const rooms  = await query('SELECT id,name FROM rooms');
    const agents = await query('SELECT id,name FROM agents');
    return NextResponse.json({ rooms, agents });
  } catch (e: any) {
    return NextResponse.json({ error:e.message }, { status:500 });
  }
}