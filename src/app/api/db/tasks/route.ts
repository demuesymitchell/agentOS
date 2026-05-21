import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export async function GET() {
  try {
    const rows = await query(`
      SELECT id, ts, level, from_name as "from", to_name as "to", message
      FROM logs ORDER BY ts DESC LIMIT 300
    `);
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, ts, level, from: from_name, to: to_name, message } = await req.json();
    await query(`
      INSERT INTO logs (id,ts,level,from_name,to_name,message)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING
    `, [id,ts,level||'info',from_name||'',to_name||null,message]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}