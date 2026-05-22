import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    },
    database: { connected: false, error: null as string | null, roomCount: 0 },
  };

  if (!process.env.DATABASE_URL) {
    results.database.error = 'DATABASE_URL environment variable not set';
    return NextResponse.json(results, { status: 200 });
  }

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    
    // Check tables exist
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rooms','agents','tasks','logs','agent_tools')
      ORDER BY table_name
    `);
    const tables = tableCheck.rows.map((r: any) => r.table_name);

    // Count rows
    const roomCount  = tables.includes('rooms')  ? (await client.query('SELECT COUNT(*) FROM rooms')).rows[0].count  : 0;
    const agentCount = tables.includes('agents') ? (await client.query('SELECT COUNT(*) FROM agents')).rows[0].count : 0;

    client.release();
    await pool.end();

    results.database = {
      connected: true,
      error: null,
      tables,
      missingTables: ['rooms','agents','tasks','logs','agent_tools'].filter(t => !tables.includes(t)),
      roomCount: parseInt(roomCount),
      agentCount: parseInt(agentCount),
    };
  } catch (e: any) {
    results.database.error = e.message;
  }

  return NextResponse.json(results, { status: 200 });
}