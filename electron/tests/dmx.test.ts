// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import type { DmxStatus } from '../../src/shared/types'

vi.mock('serialport', () => {
  // Reached via require() rather than the top-level `EventEmitter` import:
  // referencing the hoisted import binding directly from inside this factory
  // trips a vitest 1.x hoisting bug (`class X extends <hoisted import>` inside
  // vi.mock => "Cannot access '__vi_import_0__' before initialization").
  const { EventEmitter: NodeEventEmitter } = require('events')
  class FakeSerialPort extends NodeEventEmitter {
    static last: FakeSerialPort | null = null
    isOpen = true
    writable = true
    written: Buffer[] = []
    close = vi.fn(() => {
      this.isOpen = false
      queueMicrotask(() => this.emit('close'))
    })
    write = vi.fn((data: Buffer) => {
      this.written.push(data)
      return true
    })
    constructor(_opts: unknown, cb: (err: Error | null) => void) {
      super()
      FakeSerialPort.last = this
      queueMicrotask(() => cb(null))
    }
  }
  return { SerialPort: FakeSerialPort }
})

import { SerialPort } from 'serialport'
import { DmxManager } from '../dmx'

const FakeSerialPort = SerialPort as unknown as {
  last: (EventEmitter & { isOpen: boolean; writable: boolean; written: Buffer[]; close: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn> }) | null
}

describe('DmxManager', () => {
  let manager: DmxManager

  beforeEach(() => {
    manager = new DmxManager()
  })

  describe('group overrides', () => {
    beforeEach(() => {
      manager = new DmxManager()
    })

    it('returns raw value when no override set', () => {
      manager.setChannel(0, 1, 200)
      expect(manager.getEffectiveValue(0, 1)).toBe(200)
    })

    it('full override returns 255 regardless of stored value', () => {
      manager.setChannel(0, 1, 100)
      manager.setGroupOverrides({ '0-1': { kind: 'full' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(255)
    })

    it('full override returns 255 even when stored value is 0', () => {
      manager.setChannel(0, 1, 0)
      manager.setGroupOverrides({ '0-1': { kind: 'full' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(255)
    })

    it('mute override returns 0 regardless of stored value', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupOverrides({ '0-1': { kind: 'mute' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(0)
    })

    it('percent override multiplies stored value', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupOverrides({ '0-1': { kind: 'percent', multiplier: 0.5 } })
      expect(manager.getEffectiveValue(0, 1)).toBe(100)
    })

    it('percent override rounds fractional results', () => {
      manager.setChannel(0, 1, 3)
      manager.setGroupOverrides({ '0-1': { kind: 'percent', multiplier: 0.5 } })
      expect(manager.getEffectiveValue(0, 1)).toBe(2)
    })

    it('setGroupOverrides replaces previous map', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupOverrides({ '0-1': { kind: 'mute' } })
      manager.setGroupOverrides({ '0-2': { kind: 'mute' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(200) // override gone
      expect(manager.getEffectiveValue(0, 2)).toBe(0)
    })
  })

  describe('connect verification handshake', () => {
    beforeEach(() => {
      manager = new DmxManager()
    })

    it('reports connected only after the widget replies to Get Widget Parameters', async () => {
      const statuses: DmxStatus[] = []
      manager.connect('/dev/fake', (s) => statuses.push(s))

      await Promise.resolve()
      await Promise.resolve()

      const port = FakeSerialPort.last!
      expect(statuses).not.toContain('connected')
      expect(port.write).toHaveBeenCalledWith(Buffer.from([0x7e, 0x03, 0x00, 0x00, 0xe7]))

      port.emit('data', Buffer.from([0x7e, 0x03, 0x00, 0x00, 0xe7]))

      expect(statuses).toEqual(['connected'])
    })

    it('reports error and closes the port if the widget never replies', async () => {
      vi.useFakeTimers()
      const statuses: DmxStatus[] = []
      manager.connect('/dev/fake', (s) => statuses.push(s))

      await vi.advanceTimersByTimeAsync(0)
      const port = FakeSerialPort.last!

      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(0) // flush the close()'s queued 'close' event

      expect(statuses).toEqual(['error'])
      expect(port.close).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('ignores a malformed reply and still times out to error', async () => {
      vi.useFakeTimers()
      const statuses: DmxStatus[] = []
      manager.connect('/dev/fake', (s) => statuses.push(s))

      await vi.advanceTimersByTimeAsync(0)
      const port = FakeSerialPort.last!

      // Wrong label — not the Get Widget Parameters reply
      port.emit('data', Buffer.from([0x7e, 0x06, 0x00, 0x00, 0xe7]))

      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(0)

      expect(statuses).toEqual(['error'])

      vi.useRealTimers()
    })

    it('does not connect on a wrong-label reply, but does connect once a valid reply follows (proves the label filter, not just an unparsed frame)', async () => {
      const statuses: DmxStatus[] = []
      manager.connect('/dev/fake', (s) => statuses.push(s))

      await Promise.resolve()
      await Promise.resolve()

      const port = FakeSerialPort.last!

      // Wrong label — must be parsed (not silently dropped) and rejected on label alone
      port.emit('data', Buffer.from([0x7e, 0x06, 0x00, 0x00, 0xe7]))
      expect(statuses).not.toContain('connected')

      // Now the real reply arrives — proves the parser was live the whole time
      // and only the label check was gating the wrong-label frame above.
      port.emit('data', Buffer.from([0x7e, 0x03, 0x00, 0x00, 0xe7]))
      expect(statuses).toEqual(['connected'])
    })

    it('cancels the first handshake timer when connect() is called again before it replies, so a stale timeout cannot kill the new connection', async () => {
      vi.useFakeTimers()
      const statuses: DmxStatus[] = []
      manager.connect('/dev/fake', (s) => statuses.push(s))

      await vi.advanceTimersByTimeAsync(0)
      const firstPort = FakeSerialPort.last!

      // Reconnect (e.g. settings change or hotplug poller retry) while the
      // first handshake's 500ms timer is still pending.
      manager.connect('/dev/fake', (s) => statuses.push(s))
      await vi.advanceTimersByTimeAsync(0)
      const secondPort = FakeSerialPort.last!
      expect(secondPort).not.toBe(firstPort)

      // Reply on the current (second) port.
      secondPort.emit('data', Buffer.from([0x7e, 0x03, 0x00, 0x00, 0xe7]))

      // Let the original handshake's deadline pass — its stale timer must not fire.
      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(0)

      expect(statuses).not.toContain('error')
      expect(statuses[statuses.length - 1]).toBe('connected')

      vi.useRealTimers()
    })

    it('does not overwrite status with a late error if the port closes mid-handshake', async () => {
      vi.useFakeTimers()
      const statuses: DmxStatus[] = []
      manager.connect('/dev/fake', (s) => statuses.push(s))

      await vi.advanceTimersByTimeAsync(0)
      const port = FakeSerialPort.last!

      // Widget/cable drops mid-handshake, before it ever replied.
      port.emit('close')
      expect(statuses).toEqual(['disconnected'])

      // The abandoned verify timer must not fire 'error' 500ms later.
      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(0)

      expect(statuses).toEqual(['disconnected'])

      vi.useRealTimers()
    })
  })
})
