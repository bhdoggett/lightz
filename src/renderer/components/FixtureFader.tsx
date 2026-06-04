import { RawFader } from './RawFader'

interface Props {
  channel: number
  name: string
  value: number
  onChange: (value: number) => void
  onRename?: (name: string) => void
}

export function FixtureFader({ channel, name, value, onChange, onRename }: Props) {
  return (
    <RawFader
      channel={channel}
      value={value}
      label={name}
      onChange={onChange}
      onRename={onRename}
    />
  )
}
