'use client';

import { create } from 'zustand';
import type { DraftState, Pick, Player, SessionConfig } from './types';

function emptyRoster(config: SessionConfig) {
  return {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    FLEX: [],
    Bench: [],
  } as Record<string, string[]>;
}

type Store = DraftState & {
  initFromLocal: (sessionId: string) => void;
  select: (id?: string) => void;
  draftToMe: (playerId: string) => void;
  markDraftedElsewhere: (playerId: string) => void;
  undoLastPick: () => void;
  queueAdd: (id: string) => void;
  queueRemove: (id: string) => void;
  setMyTeam: (teamId?: string) => void;
  setOnline: (v: boolean) => void;
};

export const useDraftStore = create<Store>((set, get) => {
  const persist = () => {
    const s = get();
    if (!s.sessionId || !s.config) return;
    const snap: DraftState = {
      sessionId: s.sessionId,
      config: s.config,
      players: s.players,
      adp: s.adp,
      drafted: s.drafted,
      roster: s.roster,
      queue: s.queue,
      targets: s.targets,
      selectedId: s.selectedId,
      currentPickOverall: s.currentPickOverall,
      datasetsMeta: s.datasetsMeta,
      stateReady: s.stateReady,
      isOnline: s.isOnline,               // persist
      myTeamId: s.myTeamId,
      localPickStartedAt: s.localPickStartedAt,
    };
    try { localStorage.setItem(`draft-session:${s.sessionId}`, JSON.stringify(snap)); } catch {}
  };

  return {
    // state
    sessionId: undefined,
    config: undefined,
    players: {},
    adp: {},
    drafted: [],
    roster: {},
    queue: [],
    targets: [],
    selectedId: undefined,
    currentPickOverall: 1,
    datasetsMeta: {},
    stateReady: false,
    isOnline: false,                      // default offline
    myTeamId: undefined,
    localPickStartedAt: Date.now(),

    // actions
    setOnline: (v: boolean) => { set({ isOnline: v }); persist(); },

    initFromLocal: (sessionId: string) => {
      const key = `draft-session:${sessionId}`;
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;

      if (!raw) {
        set({ sessionId, stateReady: true, isOnline: false, localPickStartedAt: Date.now() });
        return;
      }

      const parsed = JSON.parse(raw) as DraftState;

      const players: Record<string, Player> = {};
      const src = (parsed.players ?? {}) as any;
      if (Array.isArray(src)) src.forEach((p: any) => { if (p?.id) players[p.id] = p as Player; });
      else Object.values(src).forEach((p: any) => { if (p?.id) players[p.id] = p as Player; });

      const cfg = parsed.config;
      const roster = parsed.roster ?? (cfg ? emptyRoster(cfg) : {});

      set({
        sessionId,
        config: cfg,
        players,
        adp: parsed.adp ?? {},
        drafted: parsed.drafted ?? [],
        roster,
        queue: parsed.queue ?? [],
        targets: parsed.targets ?? [],
        selectedId: undefined,
        currentPickOverall: parsed.currentPickOverall ?? 1,
        datasetsMeta: parsed.datasetsMeta ?? {},
        stateReady: true,
        isOnline: parsed.isOnline ?? false,
        myTeamId: parsed.myTeamId,
        localPickStartedAt: parsed.localPickStartedAt ?? Date.now(),
      });
    },

    select: (id?: string) => set({ selectedId: id }),

    draftToMe: (playerId: string) => {
      const s = get();
      if (!s.config) return;
      const p = s.players[playerId];
      if (!p) return;

      const roster = { ...s.roster };
      const needs: Record<string, number> = {
        QB: s.config.roster.QB,
        RB: s.config.roster.RB,
        WR: s.config.roster.WR,
        TE: s.config.roster.TE,
        FLEX: s.config.roster.FLEX,
        Bench: s.config.roster.Bench,
      };
      const tryFill = (slot: string) => {
        const arr = roster[slot] ?? [];
        if (arr.length < needs[slot]) { roster[slot] = [...arr, playerId]; return true; }
        return false;
      };
      if (!tryFill(p.pos)) {
        if ((p.pos === 'RB' || p.pos === 'WR' || p.pos === 'TE') && tryFill('FLEX')) {}
        else { tryFill('Bench'); }
      }

      const teams = s.config.order.length || 10;
      const round = Math.ceil(s.currentPickOverall / teams);
      const newPick: Pick = { round, overall: s.currentPickOverall, teamId: 'me', playerId, madeBy: 'user' };

      set({
        roster,
        drafted: [...s.drafted, newPick],
        currentPickOverall: s.currentPickOverall + 1,
        localPickStartedAt: Date.now(),
      });
      persist();
    },

    markDraftedElsewhere: (playerId: string) => {
      const s = get();
      if (!s.config) return;

      const teams = s.config.order.length || 10;
      const round = Math.ceil(s.currentPickOverall / teams);
      const newPick: Pick = { round, overall: s.currentPickOverall, teamId: 'other', playerId, madeBy: 'commish' };

      set({
        drafted: [...s.drafted, newPick],
        currentPickOverall: s.currentPickOverall + 1,
        localPickStartedAt: Date.now(),
      });
      persist();
    },

    undoLastPick: () => {
      const s = get();
      if (s.drafted.length === 0) return;
      const last = s.drafted[s.drafted.length - 1];

      let roster = s.roster;
      if (last.teamId === 'me') {
        roster = Object.fromEntries(
          Object.entries(s.roster).map(([slot, list]) => [slot, list.filter((id) => id !== last.playerId)])
        );
      }

      set({
        drafted: s.drafted.slice(0, -1),
        currentPickOverall: Math.max(1, s.currentPickOverall - 1),
        roster,
        localPickStartedAt: Date.now(),
      });
      persist();
    },

    queueAdd: (id: string) => { const q = get().queue; if (q.includes(id)) return; set({ queue: [...q, id] }); persist(); },
    queueRemove: (id: string) => { set({ queue: get().queue.filter((x) => x !== id) }); persist(); },

    setMyTeam: (teamId?: string) => { set({ myTeamId: teamId }); persist(); },
  };
});



