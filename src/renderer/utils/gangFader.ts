import type { FixtureChannel } from '../../shared/types'

function linkedChannels(channels: FixtureChannel[]): FixtureChannel[] {
  return channels.filter((ch) => ch.linked)
}

export function computeMasterValue(
  channels: FixtureChannel[],
  values: Record<string, number>
): number {
  const linked = linkedChannels(channels)
  if (linked.length === 0) return 0
  const sum = linked.reduce((acc, ch) => acc + (values[ch.id] ?? 0), 0)
  return Math.round(sum / linked.length)
}

export function applyMasterGang(
  channels: FixtureChannel[],
  values: Record<string, number>,
  newMaster: number
): Record<string, number> {
  const linked = linkedChannels(channels)
  const result = { ...values }
  if (linked.length === 0) return result

  const currentMaster = computeMasterValue(channels, values)

  if (currentMaster === 0) {
    const clamped = Math.min(255, Math.max(0, Math.round(newMaster)))
    for (const ch of linked) result[ch.id] = clamped
    return result
  }

  const rawRatio = newMaster / currentMaster
  // Find tightest ceiling — the ratio at which the highest channel hits 255
  const maxRatio = linked.reduce((min, ch) => {
    const v = values[ch.id] ?? 0
    if (v === 0) return min
    return Math.min(min, 255 / v)
  }, Infinity)

  const ratio = Math.min(rawRatio, maxRatio)

  for (const ch of linked) {
    result[ch.id] = Math.min(255, Math.max(0, Math.round((values[ch.id] ?? 0) * ratio)))
  }
  return result
}
