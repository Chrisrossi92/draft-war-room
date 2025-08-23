// FILE: utils/id.ts
export function nanoid(len = 12) {
const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
let out = ''
const cryptoObj = typeof crypto !== 'undefined' ? crypto : (global as any).crypto
for (let i = 0; i < len; i++) {
const idx = Math.floor(((cryptoObj?.getRandomValues?.(new Uint32Array(1))[0] ?? Math.random()*1e9) / 0xffffffff) * chars.length)
out += chars[idx] ?? '0'
}
return out
}