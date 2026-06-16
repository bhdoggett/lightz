import type React from 'react'
import styles from './Slider.module.css'

interface Props {
  value: number
  min?: number
  max?: number
  height?: number
  disabled?: boolean
  onChange: (value: number) => void
}

export function Slider({ value, min = 0, max = 255, height = 120, disabled = false, onChange }: Props) {
  const fillPct = `${((value - min) / (max - min)) * 100}%`
  return (
    <input
      type="range"
      role="slider"
      className={styles.slider}
      style={{ height: `${height}px`, ['--fill-pct']: fillPct } as React.CSSProperties}
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}
