import { describe, it, expect } from 'vitest'
import { parseEnttecFrames, START, END } from '../enttec-protocol'

describe('parseEnttecFrames', () => {
  it('parses a single complete frame', () => {
    const buf = Buffer.from([START, 0x03, 0x02, 0x00, 0xaa, 0xbb, END])
    const { frames, rest } = parseEnttecFrames(buf)
    expect(frames).toEqual([{ label: 0x03, data: Buffer.from([0xaa, 0xbb]) }])
    expect(rest.length).toBe(0)
  })

  it('parses multiple frames in one chunk', () => {
    const frame1 = Buffer.from([START, 0x03, 0x00, 0x00, END])
    const frame2 = Buffer.from([START, 0x06, 0x01, 0x00, 0x42, END])
    const buf = Buffer.concat([frame1, frame2])
    const { frames, rest } = parseEnttecFrames(buf)
    expect(frames).toEqual([
      { label: 0x03, data: Buffer.alloc(0) },
      { label: 0x06, data: Buffer.from([0x42]) },
    ])
    expect(rest.length).toBe(0)
  })

  it('holds back an incomplete frame for the next chunk', () => {
    // Header says 5 data bytes follow, but only 1 is present yet
    const buf = Buffer.from([START, 0x03, 0x05, 0x00, 0xaa])
    const { frames, rest } = parseEnttecFrames(buf)
    expect(frames).toEqual([])
    expect(rest).toEqual(buf)
  })

  it('drops garbage bytes preceding a valid frame', () => {
    const buf = Buffer.concat([
      Buffer.from([0x11, 0x22, 0x33]),
      Buffer.from([START, 0x03, 0x00, 0x00, END]),
    ])
    const { frames, rest } = parseEnttecFrames(buf)
    expect(frames).toEqual([{ label: 0x03, data: Buffer.alloc(0) }])
    expect(rest.length).toBe(0)
  })

  it('skips a false START byte whose END position does not match', () => {
    // Claims 1 data byte, but the byte at the computed END position isn't END
    const fakeFrame = Buffer.from([START, 0x03, 0x01, 0x00, 0xff, 0x00])
    const realFrame = Buffer.from([START, 0x06, 0x00, 0x00, END])
    const buf = Buffer.concat([fakeFrame, realFrame])
    const { frames } = parseEnttecFrames(buf)
    expect(frames).toEqual([{ label: 0x06, data: Buffer.alloc(0) }])
  })
})
