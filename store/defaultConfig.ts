// FILE: store/defaultConfig.ts
import { SessionConfig } from './types'
import { nanoid } from '@/utils/id'


export const DEFAULT_CONFIG: SessionConfig = {
name: 'Quick Draft',
scoring: { ppr: 1, passTD: 4, passYdsPerPt: 25, rushYdsPerPt: 10, recYdsPerPt: 10 },
roster: { QB:1, RB:2, WR:2, TE:1, FLEX:1, Bench:6 },
teams: Array.from({ length: 10 }, (_, i) => ({ id: nanoid(), name: `Team ${i+1}` , slot: i+1, isBot: i!==0, strategy: 'needAware' })),
order: [1,2,3,4,5,6,7,8,9,10],
rounds: 15,
clockSec: 60,
format: 'snake'
}