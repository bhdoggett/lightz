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

interface EditDialogProps {
  initialName: string
  initialFade: number
  onUpdate: (name: string, fadeDuration: number) => void
  onDelete: () => void
  onCancel: () => void
}

function EditDialog({ initialName, initialFade, onUpdate, onDelete, onCancel }: EditDialogProps) {
  const [name, setName] = useState(initialName)
  const [fade, setFade] = useState(initialFade)
  return (
    <div className={styles.dialog}>
      <input
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
      <button className={styles.confirmBtn} onClick={() => name.trim() && onUpdate(name.trim(), fade)}>Update</button>
      <button className={styles.deleteBtn} onClick={onDelete}>Delete</button>
      <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
    </div>
  )
}

interface Props {
  scenes: Scene[]
  activeSceneId: string | null
  onActivate: (id: string) => void
  onSave: (name: string, fadeDuration: number) => void
  onUpdate: (id: string, name: string, fadeDuration: number) => void
  onDelete: (id: string) => void
  onReorder: (scenes: Scene[]) => void
}

export function ScenesStrip({ scenes, activeSceneId, onActivate, onSave, onUpdate, onDelete, onReorder }: Props) {
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = scenes.findIndex((s) => s.id === dragId)
    const to = scenes.findIndex((s) => s.id === targetId)
    const reordered = [...scenes]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onReorder(reordered)
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className={styles.strip}>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onActivate(scene.id)}
          className={[
            styles.sceneBtn,
            scene.id === activeSceneId ? styles.active : '',
            scene.id === dragId ? styles.dragging : '',
            scene.id === dragOverId ? styles.dragOver : '',
          ].filter(Boolean).join(' ')}
          aria-pressed={scene.id === activeSceneId}
          draggable
          onDragStart={() => setDragId(scene.id)}
          onDragOver={(e) => { e.preventDefault(); setDragOverId(scene.id) }}
          onDrop={() => handleDrop(scene.id)}
          onDragEnd={() => { setDragId(null); setDragOverId(null) }}
        >
          {scene.name}
        </button>
      ))}

      {editing && activeScene ? (
        <EditDialog
          initialName={activeScene.name}
          initialFade={activeScene.fadeDuration}
          onUpdate={(name, fade) => { onUpdate(activeScene.id, name, fade); setEditing(false) }}
          onDelete={() => { onDelete(activeScene.id); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      ) : saving ? (
        <SaveDialog
          onConfirm={(name, fade) => { onSave(name, fade); setSaving(false) }}
          onCancel={() => setSaving(false)}
        />
      ) : (
        <>
          <button className={styles.saveBtn} onClick={() => setSaving(true)}>+ Save Scene</button>
          {activeSceneId && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>Edit</button>
          )}
        </>
      )}
    </div>
  )
}
