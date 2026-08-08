export const START = 0x7e
export const END = 0xe7
export const GET_WIDGET_PARAMS_LABEL = 0x03

export interface EnttecFrame {
  label: number
  data: Buffer
}

export function parseEnttecFrames(buffer: Buffer): { frames: EnttecFrame[]; rest: Buffer } {
  const frames: EnttecFrame[] = []
  let offset = 0

  for (;;) {
    const startIdx = buffer.indexOf(START, offset)
    if (startIdx === -1) {
      return { frames, rest: Buffer.alloc(0) }
    }

    // Need START, label, lenLo, lenHi to know how long the frame is
    if (buffer.length < startIdx + 4) {
      return { frames, rest: buffer.subarray(startIdx) }
    }

    const label = buffer[startIdx + 1]
    const len = buffer[startIdx + 2] | (buffer[startIdx + 3] << 8)
    const frameEnd = startIdx + 4 + len // index the END byte should be at

    if (buffer.length < frameEnd + 1) {
      return { frames, rest: buffer.subarray(startIdx) }
    }

    if (buffer[frameEnd] !== END) {
      // Not a real frame here — resume scanning right after this START byte
      offset = startIdx + 1
      continue
    }

    frames.push({ label, data: buffer.subarray(startIdx + 4, frameEnd) })
    offset = frameEnd + 1
  }
}
