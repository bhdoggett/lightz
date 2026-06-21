import { Slider } from './Slider'
import styles from './GroupFader.module.css'
import type { Group } from '../../shared/types'

interface Props {
  group: Group
  fader: number
  override: 'full' | 'mute' | null
  onFaderChange: (value: number) => void
  onOverrideChange: (override: 'full' | 'mute' | null) => void
  onEdit: () => void
}

export function GroupFader({ group, fader, override, onFaderChange, onOverrideChange, onEdit }: Props) {
  const displayValue = override === 'full' ? '255'
                     : override === 'mute' ? '0'
                     : `${fader}%`

  const handleFullToggle = () => onOverrideChange(override === 'full' ? null : 'full')
  const handleMuteToggle = () => onOverrideChange(override === 'mute' ? null : 'mute')

  return (
    <div className={styles.fader}>
      <div className={styles.colorBar} style={{ background: group.color }} />
      <div className={styles.nameAndOverrides}>
        <button className={styles.name} onClick={onEdit} title={`Edit ${group.name}`}>
          {group.name}
        </button>
        <div className={styles.overrides}>
          <button
            className={`${styles.overrideBtn} ${styles.fullBtn}${override === 'full' ? ` ${styles.active}` : ''}`}
            aria-label="full"
            title="Full override"
            onClick={handleFullToggle}
          >
            ○
          </button>
          <button
            className={`${styles.overrideBtn} ${styles.muteBtn}${override === 'mute' ? ` ${styles.active}` : ''}`}
            aria-label="mute"
            title="Mute override"
            onClick={handleMuteToggle}
          >
            ✕
          </button>
        </div>
      </div>
      <div className={styles.sliderWrap} data-no-drag>
        <span className={`${styles.value}${override !== null ? ` ${styles.overridden}` : ''}`}>
          {displayValue}
        </span>
        <Slider
          value={fader}
          min={0}
          max={100}
          height={60}
          fillColor={group.color}
          disabled={override !== null}
          onChange={onFaderChange}
        />
      </div>
    </div>
  )
}
