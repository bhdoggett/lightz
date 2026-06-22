import { useState, useCallback, useRef, useEffect } from 'react'

const MIN_HEIGHT = 32
const MAX_HEIGHT = 600

export function useStageResize(defaultHeight: number, ownerWindow: Window) {
  const [expanded, setExpanded] = useState(true)
  const [height, setHeight] = useState(defaultHeight)
  const resizing = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = true
    startY.current = e.clientY
    startHeight.current = height
  }, [height])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return
      const delta = startY.current - e.clientY
      const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight.current + delta))
      setHeight(next)
      if (next > MIN_HEIGHT + 20) setExpanded(true)
    }
    const onUp = () => { resizing.current = false }
    ownerWindow.addEventListener('mousemove', onMove)
    ownerWindow.addEventListener('mouseup', onUp)
    return () => {
      ownerWindow.removeEventListener('mousemove', onMove)
      ownerWindow.removeEventListener('mouseup', onUp)
    }
  }, [ownerWindow])

  return { expanded, setExpanded, height, onResizeStart, MIN_HEIGHT }
}
