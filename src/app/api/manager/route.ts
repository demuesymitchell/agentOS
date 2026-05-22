import { NextRequest, NextResponse } from 'next/server';
import type { Agent, Room } from '@/types';

export async function POST(req: NextRequest) {
  const { goal, agents, rooms }: { goal: string; agents: Agent[]; rooms: Room[] } = await req.json();

  const deptContext = rooms.map(r => {
    const roomAgents = agents.filter(a => a.roomId === r.id);
    const agentList = roomAgents.map(a => `${a.name} (${a.role})`).join(', ') || 'no agents';
    const hasKey = roomAgents.some(a => a.apiKeyOverride);
    return `- ${r.name}: ${agentList}${hasKey ? ' [custom key]' : ''}`;
  }).join('\n');

  // Find leader agent's key
  const leader = agents.find(a =>
    a.name === 'SUPREME LEADER' ||
    a.role.toLowerCase().includes('manager') ||
    a.role.toLowerCase().includes('director')
  );
  const key = leader?.apiKeyOverride || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    // Demo mode — generate plausible routing without AI
    const staffedRooms = rooms.filter(r => agents.some(a => a.roomId === r.id));
    const tasks = staffedRooms.slice(0, 3).map(r => {
      const agent = agents.find(a => a.roomId === r.id)!;
      return { roomName: r.name, agentRole: agent.role, task: `Handle "${goal}" for the ${r.name} department` };
    });
    return NextResponse.json({
      thought: `[Demo mode — no API key] Routing "${goal}" to ${tasks.length} department(s). Add an API key to enable real AI.`,
      tasks,
    });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are SUPREME LEADER — the director of AgentOS, an autonomous AI command center.
Decompose the user's goal into concrete tasks and route each to the right department.

Available departments:
${deptContext}

Rules:
- Only route to departments that have agents
- Only include departments genuinely needed for this goal  
- Be specific and actionable in each task description
- Max 4 subtasks
- Tasks should be independent and parallelizable where possible

Respond ONLY with valid JSON, no markdown fences:
{
  "thought": "one sentence explaining your delegation strategy",
  "tasks": [
    { "roomName": "exact room name", "agentRole": "agent role", "task": "specific actionable task" }
  ]
}`,
      messages: [{ role: 'user', content: goal }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (e: any) {
    const msg = e?.message || 'Manager failed';
    const isAuth = msg.includes('401') || msg.includes('auth') || msg.includes('API key');
    return NextResponse.json({
      error: isAuth ? 'Invalid API key on SUPREME LEADER. Check agent settings.' : msg,
    }, { status: 500 });
  }
}