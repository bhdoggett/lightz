import { useRef, useState } from 'react'
import type React from 'react'

export function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (reordered: T[]) => void
) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  // dragstart fires with the draggable element as its target, not the element
  // the gesture started on — so the originating element is captured on mousedown.
  const pressedOnInput = useRef(false)

  const containerProps = {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-drag-id]'))
      for (let i = 0; i < els.length; i++) {
        const rect = els[i].getBoundingClientRect()
        if (e.clientX < rect.left + rect.width / 2) { setInsertIndex(i); return }
      }
      setInsertIndex(items.length)
    },
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const sourceId = e.dataTransfer.getData('text/plain')
      if (!sourceId || insertIndex === null) return
      const sourceIndex = items.findIndex((item) => item.id === sourceId)
      if (sourceIndex === -1) return
      const reordered = [...items]
      const [moved] = reordered.splice(sourceIndex, 1)
      const adjusted = insertIndex > sourceIndex ? insertIndex - 1 : insertIndex
      reordered.splice(adjusted, 0, moved)
      onReorder(reordered)
      setDragId(null)
      setInsertIndex(null)
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setInsertIndex(null)
      }
    },
  }

  const itemProps = (id: string) => ({
    draggable: true as const,
    'data-drag-id': id,
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
      const target = e.target as HTMLElement
      pressedOnInput.current = target.tagName === 'INPUT' || !!target.closest('[data-no-drag]')
    },
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      if (pressedOnInput.current) {
        e.preventDefault()
        return
      }
      setDragId(id)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    },
    onDragEnd: () => { setDragId(null); setInsertIndex(null) },
  })

  return { dragId, insertIndex, containerProps, itemProps }
}
