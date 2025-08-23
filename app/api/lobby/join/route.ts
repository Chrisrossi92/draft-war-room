import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { code, teamName } = await req.json();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const { data: lobby, error: lErr } = await supabase
    .from('lobbies')
    .select('*')
    .eq('code', code)
    .single();
  if (lErr || !lobby) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('lobby_id', lobby.id)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Session missing' }, { status: 404 });

  // Optionally add/rename a user-controlled team here (skipped for Phase 2)
  return NextResponse.json({ sessionId: session.id });
}
