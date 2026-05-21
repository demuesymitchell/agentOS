import { NextRequest, NextResponse } from 'next/server';
import type { TaskOutput } from '@/types';

export async function POST(req: NextRequest) {
  const { task, agent, apiKey } = await req.json();

  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    // Demo mode
    const outputs: TaskOutput[] = [
      {
        type: 'text',
        content: `[Demo] ${agent.name} (${agent.role}) processed: "${task}"\n\nAdd ANTHROPIC_API_KEY to .env.local for real AI responses.`,
        label: 'Demo Output',
      },
    ];
    return NextResponse.json({ outputs, rawResponse: outputs[0].content });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });

    // Build system prompt from agent config
    const systemPrompt = agent.purpose
      ? `${agent.purpose}\n\nYour name is ${agent.name}. Your role is ${agent.role}.\nAlways respond with useful, actionable output. Format your response clearly.`
      : `You are ${agent.name}, a ${agent.role} agent in an autonomous AI operating system.
Complete the task given to you thoroughly and professionally.
Format your response clearly with sections where appropriate.`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: task }],
    });

    const rawResponse = msg.content[0].type === 'text' ? msg.content[0].text : '';

    // Parse outputs based on role
    const outputs: TaskOutput[] = [];
    const roleLower = agent.role.toLowerCase();

    if (roleLower.includes('media') || roleLower.includes('design') || roleLower.includes('creative')) {
      // Media agent — check if image generation requested
      if (task.toLowerCase().includes('image') || task.toLowerCase().includes('visual') || task.toLowerCase().includes('design')) {
        outputs.push({
          type: 'image',
          content: '', // placeholder — wire to DALL-E when ready
          label: 'Image (connect DALL-E API to generate)',
        });
      }
      outputs.push({ type: 'text', content: rawResponse, label: 'Creative Brief' });
    } else if (roleLower.includes('factory') || roleLower.includes('listing') || roleLower.includes('product')) {
      outputs.push({ type: 'listing', content: rawResponse, label: 'Product Listing' });
    } else {
      outputs.push({ type: 'text', content: rawResponse, label: agent.role + ' Output' });
    }

    return NextResponse.json({ outputs, rawResponse });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
