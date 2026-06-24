import { useState, useCallback, useRef, useEffect } from 'react'
import type { Fixture, VizPosition } from '../../../shared/types'
import { buildOccupied, getPositions } from './vizUtils'

export interface SidebarDragState {
  fixtureIds: string[]
  mouseX: number
  mouseY: number
  snappedCol: number
  snappedRow: number
  overStage: boolean
  vertical: boolean
  valid: boolean
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

const DRAG_THRESHOLD = 5

function computeGroupPositions(
  anchorCol: number, anchorRow: number,
  count: number, vertical: boolean,
  gridCols: number, gridRows: number,
): VizPosition[] {
  const positions: VizPosition[] = []
  for (let i = 0; i < count; i++) {
    const col = vertical ? anchorCol : anchorCol + i
    const row = vertical ? anchorRow + i : anchorRow
    if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return []
    positions.push({ col, row })
  }
  return positions
}

function arePositionsValid(positions: VizPosition[], occupied: Set<string>): boolean {
  if (positions.length === 0) return false
  return positions.every((p) => !occupied.has(`${p.col},${p.row}`))
}

export function useLightDrag({ fixtures, gridCols, gridRows, isEditing, ownerWindow, stageRef, onFixtureVizChange }: UseLightDragArgs) {
  const [sidebarDrag, setSidebarDrag] = useState<SidebarDragState | null>(null)
  const dragRef = useRef<{ fixtureId: string; posIndex: number } | null>(null)
  const dragStartPos = useRef({ col: 0, row: 0 })
  const pendingSidebarDrag = useRef<{ fixtureIds: string[]; startX: number; startY: number } | null>(null)

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

      if (pendingSidebarDrag.current) {
        const dx = e.clientX - pendingSidebarDrag.current.startX
        const dy = e.clientY - pendingSidebarDrag.current.startY
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          const { fixtureIds } = pendingSidebarDrag.current
          pendingSidebarDrag.current = null
          setSidebarDrag({ fixtureIds, mouseX: e.clientX, mouseY: e.clientY, snappedCol: 0, snappedRow: 0, overStage: false, vertical: false, valid: false })
        }
        return
      }

      updateSidebarDrag(e.clientX, e.clientY, e.shiftKey)
    }

    function updateSidebarDrag(mouseX: number, mouseY: number, shiftKey: boolean) {
      setSidebarDrag((prev) => {
        if (!prev) return null
        let overStage = false
        let snappedCol = prev.snappedCol
        let snappedRow = prev.snappedRow
        const vertical = shiftKey
        if (stageRef.current) {
          const rect = stageRef.current.getBoundingClientRect()
          overStage = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom
          if (overStage) {
            const pctX = ((mouseX - rect.left) / rect.width) * 100
            const pctY = ((mouseY - rect.top) / rect.height) * 100
            snappedCol = Math.max(0, Math.min(gridCols - 1, Math.round((pctX / 100) * (gridCols - 1))))
            snappedRow = Math.max(0, Math.min(gridRows - 1, Math.round((pctY / 100) * (gridRows - 1))))
          }
        }
        const count = prev.fixtureIds.length
        const occupied = buildOccupied(fixtures)
        const groupPositions = computeGroupPositions(snappedCol, snappedRow, count, vertical, gridCols, gridRows)
        const valid = overStage && arePositionsValid(groupPositions, occupied)
        return { ...prev, mouseX, mouseY, overStage, snappedCol, snappedRow, vertical, valid }
      })
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return
      setSidebarDrag((prev) => {
        if (!prev || !prev.overStage) return prev
        const vertical = e.type === 'keydown'
        const occupied = buildOccupied(fixtures)
        const groupPositions = computeGroupPositions(prev.snappedCol, prev.snappedRow, prev.fixtureIds.length, vertical, gridCols, gridRows)
        const valid = arePositionsValid(groupPositions, occupied)
        return { ...prev, vertical, valid }
      })
    }

    const onUp = () => {
      pendingSidebarDrag.current = null

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
        if (!prev) return null
        if (prev.overStage && prev.valid) {
          const occupied = buildOccupied(fixtures)
          const groupPositions = computeGroupPositions(prev.snappedCol, prev.snappedRow, prev.fixtureIds.length, prev.vertical, gridCols, gridRows)
          if (arePositionsValid(groupPositions, occupied)) {
            for (let i = 0; i < prev.fixtureIds.length; i++) {
              onFixtureVizChange?.(prev.fixtureIds[i], [groupPositions[i]])
            }
          }
        }
        return null
      })
    }

    ownerWindow.addEventListener('mousemove', onMove)
    ownerWindow.addEventListener('mouseup', onUp)
    ownerWindow.addEventListener('keydown', onKey)
    ownerWindow.addEventListener('keyup', onKey)
    return () => {
      ownerWindow.removeEventListener('mousemove', onMove)
      ownerWindow.removeEventListener('mouseup', onUp)
      ownerWindow.removeEventListener('keydown', onKey)
      ownerWindow.removeEventListener('keyup', onKey)
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

  const startSidebarDrag = useCallback((fixtureIds: string[], e: React.MouseEvent) => {
    e.preventDefault()
    pendingSidebarDrag.current = { fixtureIds, startX: e.clientX, startY: e.clientY }
  }, [])

  return { sidebarDrag, onLightDragStart, startSidebarDrag }
}
