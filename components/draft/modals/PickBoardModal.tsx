'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDraftStore } from '@/store/useDraftStore';

type TeamRow = { id: string; name: string; slot: number };
type PickRow = { round: number; overall: number; team_id: string; player_id: string; made_by: string };

export default function PickBoardModal({
  sessionId,
  open,
  onClose,
  onForcePick, // (teamId, playerId) => void
}: {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  onForcePick: (teamId: string, playerId: string) => void;
}) {
  const cfg = useDraftStore(s => s.config);
  const players = useDraftStore(s => s.players);
  const drafted = useDraftStore(s => s.drafted);
  const [remotePicks, setRemotePicks] = useState<PickRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [filter, setFilter] = useState('');

  // hydrate teams
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/teams/list?sessionId=${sessionId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!alive) return;
      const list: TeamRow[] = (json?.data ?? []).map((t: any) => ({ id: t.id, name: t.name, slot: t.slot }));
      // order by slot (1..N)
      list.sort((a, b) => a.slot - b.slot);
      setTeams(list);
    })();
    return () => { alive = false; };
  }, [sessionId]);

  // hydrate picks (server is truth; we also merge in local optimistic)
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/picks/list?sessionId=${sessionId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!alive) return;
      const base: PickRow[] = json?.data ?? [];
      // merge local optimistic (if any)
      if (drafted?.length) {
        const merged = [...base];
        const seen = new Set(merged.map(p => p.overall));
        drafted.forEach(loc => {
          if (!seen.has(loc.overall)) {
            merged.push({
              round: loc.round,
              overall: loc.overall,
              team_id: loc.teamId,
              player_id: loc.playerId,
              made_by: loc.madeBy,
            });
          }
        });
        merged.sort((a, b) => a.overall - b.overall);
        setRemotePicks(merged);
      } else {
        setRemotePicks(base);
      }
    })();
  }, [sessionId, drafted]);

  // build a grid r x n (rounds × teams) → cells show player label or empty
  const grid = useMemo(() => {
    if (!cfg || !teams.length) return [];
    const n = teams.length;
    const rounds = cfg.rounds ?? 15;
    // map overall -> pick
    const byOverall = new Map<number, PickRow>();
    remotePicks.forEach(p => byOverall.set(p.overall, p));

    const rows: Array<Array<{
      cellOverall: number;
      teamId: string;
      playerId?: string;
      label?: string;
    }>> = [];

    for (let r = 1; r <= rounds; r++) {
      const row: any[] = [];
      const order = r % 2 === 1
        ? teams.map(t => t)
        : [...teams].reverse();

      order.forEach((t, idx) => {
        const overall = (r - 1) * n + (idx + 1);
        const found = byOverall.get(overall);
        const pid = found?.player_id;
        const label = pid ? `${players[pid]?.name ?? pid}` : '';
        row.push({ cellOverall: overall, teamId: t.id, playerId: pid, label });
      });

      rows.push(row);
    }

    return rows;
  }, [cfg, teams, remotePicks, players]);

  const matchesFilter = (name?: string) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return (name ?? '').toLowerCase().includes(f);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 p-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Draft Board</h3>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter player names…"
              className="w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <button onClick={onClose} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
            Close
          </button>
        </div>

        <div className="overflow-auto p-3">
          {/* Header row with team names */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-950 p-2 text-left text-xs text-zinc-400">Round</th>
                {teams.map(t => (
                  <th key={t.id} className="min-w-40 p-2 text-left text-xs text-zinc-400">
                    {t.slot}. {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, rIdx) => (
                <tr key={`r-${rIdx}`}>
                  <td className="sticky left-0 z-10 bg-zinc-950 p-2 text-xs text-zinc-400">
                    {rIdx + 1}
                  </td>
                  {row.map(cell => {
                    const taken = !!cell.playerId;
                    const label = cell.label;
                    const canForce = !taken; // only force if empty
                    return (
                      <td key={cell.cellOverall} className="p-1 align-top">
                        <div className="min-h-[54px] rounded-lg border border-zinc-800 p-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-zinc-500">#{cell.cellOverall}</div>
                            {canForce && (
                              <button
                                onClick={() => {
                                  // pick first filtered candidate
                                  const cand = bestFilteredCandidate(players, matchesFilter, bestCandidatesFromStore());
                                  if (!cand) return alert('No candidate to force pick.');
                                  onForcePick(cell.teamId, cand);
                                }}
                                className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] hover:bg-zinc-700"
                                title="Force pick best candidate"
                              >
                                Force
                              </button>
                            )}
                          </div>
                          <div className="mt-1 text-sm">
                            {taken ? (matchesFilter(label) ? label : <span className="text-zinc-600">{label}</span>) : <span className="text-zinc-600">—</span>}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-800 p-3 text-xs text-zinc-500">
          Tip: use the filter box to search by player name. “Force” picks the top matching candidate from Best Available.
        </div>
      </div>
    </div>
  );

  // reads from store to get the current best-available IDs (ordered)
  function bestCandidatesFromStore(): string[] {
    const st = useDraftStore.getState();
    const taken = new Set(st.drafted.map(p => p.playerId));
    return Object.values(st.players)
      .filter(p => !taken.has(p.id))
      .sort((a, b) => (st.adp[a.id] ?? 9999) - (st.adp[b.id] ?? 9999))
      .map(p => p.id);
  }

  function bestFilteredCandidate(
    pl: Record<string, { id: string; name: string }>,
    predicate: (name?: string) => boolean,
    orderedIds: string[]
  ): string | null {
    for (const id of orderedIds) {
      const name = pl[id]?.name;
      if (predicate(name)) return id;
    }
    return orderedIds[0] ?? null;
  }
}
