import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import styles from './ColorPickerPopover.module.css'

interface Props {
  color: string        // cursor position inside the picker (chroma only — no white)
  swatchColor?: string // swatch button color (full display, including white)
  anchorRef?: React.RefObject<HTMLElement | null> // element to position popover above
  onChange: (hex: string) => void
  onClick?: (e: React.MouseEvent) => void
}

const PICKER_WIDTH = 200
const PICKER_HEIGHT = 220
const GAP = 6

export function ColorPickerPopover({ color, swatchColor, anchorRef, onChange, onClick }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [pickerColor, setPickerColor] = useState(color)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(e)
    if (!open) {
      setPickerColor(color)
      const anchor = anchorRef?.current ?? btnRef.current
      if (anchor) {
        const rect = anchor.getBoundingClientRect()
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - PICKER_WIDTH - 8))
        let top = rect.top - PICKER_HEIGHT + 13
        if (top < 8) top = rect.bottom + GAP
        setPos({ top, left })
      }
    }
    setOpen((prev) => !prev)
  }

  const handlePickerChange = (hex: string) => {
    setPickerColor(hex)
    onChange(hex)
  }

  return (
    <>
      <button
        ref={btnRef}
        className={styles.swatch}
        style={{ background: swatchColor || color || '#000000' }}
        onClick={handleToggle}
        title="Pick color"
        aria-expanded={open}
      />
      {open && (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{ top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <HexColorPicker color={pickerColor || '#000000'} onChange={handlePickerChange} />
        </div>
      )}
    </>
  )
}
