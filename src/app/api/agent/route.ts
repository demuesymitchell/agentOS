import { NextRequest, NextResponse } from 'next/server';
import type { TaskOutput } from '@/types';

export async function POST(req: NextRequest) {
  const { task, agent, apiKey, roomConfig, attachments } = await req.json();
  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return NextResponse.json({
      outputs: [{
        type: 'text',
        content: `⚠️ No API key configured.\n\nTo enable AI responses:\n1. Open Guild Hall → Edit ${agent.name}\n2. Add your Anthropic API key\n\nOr set ANTHROPIC_API_KEY in Railway environment variables.`,
        label: 'API Key Required',
      }],
      rawResponse: null,
      error: 'no_api_key',
    });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });

    // Detect if this is a spreadsheet/document task
    const taskLower = task.toLowerCase();
    const isSpreadsheet = taskLower.includes('spreadsheet') || taskLower.includes('excel') ||
      taskLower.includes('xlsx') || taskLower.includes('workbook') || taskLower.includes('sheet');
    const isDocument = taskLower.includes('document') || taskLower.includes('docx') ||
      taskLower.includes('word') || taskLower.includes('pdf');

    // Build system prompt
    let systemPrompt = agent.purpose
      ? `${agent.purpose}\n\nYour name is ${agent.name}. Your role is ${agent.role}.`
      : `You are ${agent.name}, a ${agent.role} in an autonomous AI operating system.`;

    if (roomConfig?.systemPromptOverride) {
      systemPrompt = roomConfig.systemPromptOverride + '\n\n' + systemPrompt;
    }

    // Specialised instructions per task type
    if (isSpreadsheet) {
      systemPrompt += `\n\nFor spreadsheet tasks: provide a COMPLETE, detailed specification including:
- All tab names and their purpose
- Every column header with data types
- All formulas with exact syntax
- Sample data rows
- Design/formatting recommendations
- Instructions for the buyer
Make this thorough enough to build a real sellable product.`;
    }

    systemPrompt += `\n\nAlways respond with clear, well-structured, actionable output.`;

    // Build message content with attachments
    const messageContent: any[] = [];

    if (attachments?.length) {
      messageContent.push({
        type: 'text',
        text: `You have ${attachments.length} attached file(s):\n${attachments.map((a: any) => `- ${a.name} (${a.type})`).join('\n')}\n\n`,
      });
      for (const att of attachments) {
        if (att.type === 'image' && att.url?.startsWith('data:')) {
          const [header, data] = att.url.split(',');
          const mediaType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          messageContent.push({ type:'image', source:{ type:'base64', media_type:mediaType, data } });
        }
      }
    }

    messageContent.push({ type: 'text', text: task });

    const maxTokens = roomConfig?.maxTokens || 3000;

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

    const outputs: TaskOutput[] = [];
    const roleLower = (agent.role + ' ' + agent.name).toLowerCase();
    const fmt = roomConfig?.outputFormat;

    if (isSpreadsheet) {
      // Return the spec as text — client can trigger xlsx generation
      outputs.push({
        type: 'text',
        content: rawResponse,
        label: '📊 Spreadsheet Specification',
      });
      // Signal that this can be built into a real file
      outputs.push({
        type: 'file',
        content: JSON.stringify({ type: 'xlsx_spec', spec: rawResponse }),
        label: '⬇️ Generate .xlsx File',
      });
    } else if (isDocument) {
      outputs.push({ type: 'text', content: rawResponse, label: '📄 Document Output' });
    } else if (fmt === 'image' || roleLower.includes('media') || roleLower.includes('design')) {
      outputs.push({ type: 'text', content: rawResponse, label: '🎨 Creative Direction' });
    } else if (fmt === 'listing' || roleLower.includes('factory') || roleLower.includes('product')) {
      outputs.push({ type: 'listing', content: rawResponse, label: '🏭 Product Output' });
    } else {
      outputs.push({ type: 'text', content: rawResponse, label: `${agent.role} Output` });
    }

    return NextResponse.json({ outputs, rawResponse });
  } catch (e: any) {
    const msg = e?.message || 'Unknown error';
    const isAuth = msg.includes('401') || msg.includes('auth') || msg.includes('API key');
    return NextResponse.json({
      outputs: [{
        type: 'text',
        content: isAuth
          ? `❌ Invalid API key for ${agent.name}. Check agent settings in Guild Hall.`
          : `❌ Agent error: ${msg}`,
        label: 'Error',
      }],
      rawResponse: null,
      error: msg,
    }, { status: 200 }); // 200 so client handles it gracefully
  }
}