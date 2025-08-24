// lib/bots/needAware.ts
import type { SessionConfig } from "@/store/types";

/**
 * Determine the next position the team on the clock should prefer,
 * given current picks and session config (starters first, then FLEX, then bench).
 */
export function desiredPositionForTeam(opts: {
  teamId: string;
  teamPicks: Array<{ team_id: string; player_id: string }>;
  players: Record<string, { id: string; pos: "QB"|"RB"|"WR"|"TE" }>;
  config: SessionConfig;
}) {
  const { teamId, teamPicks, players, config } = opts;

  // Count how many of each position this team already has
  const have = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, Bench: 0 } as Record<string, number>;

  for (const p of teamPicks) {
    if (p.team_id !== teamId) continue;
    const pl = players[p.player_id];
    if (!pl) continue;

    // Fill core positions first
    if (pl.pos === "QB") have.QB++;
    if (pl.pos === "RB") have.RB++;
    if (pl.pos === "WR") have.WR++;
    if (pl.pos === "TE") have.TE++;

    // We don’t explicitly store FLEX vs Bench in DB, so we’ll compute needs against config below.
  }

  // Starter needs from config
  const need = {
    QB: Math.max(0, config.roster.QB - have.QB),
    RB: Math.max(0, config.roster.RB - have.RB),
    WR: Math.max(0, config.roster.WR - have.WR),
    TE: Math.max(0, config.roster.TE - have.TE),
  };

  // If any starter slot is unfilled, prioritize that slot (stable order: RB, WR, QB, TE)
  const orderedStarters: Array<"RB" | "WR" | "QB" | "TE"> = ["RB", "WR", "QB", "TE"];
  for (const pos of orderedStarters) {
    if (need[pos] > 0) return pos;
  }

  // Next, FLEX: if RB/WR/TE combined starters are done but FLEX slots remain, prefer the thinnest of RB/WR/TE
  const flexNeed = config.roster.FLEX;
  if (flexNeed > 0) {
    // Approximate how many FLEX-eligible we have beyond starters
    const flexEligibleCount = Math.max(0, have.RB - config.roster.RB)
      + Math.max(0, have.WR - config.roster.WR)
      + Math.max(0, have.TE - config.roster.TE);

    if (flexEligibleCount < flexNeed) {
      // choose the currently thinnest among RB/WR/TE
      const depths = [
        ["RB", have.RB / Math.max(1, config.roster.RB)] as const,
        ["WR", have.WR / Math.max(1, config.roster.WR)] as const,
        ["TE", have.TE / Math.max(1, config.roster.TE)] as const,
      ].sort((a, b) => a[1] - b[1]);

      return depths[0][0] as "RB" | "WR" | "TE";
    }
  }

  // Otherwise, Bench: pick the best value (ADP) at RB/WR/TE/QB in that rough priority
  return "RB";
}

/**
 * Given an ordered list of candidate IDs (by ADP ascending),
 * choose the first that matches the desired position; if none, return the top overall.
 */
export function pickByNeed(
  desiredPos: "QB" | "RB" | "WR" | "TE",
  candidatesOrderedByAdp: string[],
  players: Record<string, { id: string; pos: "QB"|"RB"|"WR"|"TE" }>
) {
  for (const id of candidatesOrderedByAdp) {
    const pl = players[id];
    if (pl?.pos === desiredPos) return id;
  }
  // If no exact match, try FLEX-eligible if desired was FLEX-ish (RB/WR/TE logic is handled before we get here)
  if (desiredPos === "RB" || desiredPos === "WR" || desiredPos === "TE") {
    for (const id of candidatesOrderedByAdp) {
      const pl = players[id];
      if (pl && (pl.pos === "RB" || pl.pos === "WR" || pl.pos === "TE")) return id;
    }
  }
  // Fallback to best overall
  return candidatesOrderedByAdp[0] ?? null;
}
