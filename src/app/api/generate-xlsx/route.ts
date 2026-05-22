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
      system: `You are a spreadsheet data generator. Given a specification, output ONLY a valid JSON object.
No markdown, no code fences, no explanation — just raw JSON starting with { and ending with }.

Required format:
{
  "filename": "Wedding_Planner.xlsx",
  "sheets": [
    {
      "name": "Dashboard",
      "colWidths": [25, 20, 15],
      "data": [
        ["Header 1", "Header 2", "Header 3"],
        ["Value", "Value", "=SUM(B2:B10)"]
      ]
    }
  ]
}

Rules:
- Every sheet needs name, colWidths array, and data array
- data is array of rows, each row is array of strings/numbers
- Formulas start with = 
- Sheet names max 31 characters
- Include ALL tabs mentioned in the spec with real headers and 3-5 sample data rows`,
      messages: [{ role: 'user', content: `Generate spreadsheet JSON for this spec:\n\n${spec.slice(0, 3000)}` }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();

    // Find the JSON object — look for first { and last }
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON found in response');

    const jsonStr = clean.slice(start, end + 1);
    const workbook = JSON.parse(jsonStr);

    if (!workbook.sheets || !Array.isArray(workbook.sheets)) {
      throw new Error('Invalid workbook structure — no sheets array');
    }

    return NextResponse.json({ ok: true, workbook });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}