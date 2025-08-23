// lib/draft/survivability.ts
export type SurvivabilityInput = {
  currentPickOverall: number;
  totalTeams: number;
  mySlot: number;               // 1..N
  rounds: number;               // total rounds
  adp: number | undefined;      // player's ADP (overall)
};

/**
 * Returns:
 *  - picksUntil: number of other picks before your next turn
 *  - nextPickOverall: your next pick overall index
 *  - probSurvive: probability (0..1) the player survives until your turn
 * Heuristic: model probability a player goes before x as logistic around ADP.
 */
export function survivability({
  currentPickOverall,
  totalTeams,
  mySlot,
  rounds,
  adp,
}: SurvivabilityInput) {
  const picksUntil = picksUntilMyTurn(currentPickOverall, totalTeams, mySlot, rounds);
  const nextPickOverall = currentPickOverall + picksUntil;

  // No ADP? Just baseline: deeper picks have lower survival
  if (adp == null || !isFinite(adp)) {
    const base = Math.max(0, 1 - picksUntil / (2 * totalTeams));
    return { picksUntil, nextPickOverall, probSurvive: clamp01(base) };
  }

  // Logistic model around ADP with a "spread" ≈ 8 picks
  const k = 0.7;               // steepness
  const spread = 8;            // softness around ADP (tune to taste)
  const x = (nextPickOverall - adp) / spread;

  // Probability still available at your turn:
  // If nextPick << ADP → high survival; if >> ADP → low survival.
  const probSurvive = 1 / (1 + Math.exp(-k * x));

  return { picksUntil, nextPickOverall, probSurvive: clamp01(probSurvive) };
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

/** How many picks between now and your next turn (excludes your current move) */
function picksUntilMyTurn(currentOverall: number, teams: number, mySlot: number, rounds: number) {
  if (teams <= 1) return 0;

  const round = Math.ceil(currentOverall / teams);
  const indexInRound = (currentOverall - 1) % teams; // 0-based
  const forward = teams - indexInRound - 1;          // picks remaining in this round after current

  // Who picks at the end of current round?
  // Next round is reversed (snake).
  const nextRound = round + 1;
  if (nextRound > rounds) return forward; // draft almost done

  // Where is my pick in next round?
  const myIndexNextRound = (nextRound % 2 === 1)
    ? (mySlot - 1)
    : (teams - mySlot);

  // Total until my next pick = remaining in current round + index of me in next round
  return forward + myIndexNextRound + 1; // +1 because next round starts at index 0
}
