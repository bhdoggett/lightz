import { Modal } from '../Modal'
import styles from './RenameWarningModal.module.css'

interface Props {
  oldUrl: string
  newUrl: string
  onAccept: () => void
  onCancel: () => void
}

export function RenameWarningModal({ oldUrl, newUrl, onAccept, onCancel }: Props) {
  return (
    <Modal
      title="⚠ Companion Endpoint Will Change"
      onClose={onCancel}
      minWidth="420px"
      maxWidth="560px"
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.acceptBtn} onClick={onAccept}>Accept</button>
        </div>
      }
    >
      <p className={styles.text}>
        Renaming this scene changes its Companion endpoint. Buttons using this URL will stop working:
      </p>
      <code className={styles.url}>POST {oldUrl}</code>
      <p className={styles.text}>They will need to be updated to:</p>
      <code className={styles.url}>POST {newUrl}</code>
    </Modal>
  )
}
