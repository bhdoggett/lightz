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
  popped?: boolean
  onPopout?: () => void
  onDock?: () => void
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

function isPlaced(fixture: Fixture): boolean {
  return !!(fixture.vizPositions && fixture.vizPositions.length > 0)
}

function getPositions(fixture: Fixture): VizPosition[] {
  return fixture.vizPositions ?? []
}

function colToPercent(col: number, totalCols: number): number {
  if (totalCols <= 1) return 50
  return (col / (totalCols - 1)) * 100
}

function rowToPercent(row: number, totalRows: number): number {
  if (totalRows <= 1) return 50
  return (row / (totalRows - 1)) * 100
}

function hasFixtureAt(fixtures: Fixture[], axis: 'col' | 'row', index: number): boolean {
  for (const fixture of fixtures) {
    for (const pos of getPositions(fixture)) {
      if (pos[axis] === index) return true
    }
  }
  return false
}

export function LightVisualizer({ fixtures, getChannel, overrideMap = {}, onFixtureVizChange, popped = false, onPopout, onDock }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [locked, setLocked] = useState(true)
  const [bulbSize, setBulbSize] = useState(DEFAULT_BULB_SIZE)
  const [gridCols, setGridCols] = useState(DEFAULT_COLS)
  const [gridRows, setGridRows] = useState(DEFAULT_ROWS)
  const [showUnplaced, setShowUnplaced] = useState(false)
  const [sidebarDrag, setSidebarDrag] = useState<{ fixtureId: string; mouseX: number; mouseY: number; snappedCol: number; snappedRow: number; overStage: boolean } | null>(null)
  const placedFixtures = fixtures.filter(isPlaced)
  const unplacedFixtures = fixtures.filter((f) => !isPlaced(f))
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
        const positions = [...getPositions(fixture)]
        if (positions[posIndex].col !== snappedCol || positions[posIndex].row !== snappedRow) {
          positions[posIndex] = { col: snappedCol, row: snappedRow }
          onFixtureVizChange?.(fixtureId, positions)
        }
      }
      setSidebarDrag((prev) => {
        if (!prev) return null
        let overStage = false
        let snappedCol = prev.snappedCol
        let snappedRow = prev.snappedRow
        if (stageRef.current) {
          const rect = stageRef.current.getBoundingClientRect()
          overStage = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
          if (overStage) {
            const pctX = ((e.clientX - rect.left) / rect.width) * 100
            const pctY = ((e.clientY - rect.top) / rect.height) * 100
            snappedCol = Math.max(0, Math.min(gridCols - 1, Math.round((pctX / 100) * (gridCols - 1))))
            snappedRow = Math.max(0, Math.min(gridRows - 1, Math.round((pctY / 100) * (gridRows - 1))))
          }
        }
        return { ...prev, mouseX: e.clientX, mouseY: e.clientY, overStage, snappedCol, snappedRow }
      })
    }
    const onUp = () => {
      setSidebarDrag((prev) => {
        if (prev && prev.overStage) {
          onFixtureVizChange?.(prev.fixtureId, [{ col: prev.snappedCol, row: prev.snappedRow }])
        }
        return null
      })
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
    const positions = getPositions(fixture)
    const source = positions[posIndex]
    const newPos: VizPosition = {
      col: Math.min(gridCols - 1, source.col + 1),
      row: source.row,
    }
    onFixtureVizChange?.(fixture.id, [...positions, newPos])
  }, [fixtures, onFixtureVizChange, gridCols])

  const handleRemove = useCallback((fixture: Fixture, posIndex: number) => {
    const positions = getPositions(fixture)
    const next = positions.filter((_, i) => i !== posIndex)
    onFixtureVizChange?.(fixture.id, next)
  }, [fixtures, onFixtureVizChange])

  const handleAutoPlace = useCallback(() => {
    let col = 0
    let row = 0
    let cols = gridCols
    let rows = gridRows
    const occupied = new Set<string>()
    for (const f of placedFixtures) {
      for (const p of getPositions(f)) occupied.add(`${p.col}-${p.row}`)
    }
    for (const fixture of unplacedFixtures) {
      while (occupied.has(`${col}-${row}`)) {
        col++
        if (col >= cols) { col = 0; row++ }
        if (row >= rows) { rows++; setGridRows(rows) }
      }
      occupied.add(`${col}-${row}`)
      onFixtureVizChange?.(fixture.id, [{ col, row }])
      col++
      if (col >= cols) { col = 0; row++ }
    }
    if (rows > gridRows) setGridRows(rows)
  }, [placedFixtures, unplacedFixtures, gridCols, gridRows, onFixtureVizChange])

  const addCol = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
        const shifted = positions.map((p) => ({ col: p.col + 1, row: p.row }))
        onFixtureVizChange?.(fixture.id, shifted)
      }
    }
    setGridCols((c) => c + 1)
  }, [fixtures, onFixtureVizChange])

  const removeCol = useCallback((side: 'left' | 'right') => {
    const edgeCol = side === 'left' ? 0 : gridCols - 1
    if (hasFixtureAt(fixtures, 'col', edgeCol)) return
    if (gridCols <= 3) return
    if (side === 'left') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
        const shifted = positions.map((p) => ({ col: p.col - 1, row: p.row }))
        onFixtureVizChange?.(fixture.id, shifted)
      }
    }
    setGridCols((c) => c - 1)
  }, [fixtures, onFixtureVizChange, gridCols])

  const addRow = useCallback((side: 'top' | 'bottom') => {
    if (side === 'top') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
        const shifted = positions.map((p) => ({ col: p.col, row: p.row + 1 }))
        onFixtureVizChange?.(fixture.id, shifted)
      }
    }
    setGridRows((r) => r + 1)
  }, [fixtures, onFixtureVizChange])

  const removeRow = useCallback((side: 'top' | 'bottom') => {
    const edgeRow = side === 'top' ? 0 : gridRows - 1
    if (hasFixtureAt(fixtures, 'row', edgeRow)) return
    if (gridRows <= 3) return
    if (side === 'top') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
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

  const canRemoveLeftCol = gridCols > 3 && !hasFixtureAt(fixtures, 'col', 0)
  const canRemoveRightCol = gridCols > 3 && !hasFixtureAt(fixtures, 'col', gridCols - 1)
  const canRemoveTopRow = gridRows > 3 && !hasFixtureAt(fixtures, 'row', 0)
  const canRemoveBottomRow = gridRows > 3 && !hasFixtureAt(fixtures, 'row', gridRows - 1)

  return (
    <div className={`${styles.panel}${popped ? ` ${styles.popped}` : ''}`} style={popped ? undefined : { height: expanded ? height : MIN_HEIGHT }}>
      {expanded && !popped && <div className={styles.dragHandle} onMouseDown={onResizeStart} />}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft} onClick={popped ? undefined : () => setExpanded((v) => !v)}>
          {!popped && (
            <svg
              data-testid="viz-toggle"
              className={`${styles.chevron}${expanded ? ` ${styles.chevronExpanded}` : ''}`}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M6 15l6-6 6 6"/>
            </svg>
          )}
          <span className={styles.toolbarLabel}>Visualizer</span>
          {!expanded && !popped && <div className={styles.compactStrip}>{compactDots}</div>}
        </div>
        {(expanded || popped) && !locked && unplacedFixtures.length > 0 && (
          <button
            className={`${styles.sizeBtn}${showUnplaced ? ` ${styles.sizeBtnActive}` : ''}`}
            onClick={() => setShowUnplaced((v) => !v)}
            title={`${unplacedFixtures.length} unplaced fixture${unplacedFixtures.length > 1 ? 's' : ''}`}
          >
            {unplacedFixtures.length}
          </button>
        )}
        {expanded && (
          <div className={styles.toolbarRight}>
            <button
              className={styles.sizeBtn}
              onClick={() => setBulbSize((s) => Math.min(MAX_BULB_SIZE, s + BULB_STEP))}
              disabled={bulbSize >= MAX_BULB_SIZE}
              title="Larger lights"
            >+</button>
            <button
              className={styles.sizeBtn}
              onClick={() => setBulbSize((s) => Math.max(MIN_BULB_SIZE, s - BULB_STEP))}
              disabled={bulbSize <= MIN_BULB_SIZE}
              title="Smaller lights"
            >−</button>
            <button
              className={`${styles.editBtn}${!locked ? ` ${styles.editing}` : ''}`}
              onClick={() => setLocked((v) => !v)}
              title={locked ? 'Edit layout' : 'Done editing'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </button>
            {popped ? (
              <button
                className={styles.editBtn}
                onClick={onDock}
                title="Dock visualizer back"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </button>
            ) : (
              <button
                className={styles.editBtn}
                onClick={onPopout}
                title="Pop out visualizer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      {(expanded || popped) && (
        <div className={styles.stageOuter}>
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
              {placedFixtures.map((fixture) => {
                const color = getFixtureColor(fixture)
                const intensity = getFixtureIntensity(fixture) / 255
                const glowSize = Math.round(intensity * bulbSize * 0.5)
                const positions = getPositions(fixture)
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
                        <button
                          className={styles.lightActionBtn}
                          onClick={(e) => { e.stopPropagation(); handleRemove(fixture, pi) }}
                          title="Remove light"
                        >×</button>
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
            {!locked && showUnplaced && unplacedFixtures.length > 0 && (
              <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                  <span className={styles.sidebarTitle}>Unplaced</span>
                  <button className={styles.sidebarAutoBtn} onClick={handleAutoPlace} title="Auto-place all">
                    Auto
                  </button>
                </div>
                <div className={styles.sidebarList}>
                  {unplacedFixtures.map((f) => (
                    <div
                      key={f.id}
                      className={styles.sidebarItem}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setSidebarDrag({ fixtureId: f.id, mouseX: e.clientX, mouseY: e.clientY, snappedCol: 0, snappedRow: 0, overStage: false })
                      }}
                    >
                      <span className={styles.sidebarChannel}>{f.channel}</span>
                      <span className={styles.sidebarName}>{f.name}</span>
                    </div>
                  ))}
                </div>
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
      {sidebarDrag && (() => {
        const fixture = fixtures.find((f) => f.id === sidebarDrag.fixtureId)
        if (!fixture) return null
        const color = getFixtureColor(fixture)
        const intensity = getFixtureIntensity(fixture) / 255
        return (
          <>
            <div
              className={styles.dragGhost}
              style={{
                left: sidebarDrag.mouseX,
                top: sidebarDrag.mouseY,
                width: bulbSize,
                height: bulbSize,
                fontSize: Math.max(9, Math.round(bulbSize * 0.28)),
                backgroundColor: intensity > 0 ? color : '#000000',
              }}
            >
              <span className={styles.channelLabel}>{fixture.channel}</span>
            </div>
            {sidebarDrag.overStage && (
              <div
                className={styles.snapIndicator}
                style={{
                  left: stageRef.current
                    ? stageRef.current.getBoundingClientRect().left + (colToPercent(sidebarDrag.snappedCol, gridCols) / 100) * stageRef.current.getBoundingClientRect().width
                    : 0,
                  top: stageRef.current
                    ? stageRef.current.getBoundingClientRect().top + (rowToPercent(sidebarDrag.snappedRow, gridRows) / 100) * stageRef.current.getBoundingClientRect().height
                    : 0,
                  width: bulbSize + 8,
                  height: bulbSize + 8,
                }}
              />
            )}
          </>
        )
      })()}
    </div>
  )
}
