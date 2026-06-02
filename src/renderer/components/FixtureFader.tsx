interface Props {
  name: string
  value: number
  onChange: (value: number) => void
}

export function FixtureFader({ name, value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 60 }}>
      <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>
      <input
        type="range"
        role="slider"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 120, cursor: 'pointer' }}
      />
      <span style={{ color: '#e5e7eb', fontSize: 12, textAlign: 'center', maxWidth: 70, wordBreak: 'break-word' }}>
        {name}
      </span>
    </div>
  )
}
