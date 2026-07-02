import { useEffect } from 'react'
import styles from './Toast.module.css'

interface Props {
  message: string | null
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, onDismiss, duration = 3000 }: Props) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!message) return null

  return <div className={styles.toast}>{message}</div>
}
