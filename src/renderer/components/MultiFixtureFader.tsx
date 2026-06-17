import { useState, useRef } from 'react'
import type { Fixture, FixtureChannel } from '../../shared/types'
import { channelValuesToDisplayHex, pickerHexToChannelValues, isColorRole } from '../utils/colorSync'
import { computeRatios, applyRatios } from '../utils/gangFader'
import { RawFader } from './RawFader'
import styles from './MultiFixtureFader.module.css'

interface Props {
  fixture: Fixture
  values: Record<string, number>
  onChange: (values: Record<string, number>) => void
  groupColor?: string
  groupOverride?: 'full' | 'mute' | null
}

export function MultiFixtureFader({ fixture, values, onChange, groupColor, groupOverride }: Props) {
  const channels = fixture.channels!
  const [expanded, setExpanded] = useState(false)
  const [isOn, setIsOn] = useState(true)
  const savedValues = useRef<Record<string, number>>({})
  const ratiosRef = useRef<Record<string, number>>({})
  const [channelLinks, setChannelLinks] = useState<Record<string, boolean>>(
    () => Object.fromEntries(channels.map((ch) => [ch.id, ch.linked]))
  )

  const effectiveChannels = channels.map((ch) => ({ ...ch, linked: channelLinks[ch.id] ?? ch.linked }))

  const colorChannels = channels.filter((ch) => isColorRole(ch.role))
  const linkedChannels = effectiveChannels.filter((ch) => ch.linked)
  const displayHex = channelValuesToDisplayHex(colorChannels, values)

  // masterDisplay = max of linked channel values (the "ceiling" of the current state)
  const masterDisplay = Math.max(...linkedChannels.map((ch) => values[ch.id] ?? 0), 0)

  // Keep ratios current whenever master is non-zero (ratios survive the zero crossing)
  if (masterDisplay > 0) {
    ratiosRef.current = computeRatios(effectiveChannels, values)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOn) {
      savedValues.current = { ...values }
      const zeroed: Record<string, number> = {}
      for (const ch of channels) zeroed[ch.id] = 0
      onChange(zeroed)
    } else {
      onChange({ ...savedValues.current })
    }
    setIsOn((prev) => !prev)
  }

  const handleMasterChange = (newVal: number) => {
    const applied = applyRatios(effectiveChannels, ratiosRef.current, newVal)
    onChange({ ...values, ...applied })
  }

  const handleLinkToggle = async (channelId: string) => {
    const newLinked = !(channelLinks[channelId] ?? true)
    setChannelLinks((prev) => ({ ...prev, [channelId]: newLinked }))

    // Persist the change to the store
    const updatedChannels = channels.map((ch) =>
      ch.id === channelId ? { ...ch, linked: newLinked } : ch
    )
    const updatedFixture = { ...fixture, channels: updatedChannels }
    await window.electronAPI.updateFixture(updatedFixture)
  }

  const handleChannelChange = (ch: FixtureChannel, newVal: number) => {
    onChange({ ...values, [ch.id]: newVal })
  }

  const handleColorPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const derived = pickerHexToChannelValues(e.target.value, colorChannels)
    const next = { ...values }
    for (const [id, val] of Object.entries(derived)) next[id] = val
    onChange(next)
  }

  const masterFader = (
    <RawFader
      channel={0}
      value={masterDisplay}
      label="Master"
      onChange={handleMasterChange}
      groupColor={displayHex}
    />
  )

  const toggleBtn = (
    <button
      role="switch"
      aria-checked={isOn}
      className={`${styles.toggleBtn}${isOn ? ` ${styles.on}` : ''}`}
      onClick={handleToggle}
      title={isOn ? 'Turn off' : 'Turn on'}
    >
      ●
    </button>
  )

  return (
    <div className={styles.card}>
      {expanded ? (
        <div className={styles.expandedPanel}>
          <div className={styles.masterPanel}>
            {toggleBtn}
            {masterFader}
            <span
              className={styles.fixtureName}
              onClick={() => setExpanded(false)}
              title="Click to collapse"
            >
              {fixture.name}
            </span>
          </div>
          <div className={styles.rightPanel}>
            <div className={styles.pickerRow}>
              <input
                type="color"
                className={styles.colorPicker}
                value={displayHex}
                onChange={handleColorPick}
              />
            </div>
            <div className={styles.subFaders}>
              {channels.map((ch) => {
                const isLinked = channelLinks[ch.id] ?? ch.linked
                return (
                <div key={ch.id} className={styles.subFaderWrap}>
                  <button
                    className={`${styles.linkBtn}${isLinked ? ` ${styles.linked}` : ''}`}
                    title={isLinked ? 'Unlink from master' : 'Link to master'}
                    onClick={(e) => { e.stopPropagation(); handleLinkToggle(ch.id) }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6.5 9.5L9.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M8 6.5L9.5 5C10.5 4 12 4 13 5C14 6 14 7.5 13 8.5L11.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M8 9.5L6.5 11C5.5 12 4 12 3 11C2 10 2 8.5 3 7.5L4.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <RawFader
                    channel={ch.channel}
                    value={values[ch.id] ?? 0}
                    label={ch.label}
                    onChange={(v) => handleChannelChange(ch, v)}
                    groupColor={groupColor}
                    groupOverride={groupOverride}
                  />
                </div>
              )})}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.collapsed} onClick={() => setExpanded(true)}>
          {toggleBtn}
          <RawFader
            channel={0}
            value={masterDisplay}
            label={fixture.name}
            onChange={handleMasterChange}
            groupColor={displayHex}
          />
        </div>
      )}
    </div>
  )
}
