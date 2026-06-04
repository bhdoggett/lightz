import { useCallback } from 'react'
import { RawFader } from '../components/RawFader'
import { useIpc } from '../hooks/useIpc'
import styles from './LiveView.module.css'

interface Props {
  universe: 0 | 1
  getChannel: (universe: 0 | 1, channel: number) => number
  setChannel: (universe: 0 | 1, channel: number, value: number) => void
}

export function LiveView({ universe, getChannel, setChannel }: Props) {
  const ipc = useIpc()

  const handleChange = useCallback((channel: number, value: number) => {
    setChannel(universe, channel, value)
    ipc.setChannel({ universe, channel, value })
  }, [universe, ipc, setChannel])

  const handleAllOff = useCallback(() => {
    for (let ch = 1; ch <= 512; ch++) {
      setChannel(universe, ch, 0)
      ipc.setChannel({ universe, channel: ch, value: 0 })
    }
  }, [universe, ipc, setChannel])

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <button className={styles.allOffBtn} onClick={handleAllOff} title="Turn all channels off">
          ✕ All Off
        </button>
      </div>
      <div className={styles.strip}>
        {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => (
          <RawFader
            key={ch}
            channel={ch}
            value={getChannel(universe, ch)}
            onChange={(v) => handleChange(ch, v)}
          />
        ))}
      </div>
    </div>
  )
}
