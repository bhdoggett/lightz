import { useState, useCallback, useRef, useEffect } from 'react'
import type { Fixture, GroupChannelOverride } from '../../shared/types'
import { channelValuesToDisplayHex } from '../utils/colorSync'
import { clampValue } from '../../shared/dmx-utils'
import styles from './LightVisualizer.module.css'

interface Props {
  fixtures: Fixture[]
  getChannel: (universe: 0 | 1, channel: number) => number
  overrideMap?: Record<string, GroupChannelOverride>
}

const MIN_HEIGHT = 32
const DEFAULT_HEIGHT = 200
const MAX_HEIGHT = 500

export function LightVisualizer({ fixtures, getChannel, overrideMap = {} }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startY.current = e.clientY
    startHeight.current = height
  }, [height])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = startY.current - e.clientY
      const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight.current + delta))
      setHeight(next)
      if (next > MIN_HEIGHT + 20) setExpanded(true)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function getEffectiveChannel(universe: 0 | 1, channel: number): number {
    const raw = getChannel(universe, channel)
    const key = `${universe}-${channel}`
    const o = overrideMap[key]
    if (!o) return raw
    if (o.kind === 'full') return 255
    if (o.kind === 'mute') return 0
    return clampValue(Math.round(raw * o.multiplier))
  }

  function getFixtureColor(fixture: Fixture): string {
    if (fixture.channels && fixture.channels.length > 0) {
      const values: Record<string, number> = {}
      for (const ch of fixture.channels) {
        values[ch.id] = getEffectiveChannel(ch.universe, ch.channel)
      }
      return channelValuesToDisplayHex(fixture.channels, values)
    }
    const val = getEffectiveChannel(fixture.universe, fixture.channel)
    const hex = Math.round(val).toString(16).padStart(2, '0')
    return `#${hex}${hex}${hex}`
  }

  function getFixtureIntensity(fixture: Fixture): number {
    if (fixture.channels && fixture.channels.length > 0) {
      return Math.max(...fixture.channels.map((ch) => getEffectiveChannel(ch.universe, ch.channel)), 0)
    }
    return getEffectiveChannel(fixture.universe, fixture.channel)
  }

  const compactDots = !expanded ? fixtures.map((f) => {
    const color = getFixtureColor(f)
    const intensity = getFixtureIntensity(f) / 255
    return (
      <div
        key={f.id}
        className={styles.compactDot}
        style={{ background: color, opacity: Math.max(0.1, intensity) }}
      />
    )
  }) : null

  return (
    <div className={styles.panel} style={{ height: expanded ? height : MIN_HEIGHT }}>
      {expanded && <div className={styles.dragHandle} onMouseDown={onDragStart} />}
      <div className={styles.toolbar} onClick={() => setExpanded((v) => !v)}>
        <div className={styles.toolbarLeft}>
          <span className={styles.toolbarLabel}>Visualizer</span>
          {!expanded && <div className={styles.compactStrip}>{compactDots}</div>}
        </div>
        <svg
          data-testid="viz-toggle"
          className={`${styles.chevron}${expanded ? ` ${styles.chevronExpanded}` : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 15l6-6 6 6"/>
        </svg>
      </div>
      {expanded && (
        <div className={styles.lights} data-testid="viz-lights">
          {fixtures.map((fixture) => {
            const color = getFixtureColor(fixture)
            const intensity = getFixtureIntensity(fixture) / 255
            const glowSize = Math.round(intensity * 24)
            return (
              <div key={fixture.id} className={styles.light}>
                <div
                  className={styles.lightBulb}
                  style={{
                    backgroundColor: color,
                    opacity: Math.max(0.05, intensity),
                    boxShadow: intensity > 0.05
                      ? `0 0 ${glowSize}px ${Math.round(glowSize * 0.6)}px ${color}`
                      : 'none',
                  }}
                />
                <span className={styles.lightLabel}>{fixture.name}</span>
                <span className={styles.lightValue}>
                  {Math.round(intensity * 100)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
