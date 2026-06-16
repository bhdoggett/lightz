import React, { useState } from 'react'
import type { Scene } from '../../shared/types'
import { useDragReorder } from '../hooks/useDragReorder'
import styles from './ScenesStrip.module.css'

interface SceneDialogProps {
  initialName?: string
  initialFade?: number
  onConfirm: (name: string, fadeDuration: number) => void
  onDelete?: () => void
  onCancel: () => void
}

function SceneDialog({ initialName = '', initialFade = 0, onConfirm, onDelete, onCancel }: SceneDialogProps) {
  const [name, setName] = useState(initialName)
  const [fade, setFade] = useState(initialFade)
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
      <button className={styles.confirmBtn} onClick={() => name.trim() && onConfirm(name.trim(), fade)}>
        {onDelete ? 'Update' : 'Save'}
      </button>
      {onDelete && <button className={styles.deleteBtn} onClick={onDelete}>Delete</button>}
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
  const { dragId, insertIndex, containerProps, itemProps } = useDragReorder(scenes, onReorder)

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  const showDialog = editing || saving

  return (
    <div className={styles.strip}>
      {/* Scenes row with drag-and-drop */}
      <div
        className={styles.scenesRow}
        {...containerProps}
      >
        <span className={styles.scenesLabel}>Scenes:</span>
        {scenes.map((scene, index) => (
          <React.Fragment key={scene.id}>
            {dragId && insertIndex === index && (
              <div className={styles.insertIndicator} aria-hidden="true" />
            )}
            <button
              onClick={() => onActivate(scene.id)}
              className={[
                styles.sceneBtn,
                scene.id === activeSceneId ? styles.active : '',
                scene.id === dragId ? styles.dragging : '',
              ].filter(Boolean).join(' ')}
              aria-pressed={scene.id === activeSceneId}
              {...itemProps(scene.id)}
            >
              {scene.name}
            </button>
          </React.Fragment>
        ))}
        {dragId && insertIndex === scenes.length && (
          <div className={styles.insertIndicator} aria-hidden="true" />
        )}
        {!showDialog && (
          <>
            <button className={styles.saveBtn} onClick={() => setSaving(true)}>+ Save Scene</button>
            {activeSceneId && (
              <button className={styles.editBtn} onClick={() => setEditing(true)}>Edit</button>
            )}
          </>
        )}
      </div>

      {/* Dialog row — centered below scenes */}
      {editing && activeScene ? (
        <div className={styles.dialogRow}>
          <SceneDialog
            key={activeScene.id}
            initialName={activeScene.name}
            initialFade={activeScene.fadeDuration}
            onConfirm={(name, fade) => { onUpdate(activeScene.id, name, fade); setEditing(false) }}
            onDelete={() => { onDelete(activeScene.id); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : saving ? (
        <div className={styles.dialogRow}>
          <SceneDialog
            onConfirm={(name, fade) => { onSave(name, fade); setSaving(false) }}
            onCancel={() => setSaving(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
