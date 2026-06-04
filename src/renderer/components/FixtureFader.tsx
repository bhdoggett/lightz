import { RawFader } from './RawFader'

interface Props {
  name: string
  value: number
  onChange: (value: number) => void
  onRename?: (name: string) => void
}

export function FixtureFader({ name, value, onChange, onRename }: Props) {
  return (
    <RawFader
      channel={0}
      value={value}
      label={name}
      onChange={onChange}
      onRename={onRename}
    />
  )
}
