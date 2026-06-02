interface Props {
  name: string
  value: number
  onChange: (value: number) => void
}

export function FixtureToggle({ name, value, onChange }: Props) {
  const on = value > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        role="button"
        onClick={() => onChange(on ? 0 : 255)}
        style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: on ? '#6366f1' : '#374151',
          boxShadow: on ? '0 0 12px #6366f180' : 'none',
          transition: 'background 0.2s, box-shadow 0.2s',
        }}
        aria-pressed={on}
      />
      <span style={{ color: '#e5e7eb', fontSize: 12, textAlign: 'center', maxWidth: 70, wordBreak: 'break-word' }}>
        {name}
      </span>
    </div>
  )
}
