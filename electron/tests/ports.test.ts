// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => ({
  readdirSync: vi.fn(),
}))

import { readdirSync } from 'fs'
import { listSerialPorts } from './ports'

describe('listSerialPorts', () => {
  beforeEach(() => {
    vi.mocked(readdirSync).mockReset()
  })

  it('returns full paths for cu.usb* devices', () => {
    vi.mocked(readdirSync).mockReturnValue(['cu.usbserial-ABC', 'tty.Bluetooth-Incoming-Port'] as any)
    expect(listSerialPorts()).toEqual(['/dev/cu.usbserial-ABC'])
  })

  it('returns full paths for cu.usbmodem* devices', () => {
    vi.mocked(readdirSync).mockReturnValue(['cu.usbmodem1HP0035381', 'cu.Bluetooth-Modem'] as any)
    expect(listSerialPorts()).toEqual(['/dev/cu.usbmodem1HP0035381'])
  })

  it('excludes tty.usb* devices (not in USB_PREFIXES)', () => {
    vi.mocked(readdirSync).mockReturnValue(['tty.usbserial-ABC', 'tty.usbmodem1HP0035381', 'tty.debug-console'] as any)
    expect(listSerialPorts()).toEqual([])
  })

  it('returns multiple matching devices', () => {
    vi.mocked(readdirSync).mockReturnValue(['cu.usbserial-A', 'cu.usbmodem-B', 'tty.usbserial-C'] as any)
    expect(listSerialPorts()).toEqual([
      '/dev/cu.usbserial-A',
      '/dev/cu.usbmodem-B',
    ])
  })

  it('returns empty array when no USB serial devices present', () => {
    vi.mocked(readdirSync).mockReturnValue(['tty.Bluetooth-Incoming-Port', 'tty.debug-console'] as any)
    expect(listSerialPorts()).toEqual([])
  })

  it('returns empty array when /dev is unreadable', () => {
    vi.mocked(readdirSync).mockImplementation(() => { throw new Error('EACCES') })
    expect(listSerialPorts()).toEqual([])
  })
})
