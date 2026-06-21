import { useState, useCallback, useRef, useEffect } from 'react'
import type { Fixture, GroupChannelOverride } from '../../shared/types'
import { channelValuesToDisplayHex } from '../utils/colorSync'
import { clampValue } from '../../shared/dmx-utils'
import styles from './LightVisualizer.module.css'

interface Props {
  fixtures: Fixture[]
  getChannel: (universe: 0 | 1, channel: number) => number
  overrideMap?: Record<string, GroupChannelOverride>
  onFixturePositionChange?: (fixtureId: string, vizX: number, vizY: number) => void
}

const MIN_HEIGHT = 32
const DEFAULT_HEIGHT = 250
const MAX_HEIGHT = 600
const GRID_STEP = 5
const MIN_BULB_SIZE = 20
const MAX_BULB_SIZE = 120
const DEFAULT_BULB_SIZE = 48
const BULB_STEP = 8

function snapToGrid(value: number): number {
  return Math.round(value / GRID_STEP) * GRID_STEP
}

function autoLayout(index: number, total: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(total))
  const row = Math.floor(index / cols)
  const col = index % cols
  const xStep = 80 / Math.max(cols - 1, 1)
  const rows = Math.ceil(total / cols)
  const yStep = 70 / Math.max(rows - 1, 1)
  return {
    x: snapToGrid(10 + col * xStep),
    y: snapToGrid(15 + row * yStep),
  }
}

export function LightVisualizer({ fixtures, getChannel, overrideMap = {}, onFixturePositionChange }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [locked, setLocked] = useState(true)
  const [bulbSize, setBulbSize] = useState(DEFAULT_BULB_SIZE)
  const resizing = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const dragFixtureId = useRef<string | null>(null)
  const dragStartMouse = useRef({ x: 0, y: 0 })
  const dragStartPos = useRef({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = true
    startY.current = e.clientY
    startHeight.current = height
  }, [height])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (resizing.current) {
        const delta = startY.current - e.clientY
        const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight.current + delta))
        setHeight(next)
        if (next > MIN_HEIGHT + 20) setExpanded(true)
        return
      }
      if (dragFixtureId.current && stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect()
        const rawX = ((e.clientX - rect.left) / rect.width) * 100
        const rawY = ((e.clientY - rect.top) / rect.height) * 100
        const dx = rawX - dragStartMouse.current.x
        const dy = rawY - dragStartMouse.current.y
        const newX = snapToGrid(Math.max(0, Math.min(100, dragStartPos.current.x + dx)))
        const newY = snapToGrid(Math.max(0, Math.min(100, dragStartPos.current.y + dy)))
        onFixturePositionChange?.(dragFixtureId.current, newX, newY)
      }
    }
    const onUp = () => {
      resizing.current = false
      dragFixtureId.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onFixturePositionChange])

  const onFixtureDragStart = useCallback((e: React.MouseEvent, fixture: Fixture) => {
    if (locked) return
    e.preventDefault()
    e.stopPropagation()
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    dragFixtureId.current = fixture.id
    dragStartMouse.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
    const auto = autoLayout(fixtures.indexOf(fixture), fixtures.length)
    dragStartPos.current = {
      x: fixture.vizX ?? auto.x,
      y: fixture.vizY ?? auto.y,
    }
  }, [locked, fixtures])

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
      {expanded && <div className={styles.dragHandle} onMouseDown={onResizeStart} />}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft} onClick={() => setExpanded((v) => !v)}>
          <svg
            data-testid="viz-toggle"
            className={`${styles.chevron}${expanded ? ` ${styles.chevronExpanded}` : ''}`}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M6 15l6-6 6 6"/>
          </svg>
          <span className={styles.toolbarLabel}>Visualizer</span>
          {!expanded && <div className={styles.compactStrip}>{compactDots}</div>}
        </div>
        {expanded && (
          <div className={styles.toolbarRight}>
            <button
              className={styles.sizeBtn}
              onClick={() => setBulbSize((s) => Math.max(MIN_BULB_SIZE, s - BULB_STEP))}
              disabled={bulbSize <= MIN_BULB_SIZE}
              title="Smaller lights"
            >
              −
            </button>
            <button
              className={styles.sizeBtn}
              onClick={() => setBulbSize((s) => Math.min(MAX_BULB_SIZE, s + BULB_STEP))}
              disabled={bulbSize >= MAX_BULB_SIZE}
              title="Larger lights"
            >
              +
            </button>
            <button
              className={`${styles.lockBtn}${locked ? '' : ` ${styles.unlocked}`}`}
              onClick={() => setLocked((v) => !v)}
              title={locked ? 'Unlock to rearrange lights' : 'Lock layout'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {locked ? (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </>
                ) : (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                  </>
                )}
              </svg>
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div
          ref={stageRef}
          className={`${styles.stage}${!locked ? ` ${styles.editable}` : ''}`}
          data-testid="viz-lights"
        >
          {fixtures.map((fixture, i) => {
            const color = getFixtureColor(fixture)
            const intensity = getFixtureIntensity(fixture) / 255
            const glowSize = Math.round(intensity * bulbSize * 0.5)
            const auto = autoLayout(i, fixtures.length)
            const x = fixture.vizX ?? auto.x
            const y = fixture.vizY ?? auto.y
            return (
              <div
                key={fixture.id}
                className={`${styles.light}${!locked ? ` ${styles.draggable}` : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onMouseDown={(e) => onFixtureDragStart(e, fixture)}
              >
                <div
                  className={styles.lightBulb}
                  style={{
                    width: bulbSize,
                    height: bulbSize,
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
