import { useState } from 'react'
import { Modal } from './Modal'
import type { Fixture, FixtureChannel, FixtureTemplate, ChannelRole } from '../../shared/types'
import styles from './CreateFixtureModal.module.css'

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

type ChannelDraft = { role: ChannelRole; label: string; linked: boolean }

interface Props {
  templates: FixtureTemplate[]
  existingFixtures: Fixture[]
  onApply: (fixture: Fixture) => void
  onTemplateSave: (template: FixtureTemplate) => void
  onTemplateDelete: (id: string) => void
  onClose: () => void
}

export function CreateFixtureModal({ templates, existingFixtures, onApply, onTemplateSave, onTemplateDelete, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [startChannel, setStartChannel] = useState(1)
  const [universe, setUniverse] = useState<0 | 1>(0)
  const [channels, setChannels] = useState<ChannelDraft[]>([])
  const [templateName, setTemplateName] = useState('')

  const usedChannels = new Set(
    existingFixtures.flatMap((f) =>
      f.channels ? f.channels.filter((c) => c.universe === universe).map((c) => c.channel)
               : f.universe === universe ? [f.channel] : []
    )
  )

  const applyPreset = (key: string) => setChannels(PRESETS[key].map((c) => ({ ...c })))

  const applyTemplate = (t: FixtureTemplate) =>
    setChannels(t.channels.map((c) => ({ role: c.role, label: c.label, linked: c.linked })))

  const handleApply = () => {
    const fixtureChannels: FixtureChannel[] = channels.map((c, i) => ({
      id: crypto.randomUUID(),
      role: c.role,
      label: c.label,
      linked: c.linked,
      channel: startChannel + i,
      universe,
    }))
    onApply({
      id: crypto.randomUUID(),
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

  const conflictingChannels = channels
    .map((_, i) => startChannel + i)
    .filter((ch) => usedChannels.has(ch))

  return (
    <Modal title="Add Multi-Channel Fixture" onClose={onClose} minWidth="480px" maxWidth="560px">
      {step === 1 && (
        <div className={styles.step}>
          <input
            className={styles.input}
            placeholder="Fixture name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className={styles.label}>
            Starting channel
            <input
              className={styles.input}
              type="number"
              min={1}
              max={512}
              value={startChannel}
              onChange={(e) => setStartChannel(Number(e.target.value))}
            />
          </label>
          <div className={styles.universeRow}>
            <span className={styles.label}>Universe</span>
            <button className={`${styles.uBtn}${universe === 0 ? ` ${styles.active}` : ''}`} onClick={() => setUniverse(0)}>U1</button>
            <button className={`${styles.uBtn}${universe === 1 ? ` ${styles.active}` : ''}`} onClick={() => setUniverse(1)}>U2</button>
          </div>
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.nextBtn} disabled={!name.trim()} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step}>
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
              <div key={i} className={styles.channelRow}>
                <span className={styles.channelNum}>{startChannel + i}</span>
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
                >🔗</button>
                <button className={styles.deleteRowBtn} onClick={() => setChannels(channels.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button
              className={styles.addRowBtn}
              onClick={() => setChannels([...channels, { role: 'other', label: 'Ch', linked: false }])}
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

          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={() => setStep(1)}>Back</button>
            <button className={styles.nextBtn} disabled={channels.length === 0} onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.step}>
          <p className={styles.summary}>
            <strong>{name}</strong> — {channels.length} channels ({startChannel}–{startChannel + channels.length - 1}, U{universe + 1})
          </p>
          <div className={styles.channelList}>
            {channels.map((ch, i) => (
              <div key={i} className={styles.summaryRow}>
                <span className={styles.channelNum}>{startChannel + i}</span>
                <span className={styles.roleTag}>{ch.role}</span>
                <span className={styles.labelText}>{ch.label}</span>
                {ch.linked && <span className={styles.linkedTag}>🔗</span>}
              </div>
            ))}
          </div>
          {conflictingChannels.length > 0 && (
            <p className={styles.warning}>
              Warning: channels {conflictingChannels.join(', ')} are already in use.
            </p>
          )}
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={() => setStep(2)}>Back</button>
            <button className={styles.nextBtn} onClick={handleApply}>Add Fixture</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
