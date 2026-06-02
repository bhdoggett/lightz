import DMX from 'dmx'
import type { DmxStatus } from '../src/shared/types'

type UniverseState = Record<number, number>

export class DmxManager {
  private dmx: InstanceType<typeof DMX> | null = null
  private universes: [UniverseState, UniverseState] = [{}, {}]
  private fadeInterval: ReturnType<typeof setInterval> | null = null
  private status: DmxStatus = 'disconnected'
  private onStatusChange?: (status: DmxStatus) => void

  connect(devicePath: string, onStatus: (s: DmxStatus) => void): void {
    this.onStatusChange = onStatus
    try {
      this.dmx = new DMX()
      this.dmx.addUniverse('universe0', 'enttec-usb-dmx-pro', devicePath)
      this.dmx.addUniverse('universe1', 'enttec-usb-dmx-pro', devicePath, { port: 1 })
      this.setStatus('connected')
    } catch {
      this.setStatus('error')
    }
  }

  setChannel(universe: 0 | 1, channel: number, value: number): void {
    const v = this.clampValue(value)
    this.universes[universe][channel] = v
    if (this.dmx) {
      this.dmx.update(`universe${universe}`, { [channel]: v })
    }
  }

  activateScene(
    targetValues: Record<string, number>,
    fixtures: Array<{ id: string; channel: number; universe: 0 | 1; type: string }>,
    fadeDuration: number,
    getFixtureById: (id: string) => typeof fixtures[0] | undefined
  ): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }

    const targets: [UniverseState, UniverseState] = [{}, {}]
    for (const [fixtureId, value] of Object.entries(targetValues)) {
      const fixture = getFixtureById(fixtureId)
      if (!fixture) continue
      if (fixture.type === 'switch') {
        this.setChannel(fixture.universe, fixture.channel, value)
      } else {
        targets[fixture.universe][fixture.channel] = value
      }
    }

    if (fadeDuration <= 0) {
      for (const u of [0, 1] as const) {
        for (const [ch, val] of Object.entries(targets[u])) {
          this.setChannel(u, Number(ch), val)
        }
      }
      return
    }

    const startValues: [UniverseState, UniverseState] = [
      { ...this.universes[0] },
      { ...this.universes[1] },
    ]
    const startTime = Date.now()

    this.fadeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / fadeDuration, 1)

      for (const u of [0, 1] as const) {
        for (const [ch, targetVal] of Object.entries(targets[u])) {
          const channel = Number(ch)
          const startVal = startValues[u][channel] ?? 0
          const value = this.interpolate(startVal, targetVal, progress)
          this.setChannel(u, channel, value)
        }
      }

      if (progress >= 1 && this.fadeInterval) {
        clearInterval(this.fadeInterval)
        this.fadeInterval = null
      }
    }, 16)
  }

  interpolate(start: number, end: number, progress: number): number {
    const p = Math.min(progress, 1)
    return Math.round(start + (end - start) * p)
  }

  clampValue(value: number): number {
    return Math.max(0, Math.min(255, value))
  }

  private setStatus(status: DmxStatus): void {
    this.status = status
    this.onStatusChange?.(status)
  }
}
