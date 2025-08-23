import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const slot = Number(searchParams.get('slot') || '1');

  if (!sessionId || !slot) {
    return NextResponse.json({ error: 'Missing sessionId or slot' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('session_id', sessionId)
    .eq('slot', slot)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'team not found' }, { status: 404 });
  return NextResponse.json({ data });
}
