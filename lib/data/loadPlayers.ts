export async function loadPlayersIntoStore() {
  const [playersRes, adpRes] = await Promise.all([
    fetch('/api/data/players', { cache: 'no-store' }),
    fetch('/api/data/adp', { cache: 'no-store' }),
  ]);

  const playersJson = await playersRes.json();
  const adpJson = await adpRes.json();

  const adpMap: Record<string, number> = {};
  for (const row of adpJson.players ?? []) {
    if (row.adp) adpMap[row.player_id] = row.adp;
  }

  const playersArr = (playersJson.players ?? []).map((p: any) => ({
    ...p,
    adp: adpMap[p.id] ?? Infinity,  // fallback if missing
  }));

  // sort here so store is always ADP-ordered
  playersArr.sort((a, b) => (a.adp ?? 9999) - (b.adp ?? 9999));

  const rec = Object.fromEntries(playersArr.map((p: any) => [p.id, p]));
  useDraftStore.setState({
    players: rec,
    adp: adpMap,
    datasetsMeta: { adpAsOf: adpJson.as_of ?? 'snapshot' },
  });

  return playersArr.length;
}


