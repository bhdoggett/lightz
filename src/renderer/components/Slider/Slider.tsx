import type React from 'react'
import styles from './Slider.module.css'

interface Props {
  value: number
  min?: number
  max?: number
  height?: number
  fillColor?: string
  disabled?: boolean
  groupMultiplier?: number
  onChange: (value: number) => void
}

export function Slider({ value, min = 0, max = 255, height = 120, fillColor, disabled = false, groupMultiplier, onChange }: Props) {
  const fillPct = `${((value - min) / (max - min)) * 100}%`
  const effectivePct = groupMultiplier !== undefined
    ? `${((value - min) / (max - min)) * groupMultiplier * 100}%`
    : undefined
  return (
    <input
      type="range"
      role="slider"
      className={styles.slider}
      style={{
        height: `${height}px`,
        ['--fill-pct']: fillPct,
        ...(effectivePct ? { ['--effective-pct']: effectivePct } : {}),
        ...(fillColor ? { ['--fill-color']: fillColor } : {}),
      } as React.CSSProperties}
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}
