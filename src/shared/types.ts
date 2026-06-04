export type FixtureType = 'dimmer' | 'switch'

export interface Fixture {
  id: string
  name: string
  channel: number      // 1–512
  universe: 0 | 1     // Enttec Mk2 has two universes
  type: FixtureType
}

export interface Scene {
  id: string           // url-safe slug, unique
  name: string
  fadeDuration: number // ms, 0 = instant
  values: Record<string, number> // fixtureId → 0–255
}

export interface Config {
  fixtures: Fixture[]
  scenes: Scene[]
  companionPort: number // default 5551
  devicePath: string   // e.g. /dev/tty.usbserial-XXXXX, empty = no connection
  dmxOutputPort: 0 | 1 | 2 // MK2 output port (matches QLC+ output 1/2/3)
}

// Sent from main → renderer whenever DMX connection state changes
export type DmxStatus = 'connected' | 'disconnected' | 'error'

// Payload types for IPC channels
export interface SetChannelArgs {
  universe: 0 | 1
  channel: number
  value: number
}

export interface SaveSceneArgs {
  name: string
  fadeDuration: number
  values: Record<string, number> // fixtureId → 0–255
}

export interface UpdateSceneArgs {
  id: string
  name: string
  fadeDuration: number
}
