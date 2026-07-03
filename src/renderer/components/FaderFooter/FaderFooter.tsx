import styles from './FaderFooter.module.css'

export interface FaderFooterProps {
  variant: 'controls' | 'filler'
  children?: React.ReactNode
}

export function FaderFooter({ variant, children }: FaderFooterProps) {
  return (
    <div className={styles.faderFooter} data-testid="fader-footer">
      <div className={styles.divider} />
      <div className={styles.content}>
        {variant === 'filler' ? (
          <div className={styles.filler} aria-hidden="true" data-testid="fader-footer-filler" />
        ) : (
          children
        )}
      </div>
    </div>
  )
}
