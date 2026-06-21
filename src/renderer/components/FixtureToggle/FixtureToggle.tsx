import styles from './FixtureToggle.module.css'

interface Props {
  name: string
  value: number
  onChange: (value: number) => void
}

export function FixtureToggle({ name, value, onChange }: Props) {
  const on = value > 0
  return (
    <div className={styles.toggle}>
      <button
        role="button"
        onClick={() => onChange(on ? 0 : 255)}
        className={`${styles.btn}${on ? ` ${styles.on}` : ''}`}
        aria-pressed={on}
      />
      <span className={styles.name}>{name}</span>
    </div>
  )
}
