export function exportCsv(
  drafted: { round:number; overall:number; teamId:string; playerId:string }[],
  players: Record<string, { id:string; name:string; pos:string }>,
  filename: string
) {
  const header = 'team,round,overall,playerId,playerName,position'
  const rows = drafted.map(p => {
    const pl = players[p.playerId]
    return `${p.teamId},${p.round},${p.overall},${p.playerId},"${pl?.name ?? ''}",${pl?.pos ?? ''}`
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-draft.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
