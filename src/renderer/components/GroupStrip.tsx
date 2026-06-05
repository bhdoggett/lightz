import { useState } from 'react'
import { GroupFader } from './GroupFader'
import { GroupEditor } from './GroupEditor'
import { Modal } from './Modal'
import type { Group, Fixture } from '../../shared/types'
import styles from './GroupStrip.module.css'

type GroupState = { fader: number; override: 'full' | 'mute' | null }

interface Props {
  groups: Group[]
  fixtures: Fixture[]
  groupStates: Record<string, GroupState>
  onStateChange: (groupId: string, state: GroupState) => void
  onSaveGroup: (group: Group) => void
  onDeleteGroup: (id: string) => void
}

export function GroupStrip({ groups, fixtures, groupStates, onStateChange, onSaveGroup, onDeleteGroup }: Props) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

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
        <div className={styles.groupsRow}>
          {groups.map((group) => {
            const state = groupStates[group.id] ?? { fader: 100, override: null }
            return (
              <GroupFader
                key={group.id}
                group={group}
                fader={state.fader}
                override={state.override}
                onFaderChange={(fader) => onStateChange(group.id, { ...state, fader })}
                onOverrideChange={(override) => onStateChange(group.id, { ...state, override })}
                onEdit={() => setEditingId(editingId === group.id ? null : group.id)}
              />
            )
          })}
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
