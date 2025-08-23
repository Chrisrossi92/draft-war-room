// app/api/draft/pick/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { sessionId, teamId, playerId, token } = await req.json();
  if (!sessionId || !teamId || !playerId || !token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // session + teams
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('*')
    .eq('session_id', sessionId)
    .order('slot');
  if (tErr || !teams?.length) return NextResponse.json({ error: 'Teams not found' }, { status: 404 });

  // token / claim check
  const myTeam = teams.find((t) => t.id === teamId);
  if (!myTeam) return NextResponse.json({ error: 'Team not in session' }, { status: 400 });
  if (!myTeam.claimed_token) return NextResponse.json({ error: 'Team not yet claimed' }, { status: 403 });
  if (myTeam.claimed_token !== token) return NextResponse.json({ error: 'You have not claimed this team' }, { status: 403 });

  // whose turn?
  const teamCount = teams.length;
  const overall = session.current_pick ?? 1;
  const round = Math.ceil(overall / teamCount);
  const indexInRound = (overall - 1) % teamCount;

  const sortedSlots = teams.map((t) => t.slot).sort((a, b) => a - b);
  const slotsThisRound = round % 2 === 1 ? sortedSlots : [...sortedSlots].reverse();
  const onClockSlot = slotsThisRound[indexInRound];
  const onClockTeam = teams.find((t) => t.slot === onClockSlot);

  if (!onClockTeam || onClockTeam.id !== teamId) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 409 });
  }

  // insert pick
  const { error: pErr } = await supabase.from('picks').insert({
    session_id: sessionId,
    round,
    overall,
    team_id: teamId,
    player_id: playerId,
    made_by: 'user',
  });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // advance and restart clock
  const { error: uErr } = await supabase
    .from('sessions')
    .update({
      current_pick: overall + 1,
      pick_started_at: new Date().toISOString()
    })
    .eq('id', sessionId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}


