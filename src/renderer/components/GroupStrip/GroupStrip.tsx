import React, { useState, useEffect } from 'react'
import { GroupFader } from '../GroupFader'
import { GroupEditor } from '../GroupEditor'
import { Modal } from '../Modal'
import { useDragReorder } from '../../hooks/useDragReorder'
import type { Group, Fixture } from '../../../shared/types'
import styles from './GroupStrip.module.css'

type GroupState = { fader: number }

interface Props {
  groups: Group[]
  fixtures: Fixture[]
  groupStates: Record<string, GroupState>
  onStateChange: (groupId: string, state: GroupState) => void
  onGroupFull: (groupId: string) => void
  onGroupMute: (groupId: string) => void
  onSaveGroup: (group: Group) => void
  onDeleteGroup: (id: string) => void
  onReorder: (groups: Group[]) => void
  addTrigger?: number
}

export function GroupStrip({ groups, fixtures, groupStates, onStateChange, onGroupFull, onGroupMute, onSaveGroup, onDeleteGroup, onReorder, addTrigger = 0 }: Props) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  useEffect(() => {
    if (addTrigger > 0) setEditingId('new')
  }, [addTrigger])
  const { dragId, insertIndex, containerProps, itemProps } = useDragReorder(groups, onReorder)

  const editingGroup = editingId === 'new' ? null
    : groups.find((g) => g.id === editingId) ?? null

  const handleSave = (group: Group) => {
    onSaveGroup(group)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    onDeleteGroup(id)
    setEditingId(null)
  }

  return (
    <>
      <div className={styles.strip}>
        <div className={styles.groupsRow} {...containerProps}>
          {groups.map((group, index) => {
            const state = groupStates[group.id] ?? { fader: 100 }
            return (
              <React.Fragment key={group.id}>
                {dragId && insertIndex === index && (
                  <div className={styles.insertIndicator} aria-hidden="true" />
                )}
                <div
                  className={group.id === dragId ? styles.dragging : undefined}
                  {...itemProps(group.id)}
                >
                  <GroupFader
                    group={group}
                    fader={state.fader}
                    onFaderChange={(fader) => onStateChange(group.id, { fader })}
                    onFull={() => onGroupFull(group.id)}
                    onMute={() => onGroupMute(group.id)}
                    onEdit={() => setEditingId(editingId === group.id ? null : group.id)}
                  />
                </div>
              </React.Fragment>
            )
          })}
          {dragId && insertIndex === groups.length && (
            <div className={styles.insertIndicator} aria-hidden="true" />
          )}
          <button className={styles.addBtn} onClick={() => setEditingId('new')}>+ Group</button>
        </div>
      </div>

      {editingId !== null && (
        <Modal
          title={editingGroup ? `Edit: ${editingGroup.name}` : 'New Group'}
          onClose={() => setEditingId(null)}
          centered
        >
          <GroupEditor
            groups={groups}
            fixtures={fixtures}
            editing={editingGroup}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={() => setEditingId(null)}
          />
        </Modal>
      )}
    </>
  )
}
