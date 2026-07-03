import { forwardRef } from 'react'
import styles from './FaderCard.module.css'

export type FaderCardVariant = 'bordered' | 'divider' | 'none'

export interface FaderCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: FaderCardVariant
  accentColor?: string
}

export const FaderCard = forwardRef<HTMLDivElement, FaderCardProps>(function FaderCard(
  { variant, accentColor, className, style, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={[
        variant === 'bordered' ? styles.bordered : '',
        variant === 'bordered' && accentColor ? styles.accentBottom : '',
        variant === 'divider' ? styles.divider : '',
        className || '',
      ].filter(Boolean).join(' ')}
      style={accentColor ? { ...style, '--fader-card-accent': accentColor } as React.CSSProperties : style}
      {...rest}
    >
      {children}
    </div>
  )
})
