import { useState, useRef } from 'react'
import type { Fixture, GroupChannelOverride } from '../../../shared/types'
import { channelValuesToDisplayHex } from '../../utils/colorSync'
import { clampValue } from '../../../shared/dmx-utils'
import { useOwnerWindow } from '../PopoutWindow'
import { useStageResize } from './useStageResize'
import { useLightDrag } from './useLightDrag'
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
}

const DEFAULT_HEIGHT = 250
const MIN_BULB_SIZE = 20
const MAX_BULB_SIZE = 120
const DEFAULT_BULB_SIZE = 48
const BULB_STEP = 8

export function LightVisualizer({ fixtures, getChannel, overrideMap = {}, onFixtureVizChange, popped = false, onPopout, onDock }: Props) {
  const ownerWindow = useOwnerWindow()
  const { expanded, setExpanded, height, onResizeStart, MIN_HEIGHT } = useStageResize(DEFAULT_HEIGHT, ownerWindow)
  const [isEditing, setIsEditing] = useState(false)
  const [bulbSize, setBulbSize] = useState(DEFAULT_BULB_SIZE)
  const [showUnplaced, setShowUnplaced] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  const {
    gridCols, gridRows,
    placedFixtures, unplacedFixtures,
    handleDuplicate, handleRemove, handleAutoPlace,
    addCol, removeCol, addRow, removeRow,
    canRemoveLeftCol, canRemoveRightCol, canRemoveTopRow, canRemoveBottomRow,
  } = useGridEditor({ fixtures, onFixtureVizChange })

  const { sidebarDrag, onLightDragStart, startSidebarDrag } = useLightDrag({
    fixtures, gridCols, gridRows, isEditing, ownerWindow, stageRef, onFixtureVizChange,
  })

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
          {!expanded && !popped && <div className={styles.compactStrip}>{compactDots}</div>}
        </div>
        {expanded && (
          <div className={styles.toolbarRight}>
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
        )}
      </div>
      {(expanded || popped) && (
        <div className={styles.stageOuter}>
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
              <div className={`${styles.stage}${isEditing ? ` ${styles.stageEditable}` : ''}`}>
                <div ref={stageRef} className={styles.stageContent} data-testid="viz-lights">
                  {gridPoints}
                  {placedFixtures.map((fixture) => {
                    const color = getFixtureColor(fixture)
                    const intensity = getFixtureIntensity(fixture) / 255
                    const glowSize = Math.round(intensity * bulbSize * 0.25)
                    const positions = getPositions(fixture)
                    return positions.map((pos, pi) => (
                      <div
                        key={`${fixture.id}-${pi}`}
                        className={`${styles.light}${isEditing ? ` ${styles.draggable}` : ''}`}
                        style={{ left: `${colToPercent(pos.col, gridCols)}%`, top: `${rowToPercent(pos.row, gridRows)}%` }}
                        onMouseDown={(e) => onLightDragStart(e, fixture.id, pi, pos)}
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
                            boxShadow: intensity > 0.05 ? `0 0 ${glowSize}px ${Math.round(glowSize * 0.6)}px ${color}` : 'none',
                          }}
                        >
                          {isEditing && <span className={styles.channelLabel}>{fixture.universe + 1}-{fixture.channel}</span>}
                        </div>
                        <div className={`${styles.lightInfo}${showLabels ? ` ${styles.lightInfoVisible}` : ''}`}>
                          <span className={styles.lightLabel}>{fixture.name}{positions.length > 1 ? ` ${pi + 1}` : ''}</span>
                          <span className={styles.lightValue}>{Math.round(intensity * 100)}%</span>
                        </div>
                      </div>
                    ))
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
            {showUnplaced && unplacedFixtures.length > 0 && (
              <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                  <span className={styles.sidebarTitle}>Unplaced</span>
                  <button className={styles.sidebarAutoBtn} onClick={handleAutoPlace} title="Auto-place all">Auto</button>
                </div>
                <div className={styles.sidebarList}>
                  {unplacedFixtures.map((f) => (
                    <div key={f.id} className={styles.sidebarItem} onMouseDown={(e) => startSidebarDrag(f.id, e)}>
                      <span className={styles.sidebarChannel}>{f.universe + 1}-{f.channel}</span>
                      <span className={styles.sidebarName}>{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {sidebarDrag && (() => {
        const fixture = fixtures.find((f) => f.id === sidebarDrag.fixtureId)
        if (!fixture) return null
        const color = getFixtureColor(fixture)
        const intensity = getFixtureIntensity(fixture) / 255
        return (
          <>
            <div className={styles.dragGhost} style={{ left: sidebarDrag.mouseX, top: sidebarDrag.mouseY, width: bulbSize, height: bulbSize, fontSize: Math.max(9, Math.round(bulbSize * 0.28)), backgroundColor: intensity > 0 ? color : '#000000' }}>
              <span className={styles.channelLabel}>{fixture.universe + 1}-{fixture.channel}</span>
            </div>
            {sidebarDrag.overStage && stageRef.current && (
              <div className={styles.snapIndicator} style={{
                left: stageRef.current.getBoundingClientRect().left + (colToPercent(sidebarDrag.snappedCol, gridCols) / 100) * stageRef.current.getBoundingClientRect().width,
                top: stageRef.current.getBoundingClientRect().top + (rowToPercent(sidebarDrag.snappedRow, gridRows) / 100) * stageRef.current.getBoundingClientRect().height,
                width: bulbSize + 8, height: bulbSize + 8,
              }} />
            )}
          </>
        )
      })()}
    </div>
  )
}
