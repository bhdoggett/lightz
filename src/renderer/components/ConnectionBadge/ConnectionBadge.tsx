import type { DmxStatus } from '../../../shared/types'
import styles from './ConnectionBadge.module.css'

interface Props {
  status: DmxStatus
}

export function ConnectionBadge({ status }: Props) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      <span className={styles.dot} />
      {status === 'connected' ? 'DMX Connected' : status === 'disconnected' ? 'DMX Disconnected' : 'DMX Error'}
    </span>
  )
}
