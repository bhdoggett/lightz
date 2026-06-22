import { useState, useCallback, useRef, useEffect } from 'react'
import type { Fixture, VizPosition } from '../../../shared/types'
import { buildOccupied, getPositions } from './vizUtils'

export interface SidebarDragState {
  fixtureId: string
  mouseX: number
  mouseY: number
  snappedCol: number
  snappedRow: number
  overStage: boolean
}

interface UseLightDragArgs {
  fixtures: Fixture[]
  gridCols: number
  gridRows: number
  isEditing: boolean
  ownerWindow: Window
  stageRef: React.RefObject<HTMLDivElement | null>
  onFixtureVizChange?: (fixtureId: string, vizPositions: VizPosition[]) => void
}

export function useLightDrag({ fixtures, gridCols, gridRows, isEditing, ownerWindow, stageRef, onFixtureVizChange }: UseLightDragArgs) {
  const [sidebarDrag, setSidebarDrag] = useState<SidebarDragState | null>(null)
  const dragRef = useRef<{ fixtureId: string; posIndex: number } | null>(null)
  const dragStartPos = useRef({ col: 0, row: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current && stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect()
        const pctX = ((e.clientX - rect.left) / rect.width) * 100
        const pctY = ((e.clientY - rect.top) / rect.height) * 100
        const col = Math.round((pctX / 100) * (gridCols - 1))
        const row = Math.round((pctY / 100) * (gridRows - 1))
        const snappedCol = Math.max(0, Math.min(gridCols - 1, col))
        const snappedRow = Math.max(0, Math.min(gridRows - 1, row))
        const { fixtureId, posIndex } = dragRef.current
        const fixture = fixtures.find((f) => f.id === fixtureId)
        if (!fixture) return
        const occupied = buildOccupied(fixtures, fixtureId, posIndex)
        const positions = [...getPositions(fixture)]
        if (positions[posIndex].col !== snappedCol || positions[posIndex].row !== snappedRow) {
          if (!occupied.has(`${snappedCol},${snappedRow}`)) {
            positions[posIndex] = { col: snappedCol, row: snappedRow }
            onFixtureVizChange?.(fixtureId, positions)
          }
        }
      }
      setSidebarDrag((prev) => {
        if (!prev) return null
        let overStage = false
        let snappedCol = prev.snappedCol
        let snappedRow = prev.snappedRow
        if (stageRef.current) {
          const rect = stageRef.current.getBoundingClientRect()
          overStage = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
          if (overStage) {
            const pctX = ((e.clientX - rect.left) / rect.width) * 100
            const pctY = ((e.clientY - rect.top) / rect.height) * 100
            snappedCol = Math.max(0, Math.min(gridCols - 1, Math.round((pctX / 100) * (gridCols - 1))))
            snappedRow = Math.max(0, Math.min(gridRows - 1, Math.round((pctY / 100) * (gridRows - 1))))
          }
        }
        return { ...prev, mouseX: e.clientX, mouseY: e.clientY, overStage, snappedCol, snappedRow }
      })
    }

    const onUp = () => {
      if (dragRef.current) {
        const { fixtureId, posIndex } = dragRef.current
        const fixture = fixtures.find((f) => f.id === fixtureId)
        if (fixture) {
          const occupied = buildOccupied(fixtures, fixtureId, posIndex)
          const positions = [...getPositions(fixture)]
          const cur = positions[posIndex]
          if (occupied.has(`${cur.col},${cur.row}`)) {
            positions[posIndex] = { ...dragStartPos.current }
            onFixtureVizChange?.(fixtureId, positions)
          }
        }
        dragRef.current = null
      }
      setSidebarDrag((prev) => {
        if (prev && prev.overStage) {
          const occupied = buildOccupied(fixtures)
          if (!occupied.has(`${prev.snappedCol},${prev.snappedRow}`)) {
            onFixtureVizChange?.(prev.fixtureId, [{ col: prev.snappedCol, row: prev.snappedRow }])
          }
        }
        return null
      })
    }

    ownerWindow.addEventListener('mousemove', onMove)
    ownerWindow.addEventListener('mouseup', onUp)
    return () => {
      ownerWindow.removeEventListener('mousemove', onMove)
      ownerWindow.removeEventListener('mouseup', onUp)
    }
  }, [fixtures, onFixtureVizChange, gridCols, gridRows, ownerWindow])

  const onLightDragStart = useCallback((e: React.MouseEvent, fixtureId: string, posIndex: number, pos: VizPosition) => {
    if (!isEditing) return
    e.preventDefault()
    e.stopPropagation()
    if (!stageRef.current) return
    dragRef.current = { fixtureId, posIndex }
    dragStartPos.current = { col: pos.col, row: pos.row }
  }, [isEditing, stageRef])

  const startSidebarDrag = useCallback((fixtureId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setSidebarDrag({ fixtureId, mouseX: e.clientX, mouseY: e.clientY, snappedCol: 0, snappedRow: 0, overStage: false })
  }, [])

  return { sidebarDrag, onLightDragStart, startSidebarDrag }
}
