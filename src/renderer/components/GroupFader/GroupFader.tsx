import { useState } from 'react'
import { Slider } from '../Slider'
import styles from './GroupFader.module.css'
import type { Group } from '../../../shared/types'

interface Props {
  group: Group
  fader: number
  onFaderChange: (value: number) => void
  onFull: () => void
  onMute: () => void
  onEdit: () => void
}

export function GroupFader({ group, fader, onFaderChange, onFull, onMute, onEdit }: Props) {
  const [fullFlash, setFullFlash] = useState(false)
  const [muteFlash, setMuteFlash] = useState(false)

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

  return (
    <div className={styles.fader}>
      <div className={styles.colorBar} style={{ background: group.color }} />
      <div className={styles.nameAndOverrides}>
        <button className={styles.name} onClick={onEdit} title={`Edit ${group.name}`}>
          {group.name}
        </button>
        <div className={styles.overrides}>
          <button
            className={`${styles.overrideBtn} ${styles.fullBtn}${fullFlash ? ` ${styles.flash}` : ''}`}
            aria-label="full"
            title="Set to full"
            onClick={handleFull}
            onAnimationEnd={() => setFullFlash(false)}
          >
            ○
          </button>
          <button
            className={`${styles.overrideBtn} ${styles.muteBtn}${muteFlash ? ` ${styles.flash}` : ''}`}
            aria-label="mute"
            title="Set to off"
            onClick={handleMute}
            onAnimationEnd={() => setMuteFlash(false)}
          >
            ✕
          </button>
        </div>
      </div>
      <div className={styles.sliderWrap} data-no-drag>
        <span className={styles.value}>{fader}%</span>
        <Slider
          value={fader}
          min={0}
          max={100}
          height={60}
          fillColor={group.color}
          onChange={onFaderChange}
        />
      </div>
    </div>
  )
}
