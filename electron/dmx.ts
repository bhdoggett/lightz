import { SerialPort } from 'serialport'
import type { DmxStatus, GroupChannelOverride } from '../src/shared/types'
import { interpolate, clampValue } from '../src/shared/dmx-utils'
import { parseEnttecFrames, START, END, GET_WIDGET_PARAMS_LABEL, type EnttecFrame } from './enttec-protocol'

const DMX_START_CODE = 0x00

// MK2 port labels per QLC+ source (enttecdmxusbpro.cpp): port 1 = 0x06, port 2 = 0xa9
const UNIVERSE_PORT_LABELS: [number, number] = [0x06, 0xa9]

type UniverseState = Record<number, number>

export class DmxManager {
  private port: SerialPort | null = null
  private universes: [UniverseState, UniverseState] = [{}, {}]
  private buffers: [Buffer, Buffer] = [Buffer.alloc(513, 0), Buffer.alloc(513, 0)]
  private fadeInterval: ReturnType<typeof setInterval> | null = null
  private sendInterval: ReturnType<typeof setInterval> | null = null
  private sendInterval2: ReturnType<typeof setInterval> | null = null
  private sendTimeout: ReturnType<typeof setTimeout> | null = null
  private status: DmxStatus = 'disconnected'
  private onStatusChange?: (status: DmxStatus) => void
  private groupOverrides: Record<string, GroupChannelOverride> = {}
  private incomingBuffer: Buffer = Buffer.alloc(0)
  private frameHandler: ((frame: EnttecFrame) => void) | null = null
  private closingAfterVerifyFailure = false
  private verifyTimeout: ReturnType<typeof setTimeout> | null = null

  connect(devicePath: string, onStatus: (s: DmxStatus) => void): void {
    this.onStatusChange = onStatus

    this.stopSending()
    if (this.port?.isOpen) {
      this.port.close()
    }
    this.port = null
    this.incomingBuffer = Buffer.alloc(0)
    this.frameHandler = null
    this.closingAfterVerifyFailure = false
    if (this.verifyTimeout) {
      clearTimeout(this.verifyTimeout)
      this.verifyTimeout = null
    }

    try {
      this.port = new SerialPort(
        { path: devicePath, baudRate: 250000, dataBits: 8, stopBits: 2, parity: 'none' },
        (err) => {
          if (err) {
            this.setStatus('error')
            return
          }
          this.verifyWidget(
            () => {
              this.initMk2()
              this.startSending()
              this.setStatus('connected')
            },
            () => {
              this.closingAfterVerifyFailure = true
              this.port?.close()
              this.setStatus('error')
            }
          )
        }
      )

      this.port.on('data', (chunk: Buffer) => {
        this.incomingBuffer = Buffer.concat([this.incomingBuffer, chunk])
        const { frames, rest } = parseEnttecFrames(this.incomingBuffer)
        this.incomingBuffer = rest
        for (const frame of frames) {
          this.frameHandler?.(frame)
        }
      })

      this.port.on('close', () => {
        this.stopSending()
        if (this.verifyTimeout) {
          clearTimeout(this.verifyTimeout)
          this.verifyTimeout = null
        }
        this.frameHandler = null
        if (this.closingAfterVerifyFailure) {
          this.closingAfterVerifyFailure = false
          return
        }
        this.setStatus('disconnected')
      })

      this.port.on('error', (err) => {
        console.error('[DMX] serial port error:', err.message)
        this.stopSending()
        if (this.verifyTimeout) {
          clearTimeout(this.verifyTimeout)
          this.verifyTimeout = null
        }
        this.frameHandler = null
        this.setStatus('disconnected')
      })
    } catch {
      this.setStatus('error')
    }
  }

  private verifyWidget(onVerified: () => void, onFailed: () => void): void {
    const handler = (frame: EnttecFrame): void => {
      if (frame.label !== GET_WIDGET_PARAMS_LABEL) return
      cleanup()
      onVerified()
    }
    const cleanup = (): void => {
      if (this.verifyTimeout) {
        clearTimeout(this.verifyTimeout)
        this.verifyTimeout = null
      }
      // Only clear frameHandler if it's still ours — a stale cleanup (e.g. from
      // an old handshake whose timer somehow still fired) must not clobber a
      // newer handshake's handler.
      if (this.frameHandler === handler) {
        this.frameHandler = null
      }
    }
    this.frameHandler = handler
    this.verifyTimeout = setTimeout(() => {
      cleanup()
      onFailed()
    }, 500)
    this.port?.write(Buffer.from([START, GET_WIDGET_PARAMS_LABEL, 0x00, 0x00, END]))
  }

  private initMk2(): void {
    // Enable API2 — unlocks MK2 dual-port mode (magic key per QLC+ source)
    this.port?.write(Buffer.from([0x7e, 0x0d, 0x04, 0x00, 0xad, 0x88, 0xd0, 0xc8, 0xe7]))
    // Port assignment — both ports active as DMX output
    this.port?.write(Buffer.from([0x7e, 0xcb, 0x02, 0x00, 0x01, 0x01, 0xe7]))
  }

  private stopSending(): void {
    if (this.sendTimeout) { clearTimeout(this.sendTimeout); this.sendTimeout = null }
    if (this.sendInterval) { clearInterval(this.sendInterval); this.sendInterval = null }
    if (this.sendInterval2) { clearInterval(this.sendInterval2); this.sendInterval2 = null }
  }

  private applyOverride(universe: 0 | 1, channel: number): number {
    const key = `${universe}-${channel}`
    const o = this.groupOverrides[key]
    if (!o) return this.universes[universe][channel] ?? 0
    if (o.kind === 'full') return 255
    if (o.kind === 'mute') return 0
    return clampValue(Math.round((this.universes[universe][channel] ?? 0) * o.multiplier))
  }

  private buildUniversePacket(universe: 0 | 1): Buffer {
    const label = UNIVERSE_PORT_LABELS[universe]
    const data = Buffer.alloc(513, 0)
    for (let i = 1; i <= 512; i++) {
      data[i] = this.applyOverride(universe, i)
    }
    const hdr = Buffer.from([
      START,
      label,
      data.length & 0xff,
      (data.length >> 8) & 0xff,
      DMX_START_CODE,
    ])
    return Buffer.concat([hdr, data.slice(1), Buffer.from([END])])
  }

  private startSending(): void {
    // Two independent loops, staggered 15ms apart — each universe sends to its
    // own dedicated port every 30ms without ever colliding in the write buffer.
    this.sendInterval = setInterval(() => {
      if (this.port?.writable) this.port.write(this.buildUniversePacket(0))
    }, 30)
    this.sendTimeout = setTimeout(() => {
      this.sendInterval2 = setInterval(() => {
        if (this.port?.writable) this.port.write(this.buildUniversePacket(1))
      }, 30)
    }, 15)
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
