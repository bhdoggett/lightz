import type { FixtureChannel, ChannelRole } from '../../shared/types'

const COLOR_ROLES: ChannelRole[] = ['red', 'green', 'blue', 'amber', 'white', 'uv']

export function isColorRole(role: ChannelRole): boolean {
  return COLOR_ROLES.includes(role)
}

const ROLE_FILL: Partial<Record<ChannelRole, string>> = {
  red:   '#ff3030',
  green: '#30cc50',
  blue:  '#3399ff',
  amber: '#ffaa00',
  white: '#c8c8c8',
  uv:    '#aa00ff',
}

export function roleToFillColor(role: ChannelRole): string | undefined {
  return ROLE_FILL[role]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function toHex(v: number): string {
  return Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')
}

export function channelValuesToDisplayHex(
  channels: FixtureChannel[],
  values: Record<string, number>
): string {
  let r = 0, g = 0, b = 0
  let whiteLevel = 0

  for (const ch of channels) {
    const v = (values[ch.id] ?? 0) / 255
    switch (ch.role) {
      case 'red':   r += v * 255; break
      case 'green': g += v * 255; break
      case 'blue':  b += v * 255; break
      case 'amber': r += v * 255; g += v * 191; break  // amber ≈ #FFBF00
      case 'white': whiteLevel = Math.max(whiteLevel, v); break
      case 'uv':    r += v * 148; b += v * 211; break  // UV ≈ #9400D3
    }
  }

  // Normalize chromatic channels so max hits 255, preserving hue (not affected by white)
  const chromaMax = Math.max(r, g, b)
  if (chromaMax > 255) {
    const scale = 255 / chromaMax
    r *= scale; g *= scale; b *= scale
  }

  // Blend white in as a shift toward #ffffff — lightens the hue rather than muddying it
  r = r + (255 - r) * whiteLevel
  g = g + (255 - g) * whiteLevel
  b = b + (255 - b) * whiteLevel

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function pickerHexToChannelValues(
  hex: string,
  channels: FixtureChannel[]
): Record<string, number> {
  const [r, g, b] = hexToRgb(hex)
  const warmth = Math.max(0, r - Math.max(g, b))
  const neutral = Math.min(r, g, b)
  const result: Record<string, number> = {}

  for (const ch of channels) {
    switch (ch.role) {
      case 'red':   result[ch.id] = r; break
      case 'green': result[ch.id] = g; break
      case 'blue':  result[ch.id] = b; break
      case 'amber': result[ch.id] = warmth; break
      case 'white': result[ch.id] = neutral; break
      // uv: not derivable from RGB — omit so caller can preserve current value
    }
  }
  return result
}
