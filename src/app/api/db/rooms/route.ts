import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

const SEED_ROOMS = [
  { id:'room-management', name:'Management', color:'#00e5ff', icon:'⚙',  grid_x:4,  grid_y:4,  grid_w:18, grid_h:14 },
  { id:'room-media',      name:'Media',      color:'#cc44ff', icon:'🎨', grid_x:27, grid_y:4,  grid_w:18, grid_h:14 },
  { id:'room-factory',    name:'Factory',    color:'#ffaa00', icon:'🏭', grid_x:4,  grid_y:23, grid_w:18, grid_h:14 },
  { id:'room-research',   name:'Research',   color:'#00ff88', icon:'🔬', grid_x:27, grid_y:23, grid_w:18, grid_h:14 },
];

export async function GET() {
  try {
    let rows = await query(`
      SELECT id, name, color, icon,
             grid_x as "gridX", grid_y as "gridY",
             grid_w as "gridW", grid_h as "gridH",
             created_at as "createdAt"
      FROM rooms ORDER BY created_at ASC
    `);

    // Auto-seed if empty
    if (rows.length === 0) {
      for (const r of SEED_ROOMS) {
        await query(
          `INSERT INTO rooms (id,name,color,icon,grid_x,grid_y,grid_w,grid_h,created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [r.id,r.name,r.color,r.icon,r.grid_x,r.grid_y,r.grid_w,r.grid_h,1000]
        );
      }
      rows = await query(`
        SELECT id, name, color, icon,
               grid_x as "gridX", grid_y as "gridY",
               grid_w as "gridW", grid_h as "gridH",
               created_at as "createdAt"
        FROM rooms ORDER BY created_at ASC
      `);
    }

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, color, icon, gridX, gridY, gridW, gridH, createdAt } = await req.json();
    await query(`
      INSERT INTO rooms (id,name,color,icon,grid_x,grid_y,grid_w,grid_h,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET
        name=$2,color=$3,icon=$4,grid_x=$5,grid_y=$6,grid_w=$7,grid_h=$8
    `, [id,name,color,icon,gridX,gridY,gridW,gridH,createdAt||Date.now()]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await query(`DELETE FROM rooms WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}