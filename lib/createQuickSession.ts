// FILE: lib/createQuickSession.ts
'use client'
import { nanoid } from '@/utils/id'
import { DEFAULT_CONFIG } from '@/store/defaultConfig'
import PLAYERS from '../data/players.sample.json'
import ADP from '../data/adp.sample.json'


export async function createQuickSession(): Promise<string> {
const sessionId = nanoid()
const key = `draft-session:${sessionId}`
const state = {
sessionId,
config: DEFAULT_CONFIG,
players: PLAYERS,
adp: ADP,
drafted: [],
queue: [],
targets: [],
currentPickOverall: 1,
datasetsMeta: { adpAsOf: 'sample' }
}
localStorage.setItem(key, JSON.stringify(state))
return sessionId
}