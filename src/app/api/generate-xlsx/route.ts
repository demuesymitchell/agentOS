import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { spec, apiKey } = await req.json();
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 400 });
  if (!spec || spec.length < 50) return NextResponse.json({ error: 'Spec too short' }, { status: 400 });

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: `Output ONLY valid JSON. No markdown. No explanation. Just JSON.
Schema: {"filename":"x.xlsx","sheets":[{"name":"Tab","colWidths":[20],"data":[["H1"],["v1"]]}]}
Keep each sheet to max 8 data rows. Close all brackets properly.`,
      messages: [{ role: 'user', content: `Build spreadsheet JSON for:\n${spec.slice(0,1500)}` }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const clean = raw.replace(/```json|```/g,'').trim();
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON in response');

    const workbook = JSON.parse(clean.slice(start, end + 1));
    if (!workbook?.sheets?.length) throw new Error('No sheets in workbook');

    return NextResponse.json({ ok: true, workbook });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}