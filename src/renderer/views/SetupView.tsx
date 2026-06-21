import { useState, useCallback } from 'react'
import { ChannelList } from '../components/ChannelList'
import { ChannelEditor } from '../components/ChannelEditor'
import { useApi } from '../api/context'
import type { Fixture } from '../../shared/types'
import styles from './SetupView.module.css'

interface Props {
  fixtures: Fixture[]
  onFixturesChange: (fixtures: Fixture[]) => void
  onBack: () => void
}

export function SetupView({ fixtures, onFixturesChange, onBack }: Props) {
  const api = useApi()
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null)

  const fixtureOnChannel = fixtures.find((f) => f.channel === selectedChannel) ?? null

  const handleSave = useCallback(async (fixture: Fixture) => {
    const saved = await api.updateFixture(fixture)
    const existing = fixtures.findIndex((f) => f.id === saved.id)
    if (existing >= 0) {
      const next = [...fixtures]
      next[existing] = saved
      onFixturesChange(next)
    } else {
      onFixturesChange([...fixtures, saved])
    }
  }, [fixtures, api, onFixturesChange])

  const handleDelete = useCallback(async (id: string) => {
    await api.deleteFixture(id)
    onFixturesChange(fixtures.filter((f) => f.id !== id))
    setSelectedChannel(null)
  }, [fixtures, api, onFixturesChange])

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
