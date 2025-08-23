// app/api/draft/auto/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * Auto-pick for whoever is on the clock.
 * Body: { sessionId: string, candidates: string[] }  // ordered by preference (ADP/bestList)
 */
export async function POST(req: NextRequest) {
  const { sessionId, candidates } = await req.json();

  if (!sessionId || !Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: 'Missing sessionId or candidates' }, { status: 400 });
  }

  // Load session
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Load teams
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('*')
    .eq('session_id', sessionId)
    .order('slot');
  if (tErr || !teams?.length) return NextResponse.json({ error: 'Teams not found' }, { status: 404 });

  // Determine on-clock team (snake)
  const teamCount = teams.length;
  const overall = session.current_pick ?? 1;
  const round = Math.ceil(overall / teamCount);
  const indexInRound = (overall - 1) % teamCount;

  const sortedSlots = teams.map((t) => t.slot).sort((a, b) => a - b);
  const slotsThisRound = round % 2 === 1 ? sortedSlots : [...sortedSlots].reverse();
  const onClockSlot = slotsThisRound[indexInRound];
  const onClockTeam = teams.find((t) => t.slot === onClockSlot);
  if (!onClockTeam) return NextResponse.json({ error: 'On-clock team not found' }, { status: 500 });

  // Already drafted
  const { data: draftedRows, error: dErr } = await supabase
    .from('picks')
    .select('player_id')
    .eq('session_id', sessionId);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  const taken = new Set((draftedRows ?? []).map((r) => r.player_id as string));

  // First available candidate
  const choice = candidates.find((id: string) => !taken.has(id));
  if (!choice) return NextResponse.json({ error: 'No available candidates' }, { status: 409 });

  // Insert pick as bot
  const { error: pErr } = await supabase.from('picks').insert({
    session_id: sessionId,
    round,
    overall,
    team_id: onClockTeam.id,
    player_id: choice,
    made_by: 'bot',
  });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Advance & reset clock
  const { error: uErr } = await supabase
    .from('sessions')
    .update({ current_pick: overall + 1, pick_started_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, picked: choice, teamId: onClockTeam.id, overall });
}

