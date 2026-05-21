import { NextRequest, NextResponse } from 'next/server';
import type { Agent, Room } from '@/types';

export async function POST(req: NextRequest) {
  const { goal, agents, rooms }: { goal: string; agents: Agent[]; rooms: Room[] } = await req.json();

  // Build context about available rooms and agents
  const deptContext = rooms.map(r => {
    const roomAgents = agents.filter(a => a.roomId === r.id);
    return `- ${r.name}: ${roomAgents.map(a => `${a.name} (${a.role})`).join(', ') || 'no agents'}`;
  }).join('\n');

  const noKey = !process.env.ANTHROPIC_API_KEY;

  if (noKey) {
    // Demo mode - still generates real-looking routing
    const availableRooms = rooms.filter(r => {
      const hasAgents = agents.some(a => a.roomId === r.id);
      return hasAgents;
    });

    const tasks = availableRooms.slice(0, 3).map(r => {
      const agent = agents.find(a => a.roomId === r.id);
      return {
        roomName: r.name,
        agentRole: agent?.role || 'Agent',
        task: `[DEMO] Handle "${goal}" for ${r.name} department`,
      };
    });

    return NextResponse.json({
      thought: `[Demo mode] Routing "${goal}" to ${tasks.length} department(s). Add ANTHROPIC_API_KEY for real AI.`,
      tasks,
    });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are the Director Agent of AgentOS — an autonomous AI operating system.
Your job is to decompose high-level goals into concrete tasks and route them to the right departments.

Available departments and agents:
${deptContext}

Rules:
- Only route to departments that have agents
- Only include departments genuinely needed for this goal
- Max 4 subtasks
- Tasks must be specific and actionable

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "thought": "one sentence explaining your routing decision",
  "tasks": [
    { "roomName": "exact room name", "agentRole": "agent role to assign", "task": "specific actionable task description" }
  ]
}`,
      messages: [{ role: 'user', content: goal }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Manager failed' }, { status: 500 });
  }
}
