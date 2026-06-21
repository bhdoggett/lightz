import { SerialPort } from 'serialport'
import type { DmxStatus, GroupChannelOverride } from '../src/shared/types'
import { interpolate, clampValue } from '../src/shared/dmx-utils'

const START = 0x7e
const END = 0xe7
const DMX_START_CODE = 0x00

// MK2 output port labels (match QLC+ outputs 1/2/3)
const PORT_LABELS = [0x06, 0xa9, 0xca] as const

type UniverseState = Record<number, number>

export class DmxManager {
  private port: SerialPort | null = null
  private universes: [UniverseState, UniverseState] = [{}, {}]
  private buffers: [Buffer, Buffer] = [Buffer.alloc(513, 0), Buffer.alloc(513, 0)]
  private outputPort: 0 | 1 | 2 = 0
  private fadeInterval: ReturnType<typeof setInterval> | null = null
  private sendInterval: ReturnType<typeof setInterval> | null = null
  private status: DmxStatus = 'disconnected'
  private onStatusChange?: (status: DmxStatus) => void
  private groupOverrides: Record<string, GroupChannelOverride> = {}

  connect(devicePath: string, outputPort: 0 | 1 | 2, onStatus: (s: DmxStatus) => void): void {
    this.onStatusChange = onStatus
    this.outputPort = outputPort

    this.stopSending()
    if (this.port?.isOpen) {
      this.port.close()
    }
    this.port = null

    try {
      this.port = new SerialPort(
        { path: devicePath, baudRate: 250000, dataBits: 8, stopBits: 2, parity: 'none' },
        (err) => {
          if (err) {
            this.setStatus('error')
          } else {
            this.startSending()
            this.setStatus('connected')
          }
        }
      )

      this.port.on('close', () => {
        this.stopSending()
        this.setStatus('disconnected')
      })

      this.port.on('error', (err) => {
        console.error('[DMX] serial port error:', err.message)
        this.stopSending()
        this.setStatus('disconnected')
      })
    } catch {
      this.setStatus('error')
    }
  }

  private stopSending(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval)
      this.sendInterval = null
    }
  }

  private applyOverride(universe: 0 | 1, channel: number): number {
    const key = `${universe}-${channel}`
    const o = this.groupOverrides[key]
    if (!o) return this.universes[universe][channel] ?? 0
    if (o.kind === 'full') return 255
    if (o.kind === 'mute') return 0
    return clampValue(Math.round((this.universes[universe][channel] ?? 0) * o.multiplier))
  }

  private buildPacket(): Buffer {
    const label = PORT_LABELS[this.outputPort]
    const merged = Buffer.alloc(513, 0)
    for (let i = 1; i <= 512; i++) {
      merged[i] = Math.max(this.applyOverride(0, i), this.applyOverride(1, i))
    }
    const hdr = Buffer.from([
      START,
      label,
      merged.length & 0xff,
      (merged.length >> 8) & 0xff,
      DMX_START_CODE,
    ])
    return Buffer.concat([hdr, merged.slice(1), Buffer.from([END])])
  }

  private startSending(): void {
    // 30ms interval > 22.8ms packet transmission time at 250kbaud, so no buffer overlap
    this.sendInterval = setInterval(() => {
      if (this.port?.writable) this.port.write(this.buildPacket())
    }, 30)
  }

  setChannel(universe: 0 | 1, channel: number, value: number): void {
    const v = clampValue(value)
    this.universes[universe][channel] = v
    this.buffers[universe][channel] = v
  }

  activateScene(
    targetValues: Record<string, number>,
    fadeDuration: number,
    resolveChannel: (id: string) => { channel: number; universe: 0 | 1; type: string } | undefined
  ): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }

    const targets: [UniverseState, UniverseState] = [{}, {}]
    for (const [fixtureId, value] of Object.entries(targetValues)) {
      const fixture = resolveChannel(fixtureId)
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
          const value = interpolate(startVal, targetVal, progress)
          this.setChannel(u, channel, value)
        }
      }

      if (progress >= 1 && this.fadeInterval) {
        clearInterval(this.fadeInterval)
        this.fadeInterval = null
      }
    }, 16)
  }

  setGroupOverrides(map: Record<string, GroupChannelOverride>): void {
    this.groupOverrides = { ...map }
  }

  getEffectiveValue(universe: 0 | 1, channel: number): number {
    return clampValue(this.applyOverride(universe, channel))
  }

  private setStatus(status: DmxStatus): void {
    this.status = status
    this.onStatusChange?.(status)
  }
}
