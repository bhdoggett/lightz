import { useState } from 'react'
import { Modal } from '../Modal'
import { ChannelGrid, type ChannelCell } from '../ChannelGrid'
import type { Fixture, FixtureChannel, FixtureTemplate, ChannelRole } from '../../../shared/types'
import { getUsedChannels, isStartChannelAvailable } from '../../utils/fixtureChannelAvailability'
import styles from './CreateFixtureModal.module.css'
import gridStyles from '../ChannelGrid/ChannelGrid.module.css'

const PRESETS: Record<string, Array<{ role: ChannelRole; label: string; linked: boolean }>> = {
  'RGBAW+UV': [
    { role: 'red',    label: 'Red',    linked: true },
    { role: 'green',  label: 'Green',  linked: true },
    { role: 'blue',   label: 'Blue',   linked: true },
    { role: 'amber',  label: 'Amber',  linked: true },
    { role: 'white',  label: 'White',  linked: true },
    { role: 'uv',     label: 'UV',     linked: false },
  ],
  'RGBW': [
    { role: 'red',    label: 'Red',    linked: true },
    { role: 'green',  label: 'Green',  linked: true },
    { role: 'blue',   label: 'Blue',   linked: true },
    { role: 'white',  label: 'White',  linked: true },
  ],
  'RGB': [
    { role: 'red',    label: 'Red',    linked: true },
    { role: 'green',  label: 'Green',  linked: true },
    { role: 'blue',   label: 'Blue',   linked: true },
  ],
  'Dimmer + Strobe': [
    { role: 'dimmer', label: 'Dimmer', linked: true },
    { role: 'strobe', label: 'Strobe', linked: false },
  ],
}

const ALL_ROLES: ChannelRole[] = ['red', 'green', 'blue', 'amber', 'white', 'uv', 'dimmer', 'strobe', 'other']

type ChannelDraft = { role: ChannelRole; label: string; linked: boolean; draftId: string; channelId?: string }

interface Props {
  templates: FixtureTemplate[]
  existingFixtures: Fixture[]
  initialFixture?: Fixture
  onApply: (fixture: Fixture) => void
  onTemplateSave: (template: FixtureTemplate) => void
  onTemplateDelete: (id: string) => void
  onClose: () => void
}

export function CreateFixtureModal({ templates, existingFixtures, initialFixture, onApply, onTemplateSave, onTemplateDelete, onClose }: Props) {
  const editing = !!initialFixture
  const [name, setName] = useState(initialFixture?.name ?? '')
  const [startChannel, setStartChannel] = useState<number | null>(initialFixture?.channel ?? null)
  const [universe, setUniverse] = useState<0 | 1>(initialFixture?.channels?.[0]?.universe ?? 0)
  const [channels, setChannels] = useState<ChannelDraft[]>(
    initialFixture?.channels?.map((ch) => ({
      role: ch.role, label: ch.label, linked: ch.linked,
      draftId: crypto.randomUUID(), channelId: ch.id,
    })) ?? []
  )
  const [templateName, setTemplateName] = useState('')

  const usedChannels = getUsedChannels(existingFixtures, universe, initialFixture?.id)
  const count = Math.max(channels.length, 1)

  const unavailableStarts = new Set<number>()
  for (let c = 1; c <= 512; c++) {
    if (!isStartChannelAvailable(c, count, usedChannels)) unavailableStarts.add(c)
  }

  const applyPreset = (key: string) => setChannels(PRESETS[key].map((c) => ({ ...c, draftId: crypto.randomUUID() })))

  const applyTemplate = (t: FixtureTemplate) =>
    setChannels(t.channels.map((c) => ({ role: c.role, label: c.label, linked: c.linked, draftId: crypto.randomUUID() })))

  const handleApply = () => {
    if (startChannel === null) return
    const fixtureChannels: FixtureChannel[] = channels.map((c, i) => ({
      id: c.channelId ?? crypto.randomUUID(),
      role: c.role,
      label: c.label,
      linked: c.linked,
      channel: startChannel + i,
      universe,
    }))
    onApply({
      id: initialFixture?.id ?? crypto.randomUUID(),
      name,
      channel: startChannel,
      universe,
      type: 'dimmer',
      channels: fixtureChannels,
    })
    onClose()
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return
    onTemplateSave({
      id: crypto.randomUUID(),
      name: templateName.trim(),
      channels: channels.map((c, i) => ({ ...c, offset: i })),
    })
    setTemplateName('')
  }

  const conflictingChannels = startChannel === null ? [] : channels
    .map((_, i) => startChannel + i)
    .filter((ch) => usedChannels.has(ch))

  const canApply = name.trim().length > 0 && startChannel !== null && channels.length > 0 && conflictingChannels.length === 0

  const handleCellClick = (ch: number) => {
    if (unavailableStarts.has(ch)) return
    setStartChannel(ch)
  }

  const getCell = (ch: number): ChannelCell => {
    const inRange = startChannel !== null && ch >= startChannel && ch < startChannel + count
    const isUnavailable = !inRange && unavailableStarts.has(ch)
    return {
      className: inRange ? gridStyles.selected : isUnavailable ? gridStyles.unavailable : '',
      title: isUnavailable ? `Channel ${ch} unavailable` : `Channel ${ch}`,
    }
  }

  return (
    <Modal
      title={editing ? 'Edit Fixture' : 'Add Multi-Channel Fixture'}
      onClose={onClose}
      minWidth="520px"
      maxWidth="620px"
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} disabled={!canApply} onClick={handleApply}>
            {editing ? 'Save Changes' : 'Add Fixture'}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <input
          className={styles.input}
          placeholder="Fixture name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className={styles.universeRow}>
          <span className={styles.label}>Universe</span>
          <button className={`${styles.uBtn}${universe === 0 ? ` ${styles.active}` : ''}`} onClick={() => setUniverse(0)}>U1</button>
          <button className={`${styles.uBtn}${universe === 1 ? ` ${styles.active}` : ''}`} onClick={() => setUniverse(1)}>U2</button>
        </div>

        <ChannelGrid
          label="Starting channel — click to select"
          onCellClick={handleCellClick}
          getCell={getCell}
        />

        <div className={styles.presetRow}>
          {Object.keys(PRESETS).map((key) => (
            <button key={key} className={styles.presetBtn} onClick={() => applyPreset(key)}>{key}</button>
          ))}
          <button className={styles.presetBtn} onClick={() => setChannels([])}>Custom</button>
        </div>

        {templates.length > 0 && (
          <div className={styles.templateRow}>
            <span className={styles.label}>My templates:</span>
            {templates.map((t) => (
              <span key={t.id} className={styles.templateChip}>
                <button className={styles.templateBtn} onClick={() => applyTemplate(t)}>{t.name}</button>
                <button className={styles.templateDeleteBtn} onClick={() => onTemplateDelete(t.id)}>×</button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.channelList}>
          {channels.map((ch, i) => (
            <div key={ch.draftId} className={styles.channelRow}>
              <span className={styles.channelNum}>{startChannel !== null ? startChannel + i : '—'}</span>
              <select
                className={styles.roleSelect}
                value={ch.role}
                onChange={(e) => {
                  const next = [...channels]
                  next[i] = { ...next[i], role: e.target.value as ChannelRole }
                  setChannels(next)
                }}
              >
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input
                className={styles.labelInput}
                value={ch.label}
                onChange={(e) => {
                  const next = [...channels]
                  next[i] = { ...next[i], label: e.target.value }
                  setChannels(next)
                }}
              />
              <button
                className={`${styles.linkToggle}${ch.linked ? ` ${styles.linked}` : ''}`}
                title={ch.linked ? 'Unlink from master' : 'Link to master'}
                onClick={() => {
                  const next = [...channels]
                  next[i] = { ...next[i], linked: !next[i].linked }
                  setChannels(next)
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
              <button className={styles.deleteRowBtn} onClick={() => setChannels(channels.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button
            className={styles.addRowBtn}
            onClick={() => setChannels([...channels, { role: 'other', label: 'Ch', linked: false, draftId: crypto.randomUUID() }])}
          >
            + Add channel
          </button>
        </div>

        {conflictingChannels.length > 0 && (
          <p className={styles.warning}>
            Channels already in use: {conflictingChannels.join(', ')}
          </p>
        )}

        <div className={styles.saveTemplateRow}>
          <input
            className={styles.input}
            placeholder="Save as template…"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <button className={styles.saveTemplateBtn} disabled={!templateName.trim()} onClick={handleSaveTemplate}>
            Save Template
          </button>
        </div>
      </div>
    </Modal>
  )
}
