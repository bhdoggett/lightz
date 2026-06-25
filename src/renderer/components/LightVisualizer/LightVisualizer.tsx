import { useState, useRef, useCallback, useEffect } from 'react'
import type { Fixture, GroupChannelOverride } from '../../../shared/types'
import { channelValuesToDisplayHex } from '../../utils/colorSync'
import { clampValue } from '../../../shared/dmx-utils'
import { useOwnerWindow } from '../PopoutWindow'
import { useStageResize } from './useStageResize'
import { useLightDrag } from './useLightDrag'
import { useMarqueeSelect } from './useMarqueeSelect'
import { useGridEditor } from './useGridEditor'
import { getPositions, colToPercent, rowToPercent } from './vizUtils'
import styles from './LightVisualizer.module.css'

interface Props {
  fixtures: Fixture[]
  getChannel: (universe: 0 | 1, channel: number) => number
  overrideMap?: Record<string, GroupChannelOverride>
  onFixtureVizChange?: (fixtureId: string, vizPositions: import('../../../shared/types').VizPosition[]) => void
  popped?: boolean
  onPopout?: () => void
  onDock?: () => void
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

const DEFAULT_HEIGHT = 250
const MIN_BULB_SIZE = 20
const MAX_BULB_SIZE = 120
const DEFAULT_BULB_SIZE = 48
const BULB_STEP = 8

export function LightVisualizer({ fixtures, getChannel, overrideMap = {}, onFixtureVizChange, popped = false, onPopout, onDock, defaultExpanded = false, onExpandedChange }: Props) {
  const ownerWindow = useOwnerWindow()
  const { expanded, setExpanded, height, onResizeStart, MIN_HEIGHT } = useStageResize(DEFAULT_HEIGHT, ownerWindow, defaultExpanded)
  const [isEditing, setIsEditing] = useState(false)
  const [bulbSize, setBulbSize] = useState(DEFAULT_BULB_SIZE)
  const [showUnplaced, setShowUnplaced] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [fitMode, setFitMode] = useState(true)
  const [zoom, setZoom] = useState(100)
  const stageRef = useRef<HTMLDivElement>(null)
  const [selectedUnplaced, setSelectedUnplaced] = useState<Set<string>>(new Set())
  const lastClickedRef = useRef<string | null>(null)
  const pendingClickNarrow = useRef<string | null>(null)
  const lastClickedStageRef = useRef<string | null>(null)

  useEffect(() => {
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.metaKey) {
      e.preventDefault()
      const step = e.deltaY > 0 ? -2 : 2
      setBulbSize((s) => Math.max(MIN_BULB_SIZE, Math.min(MAX_BULB_SIZE, s + step)))
    } else if (e.ctrlKey && !fitMode) {
      // trackpad pinch reports ctrlKey — use for zoom in scroll mode
      e.preventDefault()
      setZoom((z) => Math.max(15, Math.min(300, z - Math.round(e.deltaY * 0.3))))
    }
    // plain scroll: let browser handle natively (scrolling in scroll mode)
  }, [fitMode])

  useEffect(() => {
    const el = stageRef.current
    if (!el || (!expanded && !popped)) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel, expanded, popped])

  useEffect(() => {
    if (popped) return
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'v' && !e.shiftKey) {
        e.preventDefault()
        setExpanded((v) => !v)
      } else if (e.key === 'V' && e.shiftKey) {
        e.preventDefault()
        onPopout?.()
      }
    }
    ownerWindow.addEventListener('keydown', onKey)
    return () => ownerWindow.removeEventListener('keydown', onKey)
  }, [popped, onPopout, ownerWindow, setExpanded])

  const {
    gridCols, gridRows,
    placedFixtures, unplacedFixtures,
    handleDuplicate, handleRemove, handleAutoPlace,
    addCol, removeCol, addRow, removeRow,
    canRemoveLeftCol, canRemoveRightCol, canRemoveTopRow, canRemoveBottomRow,
  } = useGridEditor({ fixtures, onFixtureVizChange })

  const { marquee, selectedStage, setSelectedStage, startMarquee, clearStageSelection } = useMarqueeSelect({
    fixtures: placedFixtures, gridCols, gridRows, isEditing, ownerWindow, stageRef,
  })

  const { sidebarDrag, stageDrag, onLightDragStart, startSidebarDrag } = useLightDrag({
    fixtures, gridCols, gridRows, isEditing, ownerWindow, stageRef, onFixtureVizChange,
    selectedStage,
  })

  useEffect(() => {
    if (!isEditing || selectedStage.size === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      e.preventDefault()
      const toRemove = new Map<string, Set<number>>()
      for (const key of selectedStage) {
        const [fId, piStr] = key.split(':')
        if (!toRemove.has(fId)) toRemove.set(fId, new Set())
        toRemove.get(fId)!.add(parseInt(piStr, 10))
      }
      for (const [fId, indices] of toRemove) {
        const fixture = fixtures.find((f) => f.id === fId)
        if (!fixture) continue
        const remaining = getPositions(fixture).filter((_, i) => !indices.has(i))
        onFixtureVizChange?.(fId, remaining)
      }
      setSelectedStage(new Set())
    }
    ownerWindow.addEventListener('keydown', onKey)
    return () => ownerWindow.removeEventListener('keydown', onKey)
  }, [isEditing, selectedStage, fixtures, onFixtureVizChange, ownerWindow, setSelectedStage])

  useEffect(() => {
    const unplacedIds = new Set(unplacedFixtures.map((f) => f.id))
    setSelectedUnplaced((prev) => {
      const cleaned = new Set([...prev].filter((id) => unplacedIds.has(id)))
      return cleaned.size === prev.size ? prev : cleaned
    })
  }, [unplacedFixtures])

  const handleSidebarMouseDown = useCallback((fixtureId: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      setSelectedUnplaced((prev) => {
        const next = new Set(prev)
        if (next.has(fixtureId)) next.delete(fixtureId)
        else next.add(fixtureId)
        return next
      })
      lastClickedRef.current = fixtureId
      return
    }
    if (e.shiftKey && lastClickedRef.current) {
      const lastIdx = unplacedFixtures.findIndex((f) => f.id === lastClickedRef.current)
      const curIdx = unplacedFixtures.findIndex((f) => f.id === fixtureId)
      if (lastIdx >= 0 && curIdx >= 0) {
        const from = Math.min(lastIdx, curIdx)
        const to = Math.max(lastIdx, curIdx)
        setSelectedUnplaced((prev) => {
          const next = new Set(prev)
          for (let i = from; i <= to; i++) next.add(unplacedFixtures[i].id)
          return next
        })
      }
      return
    }
    if (selectedUnplaced.has(fixtureId)) {
      pendingClickNarrow.current = fixtureId
      const ids = unplacedFixtures.filter((f) => selectedUnplaced.has(f.id)).map((f) => f.id)
      startSidebarDrag(ids, e)
    } else {
      pendingClickNarrow.current = null
      setSelectedUnplaced(new Set([fixtureId]))
      lastClickedRef.current = fixtureId
      startSidebarDrag([fixtureId], e)
    }
  }, [unplacedFixtures, selectedUnplaced, startSidebarDrag])

  const handleSidebarMouseUp = useCallback(() => {
    if (pendingClickNarrow.current && !sidebarDrag) {
      setSelectedUnplaced(new Set([pendingClickNarrow.current]))
      lastClickedRef.current = pendingClickNarrow.current
    }
    pendingClickNarrow.current = null
  }, [sidebarDrag])

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

  function isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150
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

  const gridPoints = isEditing ? Array.from({ length: gridRows }, (_, r) =>
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
          {(expanded || popped) && unplacedFixtures.length > 0 && (
            <button
              className={`${styles.unplacedBtn}${showUnplaced ? ` ${styles.unplacedBtnActive}` : ''}`}
              onClick={(e) => { e.stopPropagation(); setShowUnplaced((v) => !v); setIsEditing(true) }}
              title={`${unplacedFixtures.length} unplaced fixture${unplacedFixtures.length > 1 ? 's' : ''}`}
            >
              <span className={styles.unplacedCount}>{unplacedFixtures.length}</span>
              <span className={styles.unplacedLabel}>unplaced</span>
            </button>
          )}
          {(expanded || popped) && (
            <>
              <button
                className={`${styles.editBtn}${fitMode ? ` ${styles.editing}` : ''}`}
                onClick={(e) => { e.stopPropagation(); setFitMode((v) => !v) }}
                title={fitMode ? 'Switch to scroll mode' : 'Fit to window'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M8 8L5 5M16 8l3-3M8 16l-3 3M16 16l3 3"/>
                </svg>
              </button>
              {!fitMode && (
                <input
                  className={styles.zoomRange}
                  type="range"
                  min={15}
                  max={300}
                  value={zoom}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  title={`Zoom: ${zoom}%`}
                />
              )}
            </>
          )}
          {!expanded && !popped && <div className={styles.compactStrip}>{compactDots}</div>}
        </div>
        <div className={styles.toolbarRight}>
          {(expanded || popped) && (
            <>
              <button className={styles.sizeBtn} onClick={() => setBulbSize((s) => Math.min(MAX_BULB_SIZE, s + BULB_STEP))} disabled={bulbSize >= MAX_BULB_SIZE} title="Larger lights">+</button>
              <button className={styles.sizeBtn} onClick={() => setBulbSize((s) => Math.max(MIN_BULB_SIZE, s - BULB_STEP))} disabled={bulbSize <= MIN_BULB_SIZE} title="Smaller lights">−</button>
              <button className={`${styles.editBtn}${showLabels ? ` ${styles.editing}` : ''}`} onClick={() => setShowLabels((v) => !v)} title={showLabels ? 'Hide labels' : 'Show labels'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/>
                  <circle cx="7" cy="7" r="1" fill="currentColor"/>
                </svg>
              </button>
              <button className={`${styles.editBtn}${isEditing ? ` ${styles.editing}` : ''}`} onClick={() => { if (isEditing) setShowUnplaced(false); setIsEditing((v) => !v) }} title={isEditing ? 'Done editing' : 'Edit layout'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
              </button>
            </>
          )}
          {popped ? (
            <button className={styles.editBtn} onClick={onDock} title="Dock visualizer back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            </button>
          ) : (
            <button className={styles.editBtn} onClick={onPopout} title="Pop out visualizer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      {(expanded || popped) && (
        <div className={styles.stageAndSidebar}>
        <div className={`${styles.stageOuter}${!fitMode ? ` ${styles.scrollMode}` : ''}`}>
          <div className={styles.stageMiddle}>
            {isEditing && (
              <div className={styles.edgeSide}>
                <button className={styles.edgeBtn} onClick={() => removeCol('left')} disabled={!canRemoveLeftCol}>−</button>
                <button className={styles.edgeBtn} onClick={() => addCol('left')}>+</button>
              </div>
            )}
            <div className={styles.stageColumn}>
              {isEditing && (
                <div className={styles.edgeTop}>
                  <button className={styles.edgeBtn} onClick={() => removeRow('top')} disabled={!canRemoveTopRow}>−</button>
                  <button className={styles.edgeBtn} onClick={() => addRow('top')}>+</button>
                </div>
              )}
              <div
                className={`${styles.stage}${isEditing ? ` ${styles.stageEditable}` : ''}`}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement
                  if (!target.closest(`.${styles.light}`) && !target.closest(`.${styles.edgeBtn}`)) {
                    startMarquee(e)
                  }
                }}
              >
                <div
                  ref={stageRef}
                  className={styles.stageContent}
                  data-testid="viz-lights"
                  style={!fitMode ? (() => {
                    const cellSize = Math.round(80 * zoom / 100)
                    return {
                      width: cellSize * (gridCols - 1),
                      height: cellSize * (gridRows - 1),
                    }
                  })() : undefined}
                >
                  {gridPoints}
                  {marquee && (
                    <div
                      className={styles.marquee}
                      style={{
                        left: Math.min(marquee.x1, marquee.x2) - (stageRef.current?.getBoundingClientRect().left ?? 0),
                        top: Math.min(marquee.y1, marquee.y2) - (stageRef.current?.getBoundingClientRect().top ?? 0),
                        width: Math.abs(marquee.x2 - marquee.x1),
                        height: Math.abs(marquee.y2 - marquee.y1),
                      }}
                    />
                  )}
                  {/* Glow layer — renders below all bulbs */}
                  {placedFixtures.map((fixture) => {
                    const color = getFixtureColor(fixture)
                    const intensity = getFixtureIntensity(fixture) / 255
                    const glowSize = Math.round(intensity * bulbSize * 0.25)
                    if (intensity <= 0.05) return null
                    const positions = getPositions(fixture)
                    return positions.map((pos, pi) => (
                      <div
                        key={`glow-${fixture.id}-${pi}`}
                        className={styles.lightGlow}
                        style={{
                          left: `${colToPercent(pos.col, gridCols)}%`,
                          top: `${rowToPercent(pos.row, gridRows)}%`,
                          width: bulbSize, height: bulbSize,
                          boxShadow: `0 0 ${glowSize}px ${Math.round(glowSize * 0.6)}px ${color}`,
                        }}
                      />
                    ))
                  })}
                  {/* Bulb layer — renders above all glows */}
                  {placedFixtures.map((fixture) => {
                    const color = getFixtureColor(fixture)
                    const intensity = getFixtureIntensity(fixture) / 255
                    const positions = getPositions(fixture)
                    return positions.map((pos, pi) => {
                      const posKey = `${fixture.id}:${pi}`
                      const isSelected = selectedStage.has(posKey)
                      return (
                      <div
                        key={`${fixture.id}-${pi}`}
                        className={`${styles.light}${isEditing ? ` ${styles.draggable}` : ''}${isSelected ? ` ${styles.lightSelected}` : ''}`}
                        style={{ left: `${colToPercent(pos.col, gridCols)}%`, top: `${rowToPercent(pos.row, gridRows)}%` }}
                        onMouseDown={(e) => {
                          if (!isEditing) return
                          if (e.metaKey || e.ctrlKey) {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedStage((prev) => {
                              const next = new Set(prev)
                              if (next.has(posKey)) next.delete(posKey)
                              else next.add(posKey)
                              return next
                            })
                            lastClickedStageRef.current = posKey
                            return
                          }
                          if (e.shiftKey) {
                            e.preventDefault()
                            e.stopPropagation()
                            const last = lastClickedStageRef.current
                            if (last) {
                              const ordered = placedFixtures.flatMap((f) =>
                                getPositions(f).map((p, i) => ({ key: `${f.id}:${i}`, col: p.col, row: p.row }))
                              ).sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col).map((x) => x.key)
                              const fromIdx = ordered.indexOf(last)
                              const toIdx = ordered.indexOf(posKey)
                              if (fromIdx >= 0 && toIdx >= 0) {
                                const lo = Math.min(fromIdx, toIdx)
                                const hi = Math.max(fromIdx, toIdx)
                                setSelectedStage((prev) => {
                                  const next = new Set(prev)
                                  for (let idx = lo; idx <= hi; idx++) next.add(ordered[idx])
                                  return next
                                })
                              }
                            } else {
                              setSelectedStage(new Set([posKey]))
                            }
                            lastClickedStageRef.current = posKey
                            return
                          }
                          // plain click/drag: select this fixture (keep group if already selected)
                          if (!isSelected) {
                            setSelectedStage(new Set([posKey]))
                          }
                          lastClickedStageRef.current = posKey
                          onLightDragStart(e, fixture.id, pi, pos)
                        }}
                      >
                        {isEditing && (
                          <div className={styles.lightActions}>
                            <button className={styles.lightActionBtn} onClick={(e) => { e.stopPropagation(); handleDuplicate(fixture, pi) }} title="Duplicate light">+</button>
                            <button className={styles.lightActionBtn} onClick={(e) => { e.stopPropagation(); handleRemove(fixture, pi) }} title="Remove light">×</button>
                          </div>
                        )}
                        <div
                          className={styles.lightBulb}
                          style={{
                            width: bulbSize, height: bulbSize,
                            fontSize: Math.max(9, Math.round(bulbSize * 0.28)),
                            backgroundColor: intensity > 0 ? color : '#000000',
                          }}
                        >
                          {isEditing && <span className={styles.channelLabel} style={intensity > 0 && isLightColor(color) ? { color: 'rgba(0, 0, 0, 0.8)' } : undefined}>{fixture.universe + 1}-{fixture.channel}</span>}
                        </div>
                        <div className={`${styles.lightInfo}${showLabels ? ` ${styles.lightInfoVisible}` : ''}`}>
                          <span className={styles.lightLabel}>{fixture.name}{positions.length > 1 ? ` ${pi + 1}` : ''}</span>
                          <span className={styles.lightValue}>{Math.round(intensity * 100)}%</span>
                        </div>
                      </div>
                      )
                    })
                  })}
                </div>
              </div>
              {isEditing && (
                <div className={styles.edgeBottom}>
                  <button className={styles.edgeBtn} onClick={() => addRow('bottom')}>+</button>
                  <button className={styles.edgeBtn} onClick={() => removeRow('bottom')} disabled={!canRemoveBottomRow}>−</button>
                </div>
              )}
            </div>
            {isEditing && (
              <div className={styles.edgeSide}>
                <button className={styles.edgeBtn} onClick={() => addCol('right')}>+</button>
                <button className={styles.edgeBtn} onClick={() => removeCol('right')} disabled={!canRemoveRightCol}>−</button>
              </div>
            )}
          </div>
        </div>
        {showUnplaced && unplacedFixtures.length > 0 && (
          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarTitle}>Unplaced</span>
              <button className={styles.sidebarAutoBtn} onClick={handleAutoPlace} title="Auto-place all">Auto</button>
            </div>
            <div className={styles.sidebarList}>
              {unplacedFixtures.map((f) => (
                <div
                  key={f.id}
                  className={`${styles.sidebarItem}${selectedUnplaced.has(f.id) ? ` ${styles.sidebarItemSelected}` : ''}`}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return
                    handleSidebarMouseDown(f.id, e)
                  }}
                  onMouseUp={handleSidebarMouseUp}
                >
                  <span className={styles.sidebarChannel}>{f.universe + 1}-{f.channel}</span>
                  <span className={styles.sidebarName}>{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}
      {sidebarDrag && (() => {
        const dragFixtures = sidebarDrag.fixtureIds.map((id) => fixtures.find((f) => f.id === id)).filter(Boolean) as Fixture[]
        if (dragFixtures.length === 0) return null
        const primary = dragFixtures[0]
        const color = getFixtureColor(primary)
        const intensity = getFixtureIntensity(primary) / 255
        const ghostSize = Math.max(9, Math.round(bulbSize * 0.28))
        return (
          <>
            <div className={styles.dragGhost} style={{ left: sidebarDrag.mouseX, top: sidebarDrag.mouseY, width: bulbSize, height: bulbSize, fontSize: ghostSize, backgroundColor: intensity > 0 ? color : '#000000' }}>
              <span className={styles.channelLabel}>{dragFixtures.length > 1 ? `×${dragFixtures.length}` : `${primary.universe + 1}-${primary.channel}`}</span>
            </div>
            {sidebarDrag.overStage && stageRef.current && (() => {
              const rect = stageRef.current.getBoundingClientRect()
              return dragFixtures.map((_, i) => {
                const col = sidebarDrag.vertical ? sidebarDrag.snappedCol : sidebarDrag.snappedCol + i
                const row = sidebarDrag.vertical ? sidebarDrag.snappedRow + i : sidebarDrag.snappedRow
                if (col >= gridCols || row >= gridRows) return null
                return (
                  <div
                    key={i}
                    className={`${styles.snapIndicator}${!sidebarDrag.valid ? ` ${styles.snapInvalid}` : ''}`}
                    style={{
                      left: rect.left + (colToPercent(col, gridCols) / 100) * rect.width,
                      top: rect.top + (rowToPercent(row, gridRows) / 100) * rect.height,
                      width: bulbSize + 8, height: bulbSize + 8,
                    }}
                  />
                )
              })
            })()}
          </>
        )
      })()}
      {stageDrag && (() => {
        const dragFixtures = stageDrag.fixtureIds.map((id) => fixtures.find((f) => f.id === id)).filter(Boolean) as Fixture[]
        if (dragFixtures.length === 0) return null
        const primary = dragFixtures[0]
        const color = getFixtureColor(primary)
        const intensity = getFixtureIntensity(primary) / 255
        const ghostSize = Math.max(9, Math.round(bulbSize * 0.28))
        return (
          <>
            <div className={styles.dragGhost} style={{ left: stageDrag.mouseX, top: stageDrag.mouseY, width: bulbSize, height: bulbSize, fontSize: ghostSize, backgroundColor: intensity > 0 ? color : '#000000' }}>
              <span className={styles.channelLabel}>{dragFixtures.length > 1 ? `×${dragFixtures.length}` : `${primary.universe + 1}-${primary.channel}`}</span>
            </div>
            {stageRef.current && (() => {
              const rect = stageRef.current.getBoundingClientRect()
              return stageDrag.offsets.map((off, i) => {
                const col = stageDrag.snappedCol + off.col
                const row = stageDrag.snappedRow + off.row
                if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return null
                return (
                  <div
                    key={i}
                    className={`${styles.snapIndicator}${!stageDrag.valid ? ` ${styles.snapInvalid}` : ''}`}
                    style={{
                      left: rect.left + (colToPercent(col, gridCols) / 100) * rect.width,
                      top: rect.top + (rowToPercent(row, gridRows) / 100) * rect.height,
                      width: bulbSize + 8, height: bulbSize + 8,
                    }}
                  />
                )
              })
            })()}
          </>
        )
      })()}
    </div>
  )
}
