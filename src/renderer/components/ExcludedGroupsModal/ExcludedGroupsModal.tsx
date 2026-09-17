import { Modal } from '../Modal'
import styles from './ExcludedGroupsModal.module.css'

interface Props {
  groupNames: string[]
  onSaveAnyway: () => void
  onEditScene: () => void
  onCancel: () => void
}

export function ExcludedGroupsModal({ groupNames, onSaveAnyway, onEditScene, onCancel }: Props) {
  return (
    <Modal
      title="⚠ Groups Not Included"
      onClose={onCancel}
      minWidth="420px"
      maxWidth="560px"
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.editBtn} onClick={onEditScene}>Edit Scene…</button>
          <button className={styles.acceptBtn} onClick={onSaveAnyway}>Save Anyway</button>
        </div>
      }
    >
      <p className={styles.text}>This scene won't store settings for:</p>
      <ul className={styles.list}>
        {groupNames.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className={styles.text}>To include them, edit the scene.</p>
    </Modal>
  )
}
