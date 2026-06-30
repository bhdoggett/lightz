export type FixtureType = 'dimmer' | 'switch'

export type ChannelRole =
  | 'red' | 'green' | 'blue' | 'amber' | 'white' | 'uv'
  | 'dimmer' | 'strobe' | 'other'

export interface FixtureChannel {
  id: string
  role: ChannelRole
  label: string
  channel: number
  universe: 0 | 1
  linked: boolean
}

export type GroupState = { fader: number; override: 'full' | 'mute' | null }

export interface FixtureTemplate {
  id: string
  name: string
  channels: Array<{
    role: ChannelRole
    label: string
    linked: boolean
    offset: number
  }>
}

export interface VizPosition {
  col: number          // grid column (0-indexed)
  row: number          // grid row (0-indexed)
}

export interface Fixture {
  id: string
  name: string
  channel: number      // 1–512
  universe: 0 | 1     // Enttec Mk2 has two universes
  type: FixtureType
  channels?: FixtureChannel[]
  vizPositions?: VizPosition[]
}

export interface Scene {
  id: string
  name: string
  fadeDuration: number
  values: Record<string, number>
  groupStates?: Record<string, GroupState>
}

export interface Config {
  fixtures: Fixture[]
  scenes: Scene[]
  groups: Group[]
  fixtureTemplates: FixtureTemplate[]
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
  values: Record<string, number>
  groupStates?: Record<string, GroupState>
}

export interface UpdateSceneArgs {
  id: string
  name: string
  fadeDuration: number
  values?: Record<string, number>
  groupStates?: Record<string, GroupState>
}

// Per-channel group override sent to DmxManager
export interface ShowInfo {
  name: string
  modifiedAt: number  // ms timestamp
}

export type GroupChannelOverride =
  | { kind: 'full' }                    // output = 255
  | { kind: 'mute' }                    // output = 0
  | { kind: 'percent'; multiplier: number } // output = stored × multiplier

export interface Group {
  id: string
  name: string
  color: string        // hex e.g. "#6366f1"
  fixtureIds: string[] // each fixture belongs to at most one group
}

export const GROUP_COLORS = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b',
  '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6',
  '#f97316', '#6b7280',
] as const
