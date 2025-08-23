// components/draft/TopBar.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDraftStore } from '@/store/useDraftStore';
import TimerRing from '@/components/draft/TimerRing';

type TeamRow = { id: string; name: string; slot: number };

export default function TopBar() {
  const cfg = useDraftStore((s) => s.config);
  const pick = useDraftStore((s) => s.currentPickOverall);
  const sessionId = useDraftStore((s) => s.sessionId);
  const isOnline = useDraftStore((s) => s.isOnline);
  const localPickStartedAt = useDraftStore((s) => s.localPickStartedAt);

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [serverPickStartedAt, setServerPickStartedAt] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Fetch pick_started_at periodically for ONLINE sessions
  useEffect(() => {
    if (!isOnline) {
      setServerPickStartedAt(null);
      return;
    }
    let alive = true;

    async function refresh() {
      if (!sessionId) return;
      try {
        const res = await fetch(`/api/session/get?sessionId=${sessionId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!alive) return;
        setServerPickStartedAt(json?.data?.pick_started_at ?? null);
      } catch {
        /* ignore fetch errors while typing */
      }
    }

    refresh();
    const t = setInterval(refresh, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [isOnline, sessionId]);

  // Load teams (DB for online, synth from config for offline)
  useEffect(() => {
    let alive = true;

    async function loadTeams() {
      if (!sessionId) return;
      const res = await fetch(`/api/teams/list?sessionId=${sessionId}`);
      const json = await res.json();
      if (!alive) return;
      const list = (json?.data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        slot: t.slot,
      })) as TeamRow[];
      setTeams(list);
    }

    if (!isOnline && cfg) {
      const list = (cfg.teams || []).map((t) => ({ id: t.id, name: t.name, slot: t.slot }));
      setTeams(list);
      return;
    }

    loadTeams();
    return () => {
      alive = false;
    };
  }, [isOnline, sessionId, cfg]);

  // One-second heartbeat for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Compute who is on the clock (snake)
  const onClock = useMemo(() => {
    if (!cfg || !teams.length || !pick) return { slot: undefined as number | undefined, name: undefined as string | undefined, round: 1 };
    const n = teams.length;
    const round = Math.ceil(pick / n);
    const idx = (pick - 1) % n;

    const sorted = [...teams].map((t) => t.slot).sort((a, b) => a - b);
    const slotsThisRound = round % 2 === 1 ? sorted : [...sorted].reverse();
    const slot = slotsThisRound[idx];
    const name = teams.find((t) => t.slot === slot)?.name;
    return { slot, name, round };
  }, [cfg, teams, pick]);

  // Time left (server for online, local for offline)
  const total = cfg?.clockSec ?? 60;
  const timeLeft = useMemo(() => {
    const ts = isOnline
      ? (serverPickStartedAt ? new Date(serverPickStartedAt).getTime() : null)
      : (localPickStartedAt ?? null);
    if (!ts) return total;
    const elapsed = Math.max(0, Math.floor((now - ts) / 1000));
    return Math.max(0, total - elapsed);
  }, [isOnline, serverPickStartedAt, localPickStartedAt, now, total]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 p-3">
      <div>
        <div className="text-sm text-zinc-400">Session</div>
        <div className="text-lg font-semibold">{cfg?.name ?? 'Draft'}</div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="text-sm">
          Round <span className="font-semibold">{onClock.round}</span> • Overall Pick{' '}
          <span className="font-semibold">{pick}</span>
        </div>

        <div className="text-sm">
          On the clock:{' '}
          <span className="font-semibold">
            {onClock.name ? `Slot ${onClock.slot} — ${onClock.name}` : '—'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TimerRing remaining={timeLeft} total={total} size={40} />
          <span className="text-xs text-zinc-500">{isOnline ? 'online' : 'offline'}</span>
        </div>
      </div>
    </div>
  );
}








