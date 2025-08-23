'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDraftStore } from '@/store/useDraftStore';
import { survivability } from '@/lib/draft/survivability';

type TeamRow = { id: string; slot: number };

export default function SurvivabilityPanel({
  sessionId,
  selectedId,
}: {
  sessionId: string;
  selectedId?: string;
}) {
  const cfg = useDraftStore(s => s.config);
  const adpMap = useDraftStore(s => s.adp);
  const drafted = useDraftStore(s => s.drafted);
  const currentPick = useDraftStore(s => s.currentPickOverall);
  const myTeamId = useDraftStore(s => s.myTeamId);

  const [teams, setTeams] = useState<TeamRow[]>([]);

  // Load teams to infer my slot (online) else synthesize from config (offline)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cfg) return;
      // online?
      if (sessionId && cfg.name !== 'Quick Draft') {
        try {
          const res = await fetch(`/api/teams/list?sessionId=${sessionId}`, { cache: 'no-store' });
          const json = await res.json();
          if (!alive) return;
          const list: TeamRow[] = (json?.data ?? []).map((t: any) => ({ id: t.id, slot: t.slot }));
          list.sort((a,b)=>a.slot-b.slot);
          setTeams(list);
          return;
        } catch {/* ignore */}
      }
      // offline – synthesize from config
      const list = (cfg.teams ?? []).map(t => ({ id: t.id, slot: t.slot }))
        .sort((a,b)=>a.slot-b.slot);
      setTeams(list);
    })();
    return () => { alive = false; };
  }, [sessionId, cfg?.name]);

  // Derive my slot (default to 1 if unknown)
  const mySlot = useMemo(() => {
    if (!teams.length) return 1;
    if (myTeamId) {
      const found = teams.find(t => t.id === myTeamId);
      if (found) return found.slot;
    }
    // If not claimed yet: assume team 1 for a quick approximation
    return 1;
  }, [teams, myTeamId]);

  const takenIds = useMemo(()=> new Set(drafted.map(p => p.playerId)), [drafted]);
  const adp = selectedId ? adpMap[selectedId] : undefined;
  const totalTeams = teams.length || cfg?.order.length || 10;
  const rounds = cfg?.rounds ?? 15;

  const result = useMemo(() => {
    if (!selectedId) return null;
    const s = survivability({
      currentPickOverall: currentPick,
      totalTeams,
      mySlot,
      rounds,
      adp,
    });
    return s;
  }, [selectedId, currentPick, totalTeams, mySlot, rounds, adp]);

  const bar = (p: number) => {
    const pct = Math.round(p * 100);
    const color = p >= 0.7 ? 'bg-emerald-600' : p >= 0.4 ? 'bg-amber-500' : 'bg-red-600';
    return (
      <div className="w-full rounded-lg border border-zinc-800 p-2">
        <div className="mb-1 text-xs text-zinc-400">Chance he makes it back</div>
        <div className="relative h-2 w-full rounded bg-zinc-800">
          <div className={`absolute left-0 top-0 h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-xs text-zinc-400">{pct}%</div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-zinc-800">
      <div className="border-b border-zinc-800 p-3">
        <h3 className="font-semibold">Survivability</h3>
      </div>
      <div className="space-y-3 p-3 text-sm">
        {!selectedId && <div className="text-zinc-500">Select a player to see the odds.</div>}
        {selectedId && result && (
          <>
            <div className="text-xs text-zinc-400">
              Picks until your turn: <span className="font-semibold text-zinc-200">{result.picksUntil}</span>
              <span className="ml-2">• Next pick overall:</span> <span className="font-semibold text-zinc-200">{result.nextPickOverall}</span>
              {adp != null && (
                <>
                  <span className="ml-2">• ADP:</span> <span className="font-semibold text-zinc-200">{adp}</span>
                </>
              )}
            </div>
            {bar(result.probSurvive)}
            <div className="text-xs text-zinc-500">
              Rule of thumb: if ADP is well after your next pick, odds are high. Close calls (&lt; 15 picks difference) are risky.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
