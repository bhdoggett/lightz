import { useState, useCallback } from 'react'
import { ChannelList } from '../components/ChannelList'
import { ChannelEditor } from '../components/ChannelEditor'
import { useIpc } from '../hooks/useIpc'
import type { Fixture } from '../../shared/types'
import styles from './SetupView.module.css'

interface Props {
  fixtures: Fixture[]
  onFixturesChange: (fixtures: Fixture[]) => void
  onBack: () => void
}

export function SetupView({ fixtures, onFixturesChange, onBack }: Props) {
  const ipc = useIpc()
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null)

  const fixtureOnChannel = fixtures.find((f) => f.channel === selectedChannel) ?? null

  const handleSave = useCallback(async (fixture: Fixture) => {
    const saved = await ipc.updateFixture(fixture)
    const existing = fixtures.findIndex((f) => f.id === saved.id)
    if (existing >= 0) {
      const next = [...fixtures]
      next[existing] = saved
      onFixturesChange(next)
    } else {
      onFixturesChange([...fixtures, saved])
    }
  }, [fixtures, ipc, onFixturesChange])

  const handleDelete = useCallback(async (id: string) => {
    await ipc.deleteFixture(id)
    onFixturesChange(fixtures.filter((f) => f.id !== id))
    setSelectedChannel(null)
  }, [fixtures, ipc, onFixturesChange])

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h2 className={styles.toolbarTitle}>Setup & Channels</h2>
      </div>
      <div className={styles.body}>
        <ChannelList
          fixtures={fixtures}
          channelValues={{}}
          selectedChannel={selectedChannel}
          onSelect={setSelectedChannel}
        />
        <div className={styles.divider} />
        <ChannelEditor
          channel={selectedChannel}
          fixture={fixtureOnChannel}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
