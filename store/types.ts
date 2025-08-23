// store/types.ts

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX';

export type Scoring = {
  ppr: 0 | 0.5 | 1;
  passTD: 4 | 6;
  passYdsPerPt: number;
  rushYdsPerPt: number;
  recYdsPerPt: number;
  bonuses?: Record<string, number>;
};

export type Roster = {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  Bench: number;
};

export type Player = {
  id: string;
  name: string;
  pos: 'QB' | 'RB' | 'WR' | 'TE';
  team: string;
  bye: number;
  baselinePts?: number;
  vor?: number;
  risk?: 'Low' | 'Med' | 'High';
};

export type ADPMap = Record<string, number>;

export type Team = {
  id: string;
  name: string;
  slot: number;
  isBot: boolean;
  strategy: string;
  userId?: string;
};

export type SessionConfig = {
  name: string;
  scoring: Scoring;
  roster: Roster;
  teams: Team[];
  order: number[];
  rounds: number;
  clockSec: number;
  format: 'snake' | 'linear' | 'auction';
};

export type Pick = {
  round: number;
  overall: number;
  teamId: string;
  playerId: string;
  madeBy: 'user' | 'bot' | 'commish';
};

export type DraftState = {
  sessionId: string;
  config: SessionConfig;
  players: Record<string, Player>;
  adp: ADPMap;
  drafted: Pick[];
  roster: Record<string, string[]>;
  queue: string[];
  targets: string[];
  selectedId?: string;
  currentPickOverall: number;
  datasetsMeta?: { adpAsOf?: string; metricsAsOf?: string };
  stateReady: boolean;

  // online/lobby state
  isOnline?: boolean;       // <- new
  myTeamId?: string;

  // offline timer state
  localPickStartedAt?: number;
};


