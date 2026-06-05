import { RawFader } from './RawFader'

interface Props {
  channel: number
  name: string
  value: number
  onChange: (value: number) => void
  onRename?: (name: string) => void
  groupColor?: string
  groupMuted?: boolean
}

export function FixtureFader({ channel, name, value, onChange, onRename, groupColor, groupMuted }: Props) {
  return (
    <RawFader
      channel={channel}
      value={value}
      label={name}
      onChange={onChange}
      onRename={onRename}
      groupColor={groupColor}
      groupMuted={groupMuted}
    />
  )
}
