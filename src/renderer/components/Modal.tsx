import type { ReactNode } from 'react'
import styles from './Modal.module.css'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  minWidth?: string
  maxWidth?: string
  centered?: boolean  // center content horizontally (default false)
}

export function Modal({ title, onClose, children, footer, minWidth = '360px', maxWidth = '560px', centered = false }: Props) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        style={{ minWidth, maxWidth, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={`${styles.body}${centered ? ` ${styles.centered}` : ''}`}>
          {children}
        </div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
