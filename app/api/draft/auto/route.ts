// app/api/draft/auto/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { pickByNeed, desiredPositionForTeam } from '@/lib/bots/needAware';
import type { SessionConfig } from '@/store/types';

export async function POST(req: NextRequest) {
  const { sessionId, candidates } = await req.json();

  if (!sessionId || !Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: 'Missing sessionId or candidates' }, { status: 400 });
  }

  // Load session (for current_pick + config)
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const config = session.config as SessionConfig;

  // Load teams & picks
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('id, slot, is_bot')
    .eq('session_id', sessionId)
    .order('slot');
  if (tErr || !teams?.length) return NextResponse.json({ error: 'Teams not found' }, { status: 404 });

  const { data: picksRows, error: pListErr } = await supabase
    .from('picks')
    .select('team_id, player_id, overall')
    .eq('session_id', sessionId)
    .order('overall');
  if (pListErr) return NextResponse.json({ error: pListErr.message }, { status: 500 });

  // Determine on-clock team (snake)
  const teamCount = teams.length;
  const overall = session.current_pick ?? 1;
  const round = Math.ceil(overall / teamCount);
  const idx = (overall - 1) % teamCount;

  const sortedSlots = teams.map((t) => t.slot).sort((a, b) => a - b);
  const slotsThisRound = round % 2 === 1 ? sortedSlots : [...sortedSlots].reverse();
  const onClockSlot = slotsThisRound[idx];
  const onClockTeam = teams.find((t) => t.slot === onClockSlot);
  if (!onClockTeam) return NextResponse.json({ error: 'On-clock team not found' }, { status: 500 });

  // Build a minimal players map (pos only) from your candidates + already picked
  // We’ll infer from the frontend’s known players (sent separately in future), but for now
  // we’ll try to read from a cached snapshot table if you add one later.
  // For dev: infer pos by simple heuristics won’t work — so we expect the frontend’s candidate pool
  // to consist of IDs that match your store’s players when you compute BestAvailable.
  // To keep need-aware working now, accept a `positions` hint array if you want in future.
  // -----
  // For now we’ll require the frontend to keep /api/draft/auto aligned by sending candidates for the
  // desired position first. Since we already changed the client to send ADP-ordered IDs,
  // we’ll do a DB-free need-aware using a players payload from config. If not available, fallback to ADP.

  // Try to find a player position map inside session.config (optional future hook)
  const playersFromConfig = (config as any)?.__players ?? {};
  const players: Record<string, { id: string; pos: 'QB'|'RB'|'WR'|'TE' }> = playersFromConfig;

  // If we don't have positions, fall back to ADP-only (original behavior)
  const havePositions = Object.keys(players).length > 0;

  let choiceId: string | null = null;

  if (havePositions) {
    const desiredPos = desiredPositionForTeam({
      teamId: onClockTeam.id,
      teamPicks: picksRows ?? [],
      players,
      config,
    });

    choiceId = pickByNeed(desiredPos as any, candidates, players);
  }

  // Fallback to best available (ADP) if we couldn't compute positions
  if (!choiceId) {
    choiceId = candidates[0];
  }

  // Insert pick
  const { error: pickErr } = await supabase.from('picks').insert({
    session_id: sessionId,
    round,
    overall,
    team_id: onClockTeam.id,
    player_id: choiceId,
    made_by: 'bot',
  });
  if (pickErr) return NextResponse.json({ error: pickErr.message }, { status: 500 });

  // Advance pointer and reset clock
  const { error: uErr } = await supabase
    .from('sessions')
    .update({ current_pick: overall + 1, pick_started_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, picked: choiceId, teamId: onClockTeam.id, overall });
}


