import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

const SEED_AGENT = {
  id:'agent-supreme-leader', name:'SUPREME LEADER', room_id:'room-management',
  role:'Manager', color:'#ff4444', char_model:'big_demon',
  purpose:'You are SUPREME LEADER — top-level director of AgentOS. Decompose goals and delegate to departments.',
};

export async function GET() {
  try {
    let agents = await query(`
      SELECT id, name, room_id as "roomId", role, purpose, color,
             char_model as "charModel", status, current_task as "currentTask",
             api_key_override as "apiKeyOverride",
             tasks_completed as "tasksCompleted", tasks_errored as "tasksErrored",
             created_at as "createdAt"
      FROM agents ORDER BY created_at ASC
    `);

    // Auto-seed if empty
    if (agents.length === 0) {
      await query(
        `INSERT INTO agents (id,name,room_id,role,purpose,color,char_model,status,tasks_completed,tasks_errored,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'idle',0,0,$8) ON CONFLICT (id) DO NOTHING`,
        [SEED_AGENT.id,SEED_AGENT.name,SEED_AGENT.room_id,SEED_AGENT.role,
         SEED_AGENT.purpose,SEED_AGENT.color,SEED_AGENT.char_model,1000]
      );
      agents = await query(`
        SELECT id, name, room_id as "roomId", role, purpose, color,
               char_model as "charModel", status, current_task as "currentTask",
               api_key_override as "apiKeyOverride",
               tasks_completed as "tasksCompleted", tasks_errored as "tasksErrored",
               created_at as "createdAt"
        FROM agents ORDER BY created_at ASC
      `);
    }

    // Attach tools
    const tools = await query(`SELECT * FROM agent_tools ORDER BY id`).catch(()=>[]);
    return NextResponse.json(agents.map((a: any) => ({
      ...a,
      tools: tools.filter((t: any) => t.agent_id === a.id).map((t: any) => ({
        id:t.id, name:t.name, description:t.description, enabled:t.enabled,
      })),
    })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id,name,roomId,role,purpose,color,charModel,status,
            currentTask,apiKeyOverride,tasksCompleted,tasksErrored,createdAt,tools } = body;
    await query(`
      INSERT INTO agents (id,name,room_id,role,purpose,color,char_model,status,current_task,api_key_override,tasks_completed,tasks_errored,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        name=$2,room_id=$3,role=$4,purpose=$5,color=$6,char_model=$7,
        status=$8,current_task=$9,api_key_override=$10,tasks_completed=$11,tasks_errored=$12
    `, [id,name,roomId,role,purpose,color,charModel||'knight_m',
        status||'idle',currentTask||null,apiKeyOverride||null,
        tasksCompleted||0,tasksErrored||0,createdAt||Date.now()]);
    if (tools?.length) {
      await query(`DELETE FROM agent_tools WHERE agent_id=$1`, [id]);
      for (const t of tools) {
        await query(`INSERT INTO agent_tools (id,agent_id,name,description,enabled) VALUES ($1,$2,$3,$4,$5)`,
          [t.id,id,t.name,t.description||'',t.enabled]).catch(()=>{});
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await query(`DELETE FROM agents WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}