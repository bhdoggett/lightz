import React, { useState } from 'react'
import { Slider } from '../Slider'
import { FixtureFader } from '../FixtureFader'
import { MultiFixtureFader } from '../MultiFixtureFader'
import type { Group, Fixture } from '../../../shared/types'
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
  onFixtureChange: (fixture: Fixture, value: number) => void
  onMultiFixtureChange: (fixture: Fixture, values: Record<string, number>) => void
  onFixtureRename?: (fixture: Fixture, name: string) => void
  onFixtureEdit?: (fixture: Fixture) => void
  onDropFixture?: (fixtureId: string) => void
  horizontal?: boolean
}

export function GroupCard({
  group, fader, fixtures, getChannel,
  onFaderChange, onFull, onMute, onEdit,
  onFixtureChange, onMultiFixtureChange,
  onFixtureRename, onFixtureEdit, onDropFixture,
  horizontal = false,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [fullFlash, setFullFlash] = useState(false)
  const [muteFlash, setMuteFlash] = useState(false)
  const [dropTarget, setDropTarget] = useState(false)

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

  const masterPanel = (
    <div
      className={`${styles.masterPanel}${dropTarget ? ` ${styles.dropTarget}` : ''}`}
      data-testid="group-drop-target"
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
      <div className={styles.valueRow}>
        <span className={styles.faderValue}>{fader}%</span>
        <span className={styles.groupDot} style={{ background: group.color }} />
      </div>
      <div className={styles.sliderWrap}>
        <Slider
          value={fader}
          min={0}
          max={100}
          stretch
          fillColor={group.color}
          onChange={onFaderChange}
        />
      </div>
      <div className={styles.nameArea}>
        <span className={styles.name}>{group.name}</span>
      </div>
      <div className={styles.footer}>
        <button
          className={`${styles.overrideBtn} ${styles.fullBtn}${fullFlash ? ` ${styles.flash}` : ''}`}
          aria-label="full"
          title="Set all to full"
          onClick={handleFull}
          onAnimationEnd={() => setFullFlash(false)}
        >○</button>
        <button
          className={`${styles.overrideBtn} ${styles.muteBtn}${muteFlash ? ` ${styles.flash}` : ''}`}
          aria-label="mute"
          title="Set all to off"
          onClick={handleMute}
          onAnimationEnd={() => setMuteFlash(false)}
        >✕</button>
        <button
          className={styles.gearBtn}
          aria-label="Edit group"
          title="Edit group"
          onClick={onEdit}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
            <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098C16.697 19.187 18 20 18 20l2-2-1.484-1.752 1.098-2.652 2.386-.62V11l-2.378-.605Z"/>
          </svg>
        </button>
        <button
          className={styles.expandBtn}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          title={expanded ? 'Collapse group' : 'Expand group'}
          onClick={() => setExpanded((v) => !v)}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {expanded
              ? <path d="M15 18l-6-6 6-6"/>
              : <path d="M9 18l6-6-6-6"/>}
          </svg>
        </button>
      </div>
    </div>
  )

  return (
    <div
      className={`${styles.card}${expanded ? ` ${styles.expanded}` : ''}`}
      style={{ '--group-color': group.color } as React.CSSProperties}
    >
      {masterPanel}
      {expanded && (
        <div className={`${styles.fixturePanel}${horizontal ? ` ${styles.fixturePanelHorizontal}` : ''}`}>
          {fixtures.map((fixture) =>
            fixture.channels ? (
              <MultiFixtureFader
                key={fixture.id}
                fixture={fixture}
                values={Object.fromEntries(
                  fixture.channels.map((ch) => [ch.id, getChannel(ch.universe, ch.channel)])
                )}
                onChange={(vals) => onMultiFixtureChange(fixture, vals)}
                onRename={onFixtureRename ? (name) => onFixtureRename(fixture, name) : undefined}
                onEdit={onFixtureEdit ? () => onFixtureEdit(fixture) : undefined}
                groupColor={group.color}
                groupMultiplier={multiplier}
              />
            ) : (
              <FixtureFader
                key={fixture.id}
                channel={fixture.channel}
                universe={fixture.universe}
                name={fixture.name}
                value={getChannel(fixture.universe, fixture.channel)}
                onChange={(v) => onFixtureChange(fixture, v)}
                onRename={onFixtureRename ? (name) => onFixtureRename(fixture, name) : undefined}
                groupColor={group.color}
                groupMultiplier={multiplier}
              />
            )
          )}
          {fixtures.length === 0 && (
            <span className={styles.empty}>No fixtures — use gear to add</span>
          )}
        </div>
      )}
    </div>
  )
}
