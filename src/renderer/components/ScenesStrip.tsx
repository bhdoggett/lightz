import { useState } from 'react'
import type { Scene } from '../../shared/types'
import styles from './ScenesStrip.module.css'

interface SaveDialogProps {
  onConfirm: (name: string, fadeDuration: number) => void
  onCancel: () => void
}

function SaveDialog({ onConfirm, onCancel }: SaveDialogProps) {
  const [name, setName] = useState('')
  const [fade, setFade] = useState(0)
  return (
    <div className={styles.dialog}>
      <input
        placeholder="Scene name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label>
        Fade (ms):
        <input
          type="number"
          value={fade}
          min={0}
          step={500}
          onChange={(e) => setFade(Number(e.target.value))}
        />
      </label>
      <button className={styles.confirmBtn} onClick={() => name.trim() && onConfirm(name.trim(), fade)}>Save</button>
      <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
    </div>
  )
}

interface Props {
  scenes: Scene[]
  activeSceneId: string | null
  onActivate: (id: string) => void
  onSave: (name: string, fadeDuration: number) => void
}

export function ScenesStrip({ scenes, activeSceneId, onActivate, onSave }: Props) {
  const [saving, setSaving] = useState(false)

  return (
    <div className={styles.strip}>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onActivate(scene.id)}
          className={`${styles.sceneBtn}${scene.id === activeSceneId ? ` ${styles.active}` : ''}`}
          aria-pressed={scene.id === activeSceneId}
        >
          {scene.name}
        </button>
      ))}
      {saving ? (
        <SaveDialog
          onConfirm={(name, fade) => { onSave(name, fade); setSaving(false) }}
          onCancel={() => setSaving(false)}
        />
      ) : (
        <button className={styles.saveBtn} onClick={() => setSaving(true)}>+ Save Scene</button>
      )}
    </div>
  )
}
