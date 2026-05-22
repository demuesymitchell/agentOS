import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { spec, apiKey } = await req.json();
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 400 });

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: `You are a spreadsheet generator. Output ONLY valid JSON for an Excel workbook.
Format:
{
  "filename": "filename.xlsx",
  "sheets": [
    {
      "name": "Sheet Name",
      "data": [
        ["Header1", "Header2", "Header3"],
        ["value", "value", "=SUM(A2:A10)"]
      ],
      "colWidths": [20, 15, 30]
    }
  ]
}
- Formulas start with =
- Include ALL tabs from the spec with real data
- Make it production-ready quality for an Etsy product
- Output ONLY JSON, no markdown, no explanation`,
      messages: [{ role: 'user', content: `Generate complete spreadsheet JSON for:\n\n${spec}` }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const clean = text.replace(/```json|```/g, '').trim();
    const workbook = JSON.parse(clean);
    return NextResponse.json({ ok: true, workbook });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}