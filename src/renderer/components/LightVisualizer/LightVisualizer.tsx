import { useState, useCallback, useRef, useEffect } from 'react'
import type { Fixture, GroupChannelOverride, VizPosition } from '../../../shared/types'
import { channelValuesToDisplayHex } from '../../utils/colorSync'
import { clampValue } from '../../../shared/dmx-utils'
import styles from './LightVisualizer.module.css'

interface Props {
  fixtures: Fixture[]
  getChannel: (universe: 0 | 1, channel: number) => number
  overrideMap?: Record<string, GroupChannelOverride>
  onFixtureVizChange?: (fixtureId: string, vizPositions: VizPosition[]) => void
}

const MIN_HEIGHT = 32
const DEFAULT_HEIGHT = 250
const MAX_HEIGHT = 600
const MIN_BULB_SIZE = 20
const MAX_BULB_SIZE = 120
const DEFAULT_BULB_SIZE = 48
const BULB_STEP = 8
const DEFAULT_COLS = 10
const DEFAULT_ROWS = 6

function autoLayout(index: number, gridCols: number): VizPosition {
  const col = index % gridCols
  const row = Math.floor(index / gridCols)
  return { col, row }
}

function getPositions(fixture: Fixture, fixtureIndex: number, gridCols: number): VizPosition[] {
  if (fixture.vizPositions && fixture.vizPositions.length > 0) return fixture.vizPositions
  return [autoLayout(fixtureIndex, gridCols)]
}

function colToPercent(col: number, totalCols: number): number {
  if (totalCols <= 1) return 50
  return (col / (totalCols - 1)) * 100
}

function rowToPercent(row: number, totalRows: number): number {
  if (totalRows <= 1) return 50
  return (row / (totalRows - 1)) * 100
}

function hasFixtureAt(fixtures: Fixture[], axis: 'col' | 'row', index: number, gridCols: number): boolean {
  for (let fi = 0; fi < fixtures.length; fi++) {
    const positions = getPositions(fixtures[fi], fi, gridCols)
    for (const pos of positions) {
      if (pos[axis] === index) return true
    }
  }
  return false
}

export function LightVisualizer({ fixtures, getChannel, overrideMap = {}, onFixtureVizChange }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [locked, setLocked] = useState(true)
  const [bulbSize, setBulbSize] = useState(DEFAULT_BULB_SIZE)
  const [gridCols, setGridCols] = useState(DEFAULT_COLS)
  const [gridRows, setGridRows] = useState(DEFAULT_ROWS)
  const resizing = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const dragRef = useRef<{ fixtureId: string; posIndex: number } | null>(null)
  const dragStartMouse = useRef({ x: 0, y: 0 })
  const dragStartPos = useRef({ col: 0, row: 0 })
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
      if (dragRef.current && stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect()
        const pctX = ((e.clientX - rect.left) / rect.width) * 100
        const pctY = ((e.clientY - rect.top) / rect.height) * 100
        const col = Math.round((pctX / 100) * (gridCols - 1))
        const row = Math.round((pctY / 100) * (gridRows - 1))
        const snappedCol = Math.max(0, Math.min(gridCols - 1, col))
        const snappedRow = Math.max(0, Math.min(gridRows - 1, row))
        const { fixtureId, posIndex } = dragRef.current
        const fixture = fixtures.find((f) => f.id === fixtureId)
        if (!fixture) return
        const positions = [...getPositions(fixture, fixtures.indexOf(fixture), gridCols)]
        if (positions[posIndex].col !== snappedCol || positions[posIndex].row !== snappedRow) {
          positions[posIndex] = { col: snappedCol, row: snappedRow }
          onFixtureVizChange?.(fixtureId, positions)
        }
      }
    }
    const onUp = () => {
      resizing.current = false
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [fixtures, onFixtureVizChange, gridCols, gridRows])

  const onLightDragStart = useCallback((e: React.MouseEvent, fixtureId: string, posIndex: number, pos: VizPosition) => {
    if (locked) return
    e.preventDefault()
    e.stopPropagation()
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    dragRef.current = { fixtureId, posIndex }
    dragStartMouse.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
    dragStartPos.current = { col: pos.col, row: pos.row }
  }, [locked])

  const handleDuplicate = useCallback((fixture: Fixture, posIndex: number) => {
    const positions = getPositions(fixture, fixtures.indexOf(fixture), gridCols)
    const source = positions[posIndex]
    const newPos: VizPosition = {
      col: Math.min(gridCols - 1, source.col + 1),
      row: source.row,
    }
    onFixtureVizChange?.(fixture.id, [...positions, newPos])
  }, [fixtures, onFixtureVizChange, gridCols])

  const handleRemove = useCallback((fixture: Fixture, posIndex: number) => {
    const positions = getPositions(fixture, fixtures.indexOf(fixture), gridCols)
    if (positions.length <= 1) return
    const next = positions.filter((_, i) => i !== posIndex)
    onFixtureVizChange?.(fixture.id, next)
  }, [fixtures, onFixtureVizChange])

  const addCol = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture, fixtures.indexOf(fixture), gridCols)
        const shifted = positions.map((p) => ({ col: p.col + 1, row: p.row }))
        onFixtureVizChange?.(fixture.id, shifted)
      }
    }
    setGridCols((c) => c + 1)
  }, [fixtures, onFixtureVizChange])

  const removeCol = useCallback((side: 'left' | 'right') => {
    const edgeCol = side === 'left' ? 0 : gridCols - 1
    if (hasFixtureAt(fixtures, 'col', edgeCol, gridCols)) return
    if (gridCols <= 3) return
    if (side === 'left') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture, fixtures.indexOf(fixture), gridCols)
        const shifted = positions.map((p) => ({ col: p.col - 1, row: p.row }))
        onFixtureVizChange?.(fixture.id, shifted)
      }
    }
    setGridCols((c) => c - 1)
  }, [fixtures, onFixtureVizChange, gridCols])

  const addRow = useCallback((side: 'top' | 'bottom') => {
    if (side === 'top') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture, fixtures.indexOf(fixture), gridCols)
        const shifted = positions.map((p) => ({ col: p.col, row: p.row + 1 }))
        onFixtureVizChange?.(fixture.id, shifted)
      }
    }
    setGridRows((r) => r + 1)
  }, [fixtures, onFixtureVizChange])

  const removeRow = useCallback((side: 'top' | 'bottom') => {
    const edgeRow = side === 'top' ? 0 : gridRows - 1
    if (hasFixtureAt(fixtures, 'row', edgeRow, gridCols)) return
    if (gridRows <= 3) return
    if (side === 'top') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture, fixtures.indexOf(fixture), gridCols)
        const shifted = positions.map((p) => ({ col: p.col, row: p.row - 1 }))
        onFixtureVizChange?.(fixture.id, shifted)
      }
    }
    setGridRows((r) => r - 1)
  }, [fixtures, onFixtureVizChange, gridRows])

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
    const count = (f.vizPositions?.length) || 1
    return Array.from({ length: count }, (_, i) => (
      <div
        key={`${f.id}-${i}`}
        className={styles.compactDot}
        style={{ background: intensity > 0 ? color : '#000000' }}
      />
    ))
  }).flat() : null

  const gridPoints = !locked ? Array.from({ length: gridRows }, (_, r) =>
    Array.from({ length: gridCols }, (_, c) => (
      <div
        key={`gp-${c}-${r}`}
        className={styles.gridPoint}
        style={{
          left: `${colToPercent(c, gridCols)}%`,
          top: `${rowToPercent(r, gridRows)}%`,
        }}
      />
    ))
  ).flat() : null

  const canRemoveLeftCol = gridCols > 3 && !hasFixtureAt(fixtures, 'col', 0, gridCols)
  const canRemoveRightCol = gridCols > 3 && !hasFixtureAt(fixtures, 'col', gridCols - 1, gridCols)
  const canRemoveTopRow = gridRows > 3 && !hasFixtureAt(fixtures, 'row', 0, gridCols)
  const canRemoveBottomRow = gridRows > 3 && !hasFixtureAt(fixtures, 'row', gridRows - 1, gridCols)

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
            >−</button>
            <div className={styles.sizeSwatch} style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid var(--text-muted)' }} />
            <button
              className={styles.sizeBtn}
              onClick={() => setBulbSize((s) => Math.min(MAX_BULB_SIZE, s + BULB_STEP))}
              disabled={bulbSize >= MAX_BULB_SIZE}
              title="Larger lights"
            >+</button>
            <button
              className={`${styles.lockBtn}${locked ? '' : ` ${styles.unlocked}`}`}
              onClick={() => setLocked((v) => !v)}
              title={locked ? 'Unlock to rearrange lights' : 'Lock layout'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d={locked ? 'M7 11V7a5 5 0 0 1 10 0v4' : 'M7 11V7a5 5 0 0 1 9.9-1'}/>
              </svg>
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div className={`${styles.stageOuter}${!locked ? ` ${styles.editing}` : ''}`}>
          {!locked && (
            <div className={styles.edgeTop}>
              <button className={styles.edgeBtn} onClick={() => removeRow('top')} disabled={!canRemoveTopRow}>−</button>
              <button className={styles.edgeBtn} onClick={() => addRow('top')}>+</button>
            </div>
          )}
          <div className={styles.stageMiddle}>
            {!locked && (
              <div className={styles.edgeSide}>
                <button className={styles.edgeBtn} onClick={() => removeCol('left')} disabled={!canRemoveLeftCol}>−</button>
                <button className={styles.edgeBtn} onClick={() => addCol('left')}>+</button>
              </div>
            )}
            <div className={`${styles.stage}${!locked ? ` ${styles.stageEditable}` : ''}`}>
              <div
                ref={stageRef}
                className={styles.stageContent}
                data-testid="viz-lights"
              >
              {gridPoints}
              {fixtures.map((fixture, fi) => {
                const color = getFixtureColor(fixture)
                const intensity = getFixtureIntensity(fixture) / 255
                const glowSize = Math.round(intensity * bulbSize * 0.5)
                const positions = getPositions(fixture, fi, gridCols)
                return positions.map((pos, pi) => (
                  <div
                    key={`${fixture.id}-${pi}`}
                    className={`${styles.light}${!locked ? ` ${styles.draggable}` : ''}`}
                    style={{
                      left: `${colToPercent(pos.col, gridCols)}%`,
                      top: `${rowToPercent(pos.row, gridRows)}%`,
                    }}
                    onMouseDown={(e) => onLightDragStart(e, fixture.id, pi, pos)}
                  >
                    {!locked && (
                      <div className={styles.lightActions}>
                        <button
                          className={styles.lightActionBtn}
                          onClick={(e) => { e.stopPropagation(); handleDuplicate(fixture, pi) }}
                          title="Duplicate light"
                        >+</button>
                        {positions.length > 1 && (
                          <button
                            className={styles.lightActionBtn}
                            onClick={(e) => { e.stopPropagation(); handleRemove(fixture, pi) }}
                            title="Remove light"
                          >×</button>
                        )}
                      </div>
                    )}
                    <div
                      className={styles.lightBulb}
                      style={{
                        width: bulbSize,
                        height: bulbSize,
                        fontSize: Math.max(9, Math.round(bulbSize * 0.28)),
                        backgroundColor: intensity > 0 ? color : '#000000',
                        boxShadow: intensity > 0.05
                          ? `0 0 ${glowSize}px ${Math.round(glowSize * 0.6)}px ${color}`
                          : 'none',
                      }}
                    >
                      {!locked && <span className={styles.channelLabel}>{fixture.channel}</span>}
                    </div>
                    <span className={styles.lightLabel}>
                      {fixture.name}{positions.length > 1 ? ` ${pi + 1}` : ''}
                    </span>
                    <span className={styles.lightValue}>
                      {Math.round(intensity * 100)}%
                    </span>
                  </div>
                ))
              })}
              </div>
            </div>
            {!locked && (
              <div className={styles.edgeSide}>
                <button className={styles.edgeBtn} onClick={() => addCol('right')}>+</button>
                <button className={styles.edgeBtn} onClick={() => removeCol('right')} disabled={!canRemoveRightCol}>−</button>
              </div>
            )}
          </div>
          {!locked && (
            <div className={styles.edgeBottom}>
              <button className={styles.edgeBtn} onClick={() => addRow('bottom')}>+</button>
              <button className={styles.edgeBtn} onClick={() => removeRow('bottom')} disabled={!canRemoveBottomRow}>−</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
