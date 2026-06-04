import { RawFader } from './RawFader'

interface Props {
  name: string
  value: number
  onChange: (value: number) => void
}

export function FixtureFader({ name, value, onChange }: Props) {
  return (
    <RawFader
      channel={0}
      value={value}
      label={name}
      onChange={onChange}
    />
  )
}
