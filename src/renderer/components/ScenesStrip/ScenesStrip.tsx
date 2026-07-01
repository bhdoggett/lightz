import React, { useState, useRef, useEffect } from 'react'
import type { Scene, Group, GroupState } from '../../../shared/types'
import { useDragReorder } from '../../hooks/useDragReorder'
import styles from './ScenesStrip.module.css'

interface SceneDialogProps {
  initialName?: string
  initialFade?: number
  initialGroupStates?: Record<string, GroupState>
  groups: Group[]
  currentGroupStates: Record<string, GroupState>
  onConfirm: (name: string, fadeDuration: number, groupStates: Record<string, GroupState>) => void
  onDelete?: () => void
  onCancel: () => void
}

function SceneDialog({ initialName = '', initialFade = 0, initialGroupStates, groups, currentGroupStates, onConfirm, onDelete, onCancel }: SceneDialogProps) {
  const [name, setName] = useState(initialName)
  const [fade, setFade] = useState(initialFade)
  const [checkedGroupIds, setCheckedGroupIds] = useState<Set<string>>(
    () => new Set(initialGroupStates ? Object.keys(initialGroupStates) : [])
  )
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const toggleGroup = (id: string) => {
    setCheckedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    if (!name.trim()) return
    const groupStates: Record<string, GroupState> = {}
    for (const id of checkedGroupIds) {
      groupStates[id] = currentGroupStates[id] ?? initialGroupStates?.[id] ?? { fader: 100 }
    }
    onConfirm(name.trim(), fade, groupStates)
  }

  return (
    <div className={styles.dialog}>
      <div className={styles.dialogRow}>
        <input
          ref={nameRef}
          placeholder="Scene name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm()
            if (e.key === 'Escape') onCancel()
          }}
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
        <button className={styles.confirmBtn} onClick={handleConfirm}>
          Save
        </button>
        {onDelete && <button className={styles.deleteBtn} onClick={onDelete}>Delete</button>}
        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
      {groups.length > 0 && (
        <div className={styles.groupSection}>
          <span className={styles.groupSectionLabel}>Include Group Settings</span>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={[styles.groupBtn, checkedGroupIds.has(g.id) ? styles.groupBtnSelected : ''].filter(Boolean).join(' ')}
              aria-pressed={checkedGroupIds.has(g.id)}
              onClick={() => toggleGroup(g.id)}
            >
              <span className={styles.groupSwatch} style={{ color: g.color }} aria-hidden="true">■</span>
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  scenes: Scene[]
  activeSceneId: string | null
  groups: Group[]
  currentGroupStates: Record<string, GroupState>
  onActivate: (id: string) => void
  onSave: (name: string, fadeDuration: number, groupStates: Record<string, GroupState>) => void
  onUpdate: (id: string, name: string, fadeDuration: number, groupStates: Record<string, GroupState>) => void
  onDelete: (id: string) => void
  onReorder: (scenes: Scene[]) => void
  saveTrigger?: number
  editTrigger?: number
}

export function ScenesStrip({ scenes, activeSceneId, groups, currentGroupStates, onActivate, onSave, onUpdate, onDelete, onReorder, saveTrigger = 0, editTrigger = 0 }: Props) {
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const { dragId, insertIndex, containerProps, itemProps } = useDragReorder(scenes, onReorder)

  useEffect(() => {
    if (saveTrigger > 0) { setEditing(false); setSaving(true) }
  }, [saveTrigger])

  useEffect(() => {
    if (editTrigger > 0) { setSaving(false); setEditing(true) }
  }, [editTrigger])

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null
  const showDialog = editing || saving

  useEffect(() => {
    if (!showDialog) return
    const handleOutside = (e: MouseEvent) => {
      if (stripRef.current && !stripRef.current.contains(e.target as Node)) {
        setSaving(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showDialog])

  return (
    <div ref={stripRef} className={styles.strip}>
      <div className={styles.scenesRow} {...containerProps}>
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
      </div>

      {showDialog && (
        <div className={styles.popover} onMouseDown={(e) => e.stopPropagation()}>
          {editing && activeScene ? (
            <SceneDialog
              key={activeScene.id}
              initialName={activeScene.name}
              initialFade={activeScene.fadeDuration}
              initialGroupStates={activeScene.groupStates}
              groups={groups}
              currentGroupStates={currentGroupStates}
              onConfirm={(name, fade, groupStates) => { onUpdate(activeScene.id, name, fade, groupStates); setEditing(false) }}
              onDelete={() => { onDelete(activeScene.id); setEditing(false) }}
              onCancel={() => setEditing(false)}
            />
          ) : saving ? (
            <SceneDialog
              groups={groups}
              currentGroupStates={currentGroupStates}
              onConfirm={(name, fade, groupStates) => { onSave(name, fade, groupStates); setSaving(false) }}
              onCancel={() => setSaving(false)}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
