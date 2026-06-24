import { useState, useCallback, useRef, useEffect } from 'react'
import type { Fixture } from '../../../shared/types'
import { getPositions, colToPercent, rowToPercent } from './vizUtils'

export interface MarqueeRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface UseMarqueeSelectArgs {
  fixtures: Fixture[]
  gridCols: number
  gridRows: number
  isEditing: boolean
  ownerWindow: Window
  stageRef: React.RefObject<HTMLDivElement | null>
}

function positionsInRect(
  fixtures: Fixture[], rect: MarqueeRect,
  gridCols: number, gridRows: number,
  stageRect: DOMRect,
): Set<string> {
  const keys = new Set<string>()
  const left = Math.min(rect.x1, rect.x2)
  const right = Math.max(rect.x1, rect.x2)
  const top = Math.min(rect.y1, rect.y2)
  const bottom = Math.max(rect.y1, rect.y2)

  for (const f of fixtures) {
    const positions = getPositions(f)
    for (let pi = 0; pi < positions.length; pi++) {
      const pos = positions[pi]
      const px = stageRect.left + (colToPercent(pos.col, gridCols) / 100) * stageRect.width
      const py = stageRect.top + (rowToPercent(pos.row, gridRows) / 100) * stageRect.height
      if (px >= left && px <= right && py >= top && py <= bottom) {
        keys.add(`${f.id}:${pi}`)
      }
    }
  }
  return keys
}

export function useMarqueeSelect({ fixtures, gridCols, gridRows, isEditing, ownerWindow, stageRef }: UseMarqueeSelectArgs) {
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null)
  const [selectedStage, setSelectedStage] = useState<Set<string>>(new Set())
  const marqueeStart = useRef<{ x: number; y: number } | null>(null)
  const marqueeActive = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!marqueeStart.current) return
      const dx = e.clientX - marqueeStart.current.x
      const dy = e.clientY - marqueeStart.current.y
      if (!marqueeActive.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        marqueeActive.current = true
      }
      if (!marqueeActive.current) return
      const rect: MarqueeRect = {
        x1: marqueeStart.current.x,
        y1: marqueeStart.current.y,
        x2: e.clientX,
        y2: e.clientY,
      }
      setMarquee(rect)
      if (stageRef.current) {
        const stageRect = stageRef.current.getBoundingClientRect()
        const hits = positionsInRect(fixtures, rect, gridCols, gridRows, stageRect)
        setSelectedStage(hits)
      }
    }

    const onUp = () => {
      if (marqueeActive.current && marquee && stageRef.current) {
        const stageRect = stageRef.current.getBoundingClientRect()
        const hits = positionsInRect(fixtures, marquee, gridCols, gridRows, stageRect)
        setSelectedStage(hits)
      }
      marqueeStart.current = null
      marqueeActive.current = false
      setMarquee(null)
    }

    ownerWindow.addEventListener('mousemove', onMove)
    ownerWindow.addEventListener('mouseup', onUp)
    return () => {
      ownerWindow.removeEventListener('mousemove', onMove)
      ownerWindow.removeEventListener('mouseup', onUp)
    }
  }, [fixtures, gridCols, gridRows, ownerWindow, marquee])

  const startMarquee = useCallback((e: React.MouseEvent) => {
    if (!isEditing) return
    e.preventDefault()
    marqueeStart.current = { x: e.clientX, y: e.clientY }
    marqueeActive.current = false
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      setSelectedStage(new Set())
    }
  }, [isEditing])

  const clearStageSelection = useCallback(() => {
    setSelectedStage(new Set())
  }, [])

  return { marquee, selectedStage, setSelectedStage, startMarquee, clearStageSelection }
}
