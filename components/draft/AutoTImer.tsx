// components/draft/AutoTimer.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDraftStore } from '@/store/useDraftStore';
import { getOrCreateClaimToken } from '@/lib/claimToken';

type TeamRow = {
  id: string;
  slot: number;
  is_bot: boolean;
  claimed_token: string | null;
};

export default function AutoTimer({
  sessionId,
  bestCandidates,
  autoClaimed = false,   // allow auto for claimed-by-others too (commissioner mode)
  claimedGraceSec = 0,   // extra seconds after 0 before we auto for claimed teams
}: {
  sessionId: string;
  bestCandidates: string[];
  autoClaimed?: boolean;
  claimedGraceSec?: number;
}) {
  const cfg = useDraftStore((s) => s.config);
  const isOnline = useDraftStore((s) => s.isOnline);
  const pick = useDraftStore((s) => s.currentPickOverall);

  const [pickStartedAt, setPickStartedAt] = useState<number | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const firedForPick = useRef<number | null>(null);

  const myToken = typeof window !== 'undefined' ? getOrCreateClaimToken(sessionId) : '';

  // Poll session clock every 1s (NO CACHE)
  useEffect(() => {
    if (!isOnline) return;
    let alive = true;

    const refresh = async () => {
      try {
        const res = await fetch(`/api/session/get?sessionId=${sessionId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (!alive) return;
        const ts = json?.data?.pick_started_at
          ? new Date(json.data.pick_started_at).getTime()
          : null;
        setPickStartedAt(ts);
      } catch {}
    };

    refresh();
    const t = setInterval(refresh, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [isOnline, sessionId]);

  // Load teams once (NO CACHE)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/teams/list?sessionId=${sessionId}`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        const list: TeamRow[] = (json?.data ?? []).map((t: any) => ({
          id: t.id,
          slot: t.slot,
          is_bot: !!t.is_bot,
          claimed_token: t.claimed_token ?? null,
        }));
        setTeams(list);
      } catch {}
    };
    load();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // Compute the on-clock team (snake)
  const onClock = useMemo(() => {
    if (!cfg || !teams.length || !pick) return null;
    const n = teams.length;
    const round = Math.ceil(pick / n);
    const idx = (pick - 1) % n;
    const sorted = [...teams].map((t) => t.slot).sort((a, b) => a - b);
    const slotsThisRound = round % 2 === 1 ? sorted : [...sorted].reverse();
    const slot = slotsThisRound[idx];
    return teams.find((t) => t.slot === slot) ?? null;
  }, [cfg, teams, pick]);

  // Seconds left (server clock)
  const timeLeft = useMemo(() => {
    const total = cfg?.clockSec ?? 60;
    if (!pickStartedAt) return total;
    const elapsed = Math.max(0, Math.floor((Date.now() - pickStartedAt) / 1000));
    return Math.max(0, total - elapsed);
  }, [cfg?.clockSec, pickStartedAt]);

  // Auto-pick:
  //  - bots: at timeLeft <= 0
  //  - unclaimed: at timeLeft <= 0
  //  - claimed-by-me: at timeLeft <= 0 (solo)
  //  - claimed-by-others: at timeLeft <= -grace (only if autoClaimed = true)
  useEffect(() => {
    if (!isOnline) return;
    if (!onClock) return;
    if (bestCandidates.length === 0) return;

    const isMine = !!onClock.claimed_token && onClock.claimed_token === myToken;
    const isUnclaimed = !onClock.claimed_token;
    const isBot = onClock.is_bot;

    const allowClaimedOthers = autoClaimed && (timeLeft <= 0 - Math.max(0, claimedGraceSec));
    const allowAtZero = isBot || isUnclaimed || isMine;

    // fire when:
    if (!( (allowAtZero && timeLeft <= 0) || allowClaimedOthers )) return;

    if (firedForPick.current === pick) return; // already fired for this pick

    (async () => {
      try {
        const res = await fetch('/api/draft/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, candidates: bestCandidates }),
          cache: 'no-store',
        });

        // Latch regardless to avoid spamming the server for the same pick
        firedForPick.current = pick;

        if (res.ok) {
          // Optimistic nudge
          const data = await res.json().catch(() => ({} as any));
          const st = useDraftStore.getState();
          const overall = st.currentPickOverall;
          const n = (st.config?.order?.length ?? teams.length) || 10;
          const round = Math.ceil(overall / n);
          const playerId = data?.picked ?? bestCandidates[0];
          const teamId = data?.teamId ?? onClock.id;

          useDraftStore.setState({
            drafted: [...st.drafted, { round, overall, teamId, playerId, madeBy: 'bot' as const }],
            currentPickOverall: overall + 1,
          });
        } else {
          // if server failed, allow retry on next poll
          setTimeout(() => (firedForPick.current = null), 1200);
        }
      } catch {
        firedForPick.current = null;
      }
    })();
  }, [isOnline, onClock, timeLeft, bestCandidates, sessionId, pick, myToken, autoClaimed, claimedGraceSec, teams.length]);

  // Reset latch whenever the pick changes (from realtime or optimistic)
  useEffect(() => {
    firedForPick.current = null;
  }, [pick]);

  return null;
}





