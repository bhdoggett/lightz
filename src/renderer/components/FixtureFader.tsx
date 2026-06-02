import styles from './FixtureFader.module.css'

interface Props {
  name: string
  value: number
  onChange: (value: number) => void
}

export function FixtureFader({ name, value, onChange }: Props) {
  return (
    <div className={styles.fader}>
      <span className={styles.value}>{value}</span>
      <input
        type="range"
        role="slider"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
      />
      <span className={styles.name}>{name}</span>
    </div>
  )
}
