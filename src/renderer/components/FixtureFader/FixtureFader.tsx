import { RawFader } from '../RawFader'

interface Props {
  channel: number
  universe?: 0 | 1
  name: string
  value: number
  onChange: (value: number) => void
  onRename?: (name: string) => void
  groupColor?: string
  groupOverride?: 'full' | 'mute' | null
  groupMultiplier?: number
}

export function FixtureFader({ channel, universe, name, value, onChange, onRename, groupColor, groupOverride, groupMultiplier }: Props) {
  return (
    <RawFader
      channel={channel}
      universe={universe}
      value={value}
      label={name}
      onChange={onChange}
      onRename={onRename}
      groupColor={groupColor}
      groupOverride={groupOverride}
      groupMultiplier={groupMultiplier}
    />
  )
}
