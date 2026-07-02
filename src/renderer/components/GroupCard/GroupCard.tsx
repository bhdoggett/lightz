import React, { useState, useRef, useEffect } from 'react'
import { Slider } from '../Slider'
import { FixtureFader } from '../FixtureFader'
import { MultiFixtureFader } from '../MultiFixtureFader'
import type { Group, Fixture } from '../../../shared/types'
import { useDragReorder, type DragHandleProps } from '../../hooks/useDragReorder'
import styles from './GroupCard.module.css'

interface Props {
  group: Group
  fader: number
  fixtures: Fixture[]
  getChannel: (universe: 0 | 1, channel: number) => number
  onFaderChange: (value: number) => void
  onFull: () => void
  onMute: () => void
  onEdit: () => void
  onRename?: (name: string) => void
  onFixtureChange: (fixture: Fixture, value: number) => void
  onMultiFixtureChange: (fixture: Fixture, values: Record<string, number>) => void
  onFixtureRename?: (fixture: Fixture, name: string) => void
  onFixtureEdit?: (fixture: Fixture) => void
  onDropFixture?: (fixtureId: string, index?: number) => void
  onReorderFixtures?: (fixtureIds: string[]) => void
  horizontal?: boolean
  isEditing?: boolean
  selected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  dragHandleProps?: DragHandleProps
  onUnpack?: () => void
}

export function GroupCard({
  group, fader, fixtures, getChannel,
  onFaderChange, onFull, onMute, onEdit, onRename,
  onFixtureChange, onMultiFixtureChange,
  onFixtureRename, onFixtureEdit, onDropFixture, onReorderFixtures,
  horizontal = false,
  isEditing = false, selected = false, onSelect, dragHandleProps, onUnpack,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [fullFlash, setFullFlash] = useState(false)
  const [muteFlash, setMuteFlash] = useState(false)
  const [dropTarget, setDropTarget] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameInputRef.current?.select()
  }, [editingName])

  const startNameEdit = () => {
    if (!onRename) return
    setNameDraft(group.name)
    setEditingName(true)
  }

  const commitNameEdit = () => {
    setEditingName(false)
    if (onRename && nameDraft.trim()) onRename(nameDraft.trim())
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitNameEdit()
    if (e.key === 'Escape') setEditingName(false)
  }

  const handleFull = () => {
    onFull()
    setFullFlash(false)
    requestAnimationFrame(() => setFullFlash(true))
  }

  const handleMute = () => {
    onMute()
    setMuteFlash(false)
    requestAnimationFrame(() => setMuteFlash(true))
  }

  const multiplier = fader / 100

  const {
    dragId: fixtureDragId,
    insertIndex: fixtureInsertIndex,
    containerProps: fixtureContainerProps,
    itemProps: fixtureItemProps,
  } = useDragReorder(fixtures, (reordered) => onReorderFixtures?.(reordered.map((f) => f.id)))

  const handleFixturePanelDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('text/plain')
    const dropIndex = fixtureInsertIndex
    const isMember = fixtures.some((f) => f.id === sourceId)
    fixtureContainerProps.onDrop(e)
    if (sourceId && !isMember && dropIndex !== null) {
      onDropFixture?.(sourceId, dropIndex)
    }
    setDropTarget(false)
  }

  const masterPanel = (
    <div
      className={styles.masterPanel}
      data-testid="group-drop-target"
      onClick={isEditing ? onSelect : undefined}
    >
      <div className={styles.valueRow}>
        {isEditing ? (
          <span
            className={`${styles.faderValue} ${styles.dragHandle}`}
            data-testid="drag-handle"
            onClick={(e) => e.stopPropagation()}
            {...dragHandleProps}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <circle cx="2.5" cy="2.5" r="1.2" />
              <circle cx="7.5" cy="2.5" r="1.2" />
              <circle cx="2.5" cy="7.5" r="1.2" />
              <circle cx="7.5" cy="7.5" r="1.2" />
            </svg>
          </span>
        ) : (
          <span className={styles.faderValue}>{fader}%</span>
        )}
      </div>
      <div className={styles.sliderGuard}>
        <Slider
          value={fader}
          min={0}
          max={100}
          height={120}
          fillColor={group.color}
          onChange={onFaderChange}
        />
        {isEditing && <div className={styles.selectOverlay} data-testid="select-overlay" />}
      </div>
      <div className={styles.controls}>
        <button
          className={`${styles.overrideBtn} ${styles.fullBtn}${fullFlash ? ` ${styles.flash}` : ''}`}
          aria-label="full"
          title="Set all to full"
          onClick={isEditing ? undefined : handleFull}
          onAnimationEnd={() => setFullFlash(false)}
        >○</button>
        <button
          className={`${styles.overrideBtn} ${styles.muteBtn}${muteFlash ? ` ${styles.flash}` : ''}`}
          aria-label="mute"
          title="Set all to off"
          onClick={isEditing ? undefined : handleMute}
          onAnimationEnd={() => setMuteFlash(false)}
        >✕</button>
      </div>
      <div
        className={`${styles.nameArea}${onRename ? ` ${styles.renameable}` : ''}`}
        onClick={isEditing ? undefined : startNameEdit}
      >
        {editingName ? (
          <input
            ref={nameInputRef}
            className={styles.renameInput}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitNameEdit}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder="group name…"
            data-no-drag
          />
        ) : (
          <span className={styles.name}>{group.name}</span>
        )}
      </div>
      <div className={styles.footer}>
        <button
          className={styles.gearBtn}
          aria-label="Edit group"
          title="Edit group"
          onClick={isEditing ? undefined : onEdit}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
            <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098C16.697 19.187 18 20 18 20l2-2-1.484-1.752 1.098-2.652 2.386-.62V11l-2.378-.605Z"/>
          </svg>
        </button>
        <div className={styles.footerRight}>
          {isEditing && (
            <button
              className={styles.unpackBtn}
              aria-label="Unpack group"
              title="Remove group, keep fixtures"
              onClick={(e) => { e.stopPropagation(); onUnpack?.() }}
            >
              Unpack
            </button>
          )}
          <button
            className={styles.expandBtn}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            title={expanded ? 'Collapse group' : 'Expand group'}
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {expanded
                ? <path d="M15 18l-6-6 6-6"/>
                : <path d="M9 18l6-6-6-6"/>}
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div
      data-testid="group-card"
      className={[
        styles.card,
        expanded ? styles.expanded : '',
        selected ? styles.selected : '',
        dropTarget ? styles.dropTarget : '',
      ].filter(Boolean).join(' ')}
      style={{ '--group-color': group.color } as React.CSSProperties}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget(true) }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDropTarget(false)
        const fixtureId = e.dataTransfer.getData('text/plain')
        if (fixtureId && onDropFixture) onDropFixture(fixtureId)
      }}
    >
      {masterPanel}
      {expanded && (
        <div
          className={`${styles.fixturePanel}${horizontal ? ` ${styles.fixturePanelHorizontal}` : ''}`}
          data-testid="fixture-panel"
          onDragOver={isEditing ? fixtureContainerProps.onDragOver : undefined}
          onDragLeave={isEditing ? fixtureContainerProps.onDragLeave : undefined}
          onDrop={isEditing ? handleFixturePanelDrop : undefined}
        >
          {fixtures.map((fixture, fixtureIndex) => {
            const { 'data-drag-id': _unused, ...handleProps } = fixtureItemProps(fixture.id)
            return (
              <React.Fragment key={fixture.id}>
                {isEditing && fixtureInsertIndex === fixtureIndex && (
                  <div className={styles.insertIndicator} aria-hidden="true" />
                )}
                <div
                  data-drag-id={isEditing ? fixture.id : undefined}
                  className={fixture.id === fixtureDragId ? styles.dragging : undefined}
                >
                  {fixture.channels ? (
                    <MultiFixtureFader
                      fixture={fixture}
                      values={Object.fromEntries(
                        fixture.channels.map((ch) => [ch.id, getChannel(ch.universe, ch.channel)])
                      )}
                      onChange={(vals) => onMultiFixtureChange(fixture, vals)}
                      onRename={onFixtureRename ? (name) => onFixtureRename(fixture, name) : undefined}
                      onEdit={onFixtureEdit ? () => onFixtureEdit(fixture) : undefined}
                      groupColor={group.color}
                      groupMultiplier={multiplier}
                      hasRightNeighbor={fixtureIndex < fixtures.length - 1}
                      dragHandleProps={isEditing ? handleProps : undefined}
                    />
                  ) : (
                    <FixtureFader
                      channel={fixture.channel}
                      universe={fixture.universe}
                      name={fixture.name}
                      value={getChannel(fixture.universe, fixture.channel)}
                      onChange={(v) => onFixtureChange(fixture, v)}
                      onRename={onFixtureRename ? (name) => onFixtureRename(fixture, name) : undefined}
                      groupColor={group.color}
                      groupMultiplier={multiplier}
                      dragHandleProps={isEditing ? handleProps : undefined}
                    />
                  )}
                </div>
              </React.Fragment>
            )
          })}
          {isEditing && fixtureInsertIndex === fixtures.length && (
            <div className={styles.insertIndicator} aria-hidden="true" />
          )}
          {fixtures.length === 0 && (
            <span className={styles.empty}>No fixtures — use gear to add</span>
          )}
        </div>
      )}
    </div>
  )
}
