import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export async function GET() {
  try {
    const rows = await query(`
      SELECT id, name, color, icon,
             grid_x as "gridX", grid_y as "gridY",
             grid_w as "gridW", grid_h as "gridH",
             created_at as "createdAt"
      FROM rooms ORDER BY created_at ASC
    `);
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
    `, [id,name,color,icon,gridX,gridY,gridW,gridH,createdAt]);
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