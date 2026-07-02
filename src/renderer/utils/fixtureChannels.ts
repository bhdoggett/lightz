import type { Fixture } from '../../shared/types'

export function getUsedChannels(fixtures: Fixture[], universe: 0 | 1, excludeId?: string): Set<number> {
  const used = new Set<number>()
  for (const f of fixtures) {
    if (f.id === excludeId) continue
    if (f.channels) {
      for (const c of f.channels) {
        if (c.universe === universe) used.add(c.channel)
      }
    } else if (f.universe === universe) {
      used.add(f.channel)
    }
  }
  return used
}

export function isStartChannelAvailable(start: number, count: number, used: Set<number>): boolean {
  if (start + count - 1 > 512) return false
  for (let c = start; c < start + count; c++) {
    if (used.has(c)) return false
  }
  return true
}
