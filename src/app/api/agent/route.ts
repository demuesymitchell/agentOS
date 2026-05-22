import { NextRequest, NextResponse } from 'next/server';
import type { TaskOutput } from '@/types';

export async function POST(req: NextRequest) {
  const { task, agent, apiKey, roomConfig, attachments } = await req.json();

  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return NextResponse.json({
      outputs: [{
        type: 'text',
        content: `⚠️ No API key configured.\n\nTo enable real AI responses:\n1. Open Guild Hall\n2. Click EDIT on ${agent.name}\n3. Add your Anthropic API key\n\nOr set ANTHROPIC_API_KEY in Railway environment variables.`,
        label: 'API Key Required',
      }],
      rawResponse: null,
      error: 'no_api_key',
    });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });

    // Build system prompt
    let systemPrompt = agent.purpose
      ? `${agent.purpose}\n\nYour name is ${agent.name}. Your role is ${agent.role}.`
      : `You are ${agent.name}, a ${agent.role} in an autonomous AI operating system.`;

    // Apply room config override
    if (roomConfig?.systemPromptOverride) {
      systemPrompt = roomConfig.systemPromptOverride + '\n\n' + systemPrompt;
    }

    systemPrompt += `\n\nAlways respond with clear, well-structured, actionable output.`;

    // Build message content — include attachments as context
    const messageContent: any[] = [];

    if (attachments?.length) {
      messageContent.push({
        type: 'text',
        text: `You have access to ${attachments.length} file(s) in this room:\n${
          attachments.map((a: any) => `- ${a.name} (${a.type})`).join('\n')
        }\n\nUse these as reference for your task.\n\n`,
      });
      // Add images if present (vision support)
      for (const att of attachments) {
        if (att.type === 'image' && att.url?.startsWith('data:')) {
          const [header, data] = att.url.split(',');
          const mediaType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data },
          });
        }
      }
    }

    messageContent.push({ type: 'text', text: task });

    const maxTokens = roomConfig?.maxTokens || 2000;

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    });

    const rawResponse = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    // Build outputs
    const outputs: TaskOutput[] = [];
    const roleLower = (agent.role + ' ' + agent.name).toLowerCase();
    const taskLower = task.toLowerCase();

    // Determine output format
    const fmt = roomConfig?.outputFormat;

    if (fmt === 'image' || (roleLower.includes('media') || roleLower.includes('design') || roleLower.includes('visual'))) {
      if (taskLower.includes('image') || taskLower.includes('visual') || taskLower.includes('design') || taskLower.includes('create') || fmt === 'image') {
        outputs.push({
          type: 'image',
          content: '',
          label: 'Visual Output — connect DALL-E or Stability AI to generate',
        });
      }
      outputs.push({ type: 'text', content: rawResponse, label: 'Creative Direction' });
    } else if (fmt === 'listing' || roleLower.includes('factory') || roleLower.includes('product') || roleLower.includes('listing')) {
      outputs.push({ type: 'listing', content: rawResponse, label: 'Product Output' });
    } else if (fmt === 'json') {
      outputs.push({ type: 'json', content: rawResponse, label: 'Structured Data' });
    } else {
      outputs.push({ type: 'text', content: rawResponse, label: `${agent.role} Output` });
    }

    return NextResponse.json({ outputs, rawResponse });
  } catch (e: any) {
    const msg = e?.message || 'Unknown error';
    const isAuthError = msg.includes('401') || msg.includes('auth') || msg.includes('API key');
    return NextResponse.json({
      outputs: [{
        type: 'text',
        content: isAuthError
          ? `❌ Invalid API key for ${agent.name}.\n\nCheck that your Anthropic API key is correct in the agent settings.`
          : `❌ Agent error: ${msg}`,
        label: 'Error',
      }],
      rawResponse: null,
      error: msg,
    }, { status: 500 });
  }
}