import { RawFader } from '../RawFader'

interface Props {
  channel: number
  universe?: 0 | 1
  name: string
  value: number
  onChange: (value: number) => void
  onRename?: (name: string) => void
  groupColor?: string
  groupMultiplier?: number
}

export function FixtureFader({ channel, universe, name, value, onChange, onRename, groupColor, groupMultiplier }: Props) {
  return (
    <RawFader
      channel={channel}
      universe={universe}
      value={value}
      label={name}
      onChange={onChange}
      onRename={onRename}
      fillColor={groupColor}
      groupColor={groupColor}
      groupMultiplier={groupMultiplier}
    />
  )
}
