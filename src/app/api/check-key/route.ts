import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ valid:false, missing:true });
  // Quick format check — don't make an actual API call
  const looks_valid = key.startsWith('sk-ant-') && key.length > 20;
  return NextResponse.json({ valid:looks_valid, missing:false });
}