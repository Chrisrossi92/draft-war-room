// app/api/lobby/create/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { nanoid } from '@/utils/id';
import { DEFAULT_CONFIG } from '@/store/defaultConfig';

export async function POST() {
  // 1) create lobby
  const code = nanoid(8);
  const { data: lobby, error: lErr } = await supabase
    .from('lobbies')
    .insert({ code, name: 'Lobby' })
    .select()
    .single();
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  // Use DEFAULT_CONFIG but override name so the UI isn't confused
  const LOBBY_CONFIG = { ...DEFAULT_CONFIG, name: 'Lobby Draft' };

  // 2) create session (start clock now)
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .insert({
      lobby_id: lobby.id,
      config: LOBBY_CONFIG,
      status: 'live',
      current_pick: 1,
      pick_started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // 3) seed teams
  const teamsPayload = LOBBY_CONFIG.teams.map((t) => ({
    session_id: session.id,
    slot: t.slot,
    name: t.name,
    is_bot: t.isBot,
    strategy: t.strategy,
  }));
  const { error: tErr } = await supabase.from('teams').insert(teamsPayload);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const joinUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/draft/${session.id}`;
  return NextResponse.json({ lobbyId: lobby.id, sessionId: session.id, code, joinUrl });
}


