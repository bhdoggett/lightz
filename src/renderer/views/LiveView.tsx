import { useCallback } from 'react'
import { RawFader } from '../components/RawFader'
import { useIpc } from '../hooks/useIpc'
import { useDmxState } from '../hooks/useDmxState'
import styles from './LiveView.module.css'

interface Props {
  universe: 0 | 1
}

export function LiveView({ universe }: Props) {
  const ipc = useIpc()
  const { getChannel, setChannel: setLocal } = useDmxState()

  const handleChange = useCallback((channel: number, value: number) => {
    setLocal(universe, channel, value)
    ipc.setChannel({ universe, channel, value })
  }, [universe, ipc, setLocal])

  return (
    <div className={styles.view}>
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
