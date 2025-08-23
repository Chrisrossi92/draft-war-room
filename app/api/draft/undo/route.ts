// app/api/draft/undo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  // last pick
  const { data: last } = await supabase
    .from('picks')
    .select('*')
    .eq('session_id', sessionId)
    .order('overall', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last) {
    // still restart the clock at current state
    await supabase.from('sessions').update({ pick_started_at: new Date().toISOString() }).eq('id', sessionId);
    return NextResponse.json({ ok: true });
  }

  const { error: delErr } = await supabase.from('picks').delete().eq('id', last.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const { error: sErr } = await supabase
    .from('sessions')
    .update({
      current_pick: last.overall,
      pick_started_at: new Date().toISOString()
    })
    .eq('id', sessionId);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, undone: last.overall });
}

