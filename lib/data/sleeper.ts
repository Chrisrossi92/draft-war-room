// lib/data/sleeper.ts
type SleeperPlayer = {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  fantasy_positions?: string[];
  team?: string | null;
  active?: boolean;             // <- use this as the truth
  status?: string | null;       // 'Active','Inactive','Retired','IR',...
  bye_week?: number | null;
};

export type NormalizedPlayer = {
  id: string;
  name: string;
  pos: 'QB'|'RB'|'WR'|'TE';
  team: string;
  bye: number | null;
};

const POS = new Set(['QB','RB','WR','TE']);
const NFL_TEAMS = new Set([
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET',
  'GB','HOU','IND','JAX','KC','LV','LAC','LAR','MIA','MIN','NE','NO',
  'NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS',
]);

function normalizeTeam(t?: string | null) {
  const x = (t ?? '').toUpperCase();
  return NFL_TEAMS.has(x) ? x : '';
}
function isGoodStatus(s?: string | null) {
  if (!s) return true;
  const x = s.toLowerCase();
  if (x.includes('retire')) return false;
  return true;
}

export async function fetchSleeperPlayers(): Promise<NormalizedPlayer[]> {
  const res = await fetch('https://api.sleeper.app/v1/players/nfl', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sleeper players fetch failed: ${res.status}`);

  const raw = (await res.json()) as Record<string, SleeperPlayer>;
  const out: NormalizedPlayer[] = [];

  for (const k of Object.keys(raw)) {
    const p = raw[k];

    // **Current, rostered skill positions only**
    const pos = (p.position || p.fantasy_positions?.[0] || '').toUpperCase();
    if (!POS.has(pos)) continue;

    const team = normalizeTeam(p.team);
    if (!team) continue;

    // Require active true; this drops retirees & historical records
    if (!p.active) continue;
    if (!isGoodStatus(p.status)) continue;

    const name = (p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()).trim();
    if (!name) continue;

    out.push({ id: p.player_id, name, pos: pos as any, team, bye: p.bye_week ?? null });
  }

  const seen = new Set<string>();
  const dedup = out.filter(pl => (seen.has(pl.id) ? false : (seen.add(pl.id), true)));
  return dedup.sort((a,b) => a.name.localeCompare(b.name));
}

export async function fetchSleeperADP(): Promise<Record<string, number>> {
  try {
    const year = new Date().getFullYear();
    const url = `https://api.sleeper.app/v1/adp/nfl/${year}?season_type=regular&format=redraft`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{ player_id: string; adp: number }>;
    const map: Record<string, number> = {};
    for (const r of rows) if (typeof r.adp === 'number' && isFinite(r.adp)) map[r.player_id] = r.adp;
    return map;
  } catch { return {}; }
}



