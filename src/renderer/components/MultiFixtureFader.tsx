import { useState, useRef } from 'react'
import type { Fixture, FixtureChannel } from '../../shared/types'
import { channelValuesToDisplayHex, pickerHexToChannelValues, isColorRole } from '../utils/colorSync'
import { computeMasterValue, applyMasterGang } from '../utils/gangFader'
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

  const colorChannels = channels.filter((ch) => isColorRole(ch.role))
  const displayHex = channelValuesToDisplayHex(colorChannels, values)
  const masterValue = computeMasterValue(channels, values)

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
    onChange(applyMasterGang(channels, values, newVal))
  }

  const handleChannelChange = (ch: FixtureChannel, newVal: number) => {
    onChange({ ...values, [ch.id]: newVal })
  }

  const handleColorPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const derived = pickerHexToChannelValues(e.target.value, colorChannels)
    // For uv channels, preserve current value since picker can't derive it
    const next = { ...values }
    for (const [id, val] of Object.entries(derived)) next[id] = val
    onChange(next)
  }

  return (
    <div className={`${styles.card}${expanded ? ` ${styles.expanded}` : ''}`}>
      {expanded && (
        <div className={styles.expandedPanel}>
          <div className={styles.pickerRow}>
            <input
              type="color"
              className={styles.colorPicker}
              value={displayHex}
              onChange={handleColorPick}
            />
          </div>
          <div className={styles.subFaders}>
            {channels.map((ch) => (
              <div key={ch.id} className={styles.subFaderWrap}>
                <button
                  className={`${styles.linkBtn}${ch.linked ? ` ${styles.linked}` : ''}`}
                  title={ch.linked ? 'Unlink from master' : 'Link to master'}
                  onClick={() => {
                    // Toggle link — update fixture via onChange with sentinel (handled in MainView)
                    // For now emit values unchanged; MainView handles link toggle separately
                  }}
                >
                  🔗
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
            ))}
          </div>
          <div className={styles.expandedFooter}>
            <span className={styles.fixtureName}>{fixture.name}</span>
            <RawFader
              channel={0}
              value={masterValue}
              label="Master"
              onChange={handleMasterChange}
              groupColor={displayHex}
            />
            <button
              role="switch"
              aria-checked={isOn}
              className={`${styles.toggleBtn}${isOn ? ` ${styles.on}` : ''}`}
              onClick={handleToggle}
              title={isOn ? 'Turn off' : 'Turn on'}
            >
              ●
            </button>
          </div>
        </div>
      )}

      {!expanded && (
        <div className={styles.collapsed} onClick={() => setExpanded(true)}>
          <button
            role="switch"
            aria-checked={isOn}
            className={`${styles.toggleBtn}${isOn ? ` ${styles.on}` : ''}`}
            onClick={handleToggle}
            title={isOn ? 'Turn off' : 'Turn on'}
          >
            ●
          </button>
          <RawFader
            channel={0}
            value={masterValue}
            label={fixture.name}
            onChange={handleMasterChange}
            groupColor={displayHex}
          />
        </div>
      )}
    </div>
  )
}
