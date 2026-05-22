let pool: any = null;

async function getPool() {
  if (pool) return pool;
  const { Pool } = await import('pg');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');

  // Always enable SSL for Railway — works for both internal and proxy URLs
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test connection immediately
  const client = await pool.connect();
  client.release();

  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = await getPool();
  const result = await p.query(sql, params);
  return result.rows;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}