import { Modal } from '../Modal'
import styles from './AddMenuModal.module.css'

interface Props {
  onAddChannels: () => void
  onAddCustomFixture: () => void
  onAddGroup: () => void
  onClose: () => void
}

export function AddMenuModal({ onAddChannels, onAddCustomFixture, onAddGroup, onClose }: Props) {
  return (
    <Modal title="Add" onClose={onClose} centered minWidth="280px" maxWidth="320px">
      <div className={styles.options}>
        <button className={styles.option} onClick={onAddChannels}>+ Single Channel Fixtures</button>
        <button className={styles.option} onClick={onAddCustomFixture}>+ Multi-Channel Fixtures</button>
        <button className={styles.option} onClick={onAddGroup}>+ Fixture Group</button>
      </div>
    </Modal>
  )
}
