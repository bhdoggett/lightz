import { useState, useRef } from 'react'
import type { Fixture, FixtureChannel } from '../../../shared/types'
import { channelValuesToDisplayHex, pickerHexToChannelValues, isColorRole, roleToFillColor } from '../../utils/colorSync'
import { computeRatios, applyRatios } from '../../utils/gangFader'
import { RawFader } from '../RawFader'
import { ColorPickerPopover } from '../ColorPickerPopover'
import { useApi } from '../../api/context'
import styles from './MultiFixtureFader.module.css'

interface Props {
  fixture: Fixture
  values: Record<string, number>
  onChange: (values: Record<string, number>) => void
  onRename?: (name: string) => void
  onEdit?: () => void
  groupColor?: string
  groupMultiplier?: number
  hasRightNeighbor?: boolean
}

export function MultiFixtureFader({ fixture, values, onChange, onRename, onEdit, groupColor, groupMultiplier, hasRightNeighbor = true }: Props) {
  const api = useApi()
  const channels = fixture.channels!
  const [expanded, setExpanded] = useState(false)
  const ratiosRef = useRef<Record<string, number>>({})
  const cardRef = useRef<HTMLDivElement>(null)
  const [channelLinks, setChannelLinks] = useState<Record<string, boolean>>(
    () => Object.fromEntries(channels.map((ch) => [ch.id, ch.linked]))
  )

  const effectiveChannels = channels.map((ch) => ({ ...ch, linked: channelLinks[ch.id] ?? ch.linked }))

  const colorChannels = channels.filter((ch) => isColorRole(ch.role))
  const linkedChannels = effectiveChannels.filter((ch) => ch.linked)
  const displayHex = channelValuesToDisplayHex(colorChannels, values)
  // Chroma hex excludes white so the picker cursor tracks only what the picker controls
  const chromaHex = channelValuesToDisplayHex(colorChannels.filter((ch) => ch.role !== 'white'), values)

  const masterDisplay = Math.max(...linkedChannels.map((ch) => values[ch.id] ?? 0), 0)

  if (masterDisplay > 0) {
    ratiosRef.current = computeRatios(effectiveChannels, values)
  }

  const handleMasterChange = (newVal: number) => {
    const applied = applyRatios(effectiveChannels, ratiosRef.current, newVal)
    onChange({ ...values, ...applied })
  }

  const handleLinkToggle = async (channelId: string) => {
    const newLinked = !(channelLinks[channelId] ?? true)
    setChannelLinks((prev) => ({ ...prev, [channelId]: newLinked }))
    const updatedChannels = channels.map((ch) =>
      ch.id === channelId ? { ...ch, linked: newLinked } : ch
    )
    await api.updateFixture({ ...fixture, channels: updatedChannels })
  }

  const handleChannelChange = (ch: FixtureChannel, newVal: number) => {
    onChange({ ...values, [ch.id]: newVal })
  }

  const handleColorPick = (hex: string) => {
    const derived = pickerHexToChannelValues(hex, colorChannels)
    const next = { ...values }
    for (const [id, val] of Object.entries(derived)) next[id] = val
    onChange(next)
  }

  const gearBtn = (
    <button
      className={styles.gearBtn}
      onClick={(e) => { e.stopPropagation(); onEdit?.() }}
      title="Edit fixture"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
        <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098C16.697 19.187 18 20 18 20l2-2-1.484-1.752 1.098-2.652 2.386-.62V11l-2.378-.605Z"/>
      </svg>
    </button>
  )

  const colorPicker = colorChannels.length > 0 ? (
    <ColorPickerPopover
      color={chromaHex}
      swatchColor={displayHex}
      anchorRef={cardRef}
      onChange={handleColorPick}
      onClick={(e) => e.stopPropagation()}
    />
  ) : null

  const expandBtn = (
    <button
      className={styles.expandBtn}
      onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev) }}
      title={expanded ? 'Collapse channels' : 'Expand channels'}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {expanded
          ? <path d="M15 18l-6-6 6-6"/>
          : <path d="M9 18l6-6-6-6"/>}
      </svg>
    </button>
  )

  const masterPanel = (
    <>
      <div>
        <RawFader
          value={masterDisplay}
          label={fixture.name}
          onChange={handleMasterChange}
          onRename={onRename}
          fillColor={groupColor}
          groupColor={groupColor}
          groupMultiplier={groupMultiplier}
        />
      </div>
      <div className={styles.controlRow}>
        {gearBtn}
        {colorPicker}
        {expandBtn}
      </div>
    </>
  )

  return (
    <div ref={cardRef} className={styles.card}>
      {expanded ? (
        <div className={[
          styles.expandedPanel,
          hasRightNeighbor ? styles.borderRight : '',
        ].filter(Boolean).join(' ')}>
          <div className={styles.masterPanel}>
            {masterPanel}
          </div>
          <div className={styles.rightPanel}>
            <div className={styles.subFaders}>
              {channels.map((ch) => {
                const isLinked = channelLinks[ch.id] ?? ch.linked
                return (
                  <div key={ch.id} className={styles.subFaderWrap}>
                    <RawFader
                      channel={ch.channel}
                      universe={ch.universe}
                      value={values[ch.id] ?? 0}
                      label={ch.label}
                      onChange={(v) => handleChannelChange(ch, v)}
                      fillColor={roleToFillColor(ch.role)}
                      groupColor={isLinked ? groupColor : undefined}
                      groupMultiplier={isLinked ? groupMultiplier : undefined}
                    />
                    <button
                      className={`${styles.linkBtn}${isLinked ? ` ${styles.linked}` : ''}`}
                      title={isLinked ? 'Unlink from master' : 'Link to master'}
                      onClick={(e) => { e.stopPropagation(); handleLinkToggle(ch.id) }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.collapsed}>
          {masterPanel}
        </div>
      )}
    </div>
  )
}
