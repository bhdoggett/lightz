import { useState } from 'react'
import { Modal } from '../Modal'
import { Toast } from '../Toast'
import type { Fixture, FixtureChannel, FixtureTemplate, ChannelRole } from '../../../shared/types'
import { GROUP_COLORS } from '../../../shared/types'
import { getUsedChannels, isStartChannelAvailable, describeConflict } from '../../utils/fixtureChannelAvailability'
import styles from './AddMultiChannelFixturesModal.module.css'

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

type ChannelDraft = { role: ChannelRole; label: string; linked: boolean; draftId: string }
type FixtureDraft = {
  draftId: string
  name: string
  startChannel: number
  channels: ChannelDraft[]
  color: string
  templateName: string
}

interface Props {
  templates: FixtureTemplate[]
  existingFixtures: Fixture[]
  onApply: (fixtures: Fixture[]) => void
  onTemplateSave: (template: FixtureTemplate) => void
  onTemplateDelete: (id: string) => void
  onClose: () => void
}

export function AddMultiChannelFixturesModal({ templates, existingFixtures, onApply, onTemplateSave, onTemplateDelete, onClose }: Props) {
  const [universe, setUniverse] = useState<0 | 1>(0)
  const [drafts, setDrafts] = useState<FixtureDraft[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const savedUsed = getUsedChannels(existingFixtures, universe)

  const usedChannelsExcluding = (excludeDraftId: string | null): Set<number> => {
    const used = new Set(savedUsed)
    for (const d of drafts) {
      if (d.draftId === excludeDraftId) continue
      const count = Math.max(d.channels.length, 1)
      for (let c = d.startChannel; c < d.startChannel + count; c++) used.add(c)
    }
    return used
  }

  const allUsedChannels = usedChannelsExcluding(null)

  const cellOwner = (ch: number): { draft: FixtureDraft; isStart: boolean } | null => {
    for (const d of drafts) {
      const count = Math.max(d.channels.length, 1)
      if (ch >= d.startChannel && ch < d.startChannel + count) {
        return { draft: d, isStart: ch === d.startChannel }
      }
    }
    return null
  }

  const switchUniverse = (u: 0 | 1) => {
    setUniverse(u)
    setDrafts([])
  }

  const handleCellClick = (ch: number) => {
    const owner = drafts.find((d) => d.startChannel === ch)
    if (owner) {
      setDrafts(drafts.filter((d) => d.draftId !== owner.draftId))
      return
    }
    if (allUsedChannels.has(ch)) return
    const draft: FixtureDraft = {
      draftId: crypto.randomUUID(),
      name: '',
      startChannel: ch,
      channels: [],
      color: GROUP_COLORS[drafts.length % GROUP_COLORS.length],
      templateName: '',
    }
    setDrafts([...drafts, draft])
  }

  const updateDraft = (draftId: string, patch: Partial<FixtureDraft>) => {
    setDrafts(drafts.map((d) => d.draftId === draftId ? { ...d, ...patch } : d))
  }

  const removeDraft = (draftId: string) => setDrafts(drafts.filter((d) => d.draftId !== draftId))

  const applyPreset = (draft: FixtureDraft, key: string) => {
    const preset = PRESETS[key]
    const used = usedChannelsExcluding(draft.draftId)
    if (!isStartChannelAvailable(draft.startChannel, preset.length, used)) {
      setToastMessage(describeConflict(draft.startChannel, preset.length, used))
      return
    }
    updateDraft(draft.draftId, { channels: preset.map((c) => ({ ...c, draftId: crypto.randomUUID() })) })
  }

  const applyTemplate = (draft: FixtureDraft, t: FixtureTemplate) => {
    const used = usedChannelsExcluding(draft.draftId)
    if (!isStartChannelAvailable(draft.startChannel, t.channels.length, used)) {
      setToastMessage(describeConflict(draft.startChannel, t.channels.length, used))
      return
    }
    updateDraft(draft.draftId, {
      channels: t.channels.map((c) => ({ role: c.role, label: c.label, linked: c.linked, draftId: crypto.randomUUID() })),
    })
  }

  const addChannelToDraft = (draft: FixtureDraft) => {
    const nextChannel = draft.startChannel + draft.channels.length
    const used = usedChannelsExcluding(draft.draftId)
    if (!isStartChannelAvailable(nextChannel, 1, used)) {
      setToastMessage(describeConflict(nextChannel, 1, used))
      return
    }
    updateDraft(draft.draftId, {
      channels: [...draft.channels, { role: 'other', label: 'Ch', linked: false, draftId: crypto.randomUUID() }],
    })
  }

  const handleSaveTemplateForDraft = (draft: FixtureDraft) => {
    if (!draft.templateName.trim()) return
    onTemplateSave({
      id: crypto.randomUUID(),
      name: draft.templateName.trim(),
      channels: draft.channels.map((c, i) => ({ ...c, offset: i })),
    })
    updateDraft(draft.draftId, { templateName: '' })
  }

  const canApply = drafts.length > 0 && drafts.every((d) => d.name.trim().length > 0 && d.channels.length > 0)

  const handleApply = () => {
    if (!canApply) return
    const fixtures: Fixture[] = drafts.map((d) => {
      const fixtureChannels: FixtureChannel[] = d.channels.map((c, i) => ({
        id: crypto.randomUUID(),
        role: c.role,
        label: c.label,
        linked: c.linked,
        channel: d.startChannel + i,
        universe,
      }))
      return {
        id: crypto.randomUUID(),
        name: d.name,
        channel: d.startChannel,
        universe,
        type: 'dimmer',
        channels: fixtureChannels,
      }
    })
    onApply(fixtures)
    onClose()
  }

  return (
    <Modal
      title="Add Multi-Channel Fixtures"
      onClose={onClose}
      minWidth="560px"
      maxWidth="640px"
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} disabled={!canApply} onClick={handleApply}>
            {drafts.length > 1 ? `Add ${drafts.length} Fixtures` : 'Add Fixture'}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.universeRow}>
          <span className={styles.label}>Universe</span>
          <button className={`${styles.uBtn}${universe === 0 ? ` ${styles.active}` : ''}`} onClick={() => switchUniverse(0)}>U1</button>
          <button className={`${styles.uBtn}${universe === 1 ? ` ${styles.active}` : ''}`} onClick={() => switchUniverse(1)}>U2</button>
        </div>

        <div>
          <div className={styles.gridLabel}>Click a free channel to start a fixture</div>
          <div className={styles.grid}>
            {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => {
              const info = cellOwner(ch)
              const isSavedUsed = savedUsed.has(ch)
              const style = info ? { '--draft-color': info.draft.color } as React.CSSProperties : undefined
              return (
                <div
                  key={ch}
                  className={[
                    styles.cell,
                    info ? styles.claimed : '',
                    info?.isStart ? styles.start : '',
                    !info && isSavedUsed ? styles.unavailable : '',
                  ].filter(Boolean).join(' ')}
                  style={style}
                  onClick={() => handleCellClick(ch)}
                  title={
                    info?.isStart ? `Channel ${ch} — click to remove` :
                    info ? `Channel ${ch}` :
                    isSavedUsed ? `Channel ${ch} unavailable` :
                    `Channel ${ch}`
                  }
                >
                  {ch}
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.toastRow}>
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        </div>

        <div className={styles.draftList}>
          {drafts.map((draft) => (
            <div key={draft.draftId} className={styles.draftCard} style={{ '--draft-color': draft.color } as React.CSSProperties}>
              <div className={styles.draftHeader}>
                <span className={styles.colorSwatch} />
                <input
                  className={styles.input}
                  placeholder="Fixture name"
                  value={draft.name}
                  onChange={(e) => updateDraft(draft.draftId, { name: e.target.value })}
                />
                <button className={styles.removeDraftBtn} onClick={() => removeDraft(draft.draftId)}>Remove fixture</button>
              </div>

              <div className={styles.presetRow}>
                {Object.keys(PRESETS).map((key) => (
                  <button key={key} className={styles.presetBtn} onClick={() => applyPreset(draft, key)}>{key}</button>
                ))}
                <button className={styles.presetBtn} onClick={() => updateDraft(draft.draftId, { channels: [] })}>Custom</button>
              </div>

              {templates.length > 0 && (
                <div className={styles.templateRow}>
                  <span className={styles.label}>My templates:</span>
                  {templates.map((t) => (
                    <span key={t.id} className={styles.templateChip}>
                      <button className={styles.templateBtn} onClick={() => applyTemplate(draft, t)}>{t.name}</button>
                      <button className={styles.templateDeleteBtn} onClick={() => onTemplateDelete(t.id)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.channelList}>
                {draft.channels.map((ch, i) => (
                  <div key={ch.draftId} className={styles.channelRow}>
                    <span className={styles.channelNum}>{draft.startChannel + i}</span>
                    <select
                      className={styles.roleSelect}
                      value={ch.role}
                      onChange={(e) => {
                        const next = [...draft.channels]
                        next[i] = { ...next[i], role: e.target.value as ChannelRole }
                        updateDraft(draft.draftId, { channels: next })
                      }}
                    >
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input
                      className={styles.labelInput}
                      value={ch.label}
                      onChange={(e) => {
                        const next = [...draft.channels]
                        next[i] = { ...next[i], label: e.target.value }
                        updateDraft(draft.draftId, { channels: next })
                      }}
                    />
                    <button
                      className={`${styles.linkToggle}${ch.linked ? ` ${styles.linked}` : ''}`}
                      title={ch.linked ? 'Unlink from master' : 'Link to master'}
                      onClick={() => {
                        const next = [...draft.channels]
                        next[i] = { ...next[i], linked: !next[i].linked }
                        updateDraft(draft.draftId, { channels: next })
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    </button>
                    <button
                      className={styles.deleteRowBtn}
                      onClick={() => updateDraft(draft.draftId, { channels: draft.channels.filter((_, j) => j !== i) })}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className={styles.addRowBtn} onClick={() => addChannelToDraft(draft)}>+ Add channel</button>
              </div>

              <div className={styles.saveTemplateRow}>
                <input
                  className={styles.input}
                  placeholder="Save as template…"
                  value={draft.templateName}
                  onChange={(e) => updateDraft(draft.draftId, { templateName: e.target.value })}
                />
                <button
                  className={styles.saveTemplateBtn}
                  disabled={!draft.templateName.trim()}
                  onClick={() => handleSaveTemplateForDraft(draft)}
                >
                  Save Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
