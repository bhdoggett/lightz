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

export interface StageDragState {
  fixtureIds: string[]
  posIndices: number[]
  mouseX: number
  mouseY: number
  offsets: VizPosition[]
  snappedCol: number
  snappedRow: number
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
  selectedStage?: Set<string>
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

function computeStageDragTargets(
  anchorCol: number, anchorRow: number,
  offsets: VizPosition[],
  gridCols: number, gridRows: number,
): VizPosition[] {
  const targets: VizPosition[] = []
  for (const off of offsets) {
    const col = anchorCol + off.col
    const row = anchorRow + off.row
    if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return []
    targets.push({ col, row })
  }
  return targets
}

export function useLightDrag({ fixtures, gridCols, gridRows, isEditing, ownerWindow, stageRef, onFixtureVizChange, selectedStage = new Set() }: UseLightDragArgs) {
  const [sidebarDrag, setSidebarDrag] = useState<SidebarDragState | null>(null)
  const [stageDrag, setStageDrag] = useState<StageDragState | null>(null)
  const pendingStageDrag = useRef<{
    fixtureIds: string[]
    posIndices: number[]
    offsets: VizPosition[]
    startX: number
    startY: number
    anchorCol: number
    anchorRow: number
  } | null>(null)
  const pendingSidebarDrag = useRef<{ fixtureIds: string[]; startX: number; startY: number } | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Pending stage drag: wait for threshold
      if (pendingStageDrag.current) {
        const dx = e.clientX - pendingStageDrag.current.startX
        const dy = e.clientY - pendingStageDrag.current.startY
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          const { fixtureIds, posIndices, offsets, anchorCol, anchorRow } = pendingStageDrag.current
          pendingStageDrag.current = null
          setStageDrag({
            fixtureIds, posIndices, offsets,
            mouseX: e.clientX, mouseY: e.clientY,
            snappedCol: anchorCol, snappedRow: anchorRow,
            valid: true,
          })
        }
        return
      }

      // Active stage drag: update snap position
      if (stageDrag && stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect()
        const pctX = ((e.clientX - rect.left) / rect.width) * 100
        const pctY = ((e.clientY - rect.top) / rect.height) * 100
        const snappedCol = Math.max(0, Math.min(gridCols - 1, Math.round((pctX / 100) * (gridCols - 1))))
        const snappedRow = Math.max(0, Math.min(gridRows - 1, Math.round((pctY / 100) * (gridRows - 1))))
        setStageDrag((prev) => {
          if (!prev) return null
          const targets = computeStageDragTargets(snappedCol, snappedRow, prev.offsets, gridCols, gridRows)
          const occupied = buildOccupied(fixtures)
          for (let i = 0; i < prev.fixtureIds.length; i++) {
            const f = fixtures.find((fx) => fx.id === prev.fixtureIds[i])
            if (!f) continue
            const pos = getPositions(f)[prev.posIndices[i]]
            if (pos) occupied.delete(`${pos.col},${pos.row}`)
          }
          const valid = arePositionsValid(targets, occupied)
          return { ...prev, mouseX: e.clientX, mouseY: e.clientY, snappedCol, snappedRow, valid }
        })
        return
      }

      // Pending sidebar drag: wait for threshold
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
      // Stage drag drop
      if (pendingStageDrag.current) {
        pendingStageDrag.current = null
      }
      if (stageDrag) {
        setStageDrag((prev) => {
          if (!prev || !prev.valid) return null
          const targets = computeStageDragTargets(prev.snappedCol, prev.snappedRow, prev.offsets, gridCols, gridRows)
          const occupied = buildOccupied(fixtures)
          for (let i = 0; i < prev.fixtureIds.length; i++) {
            const f = fixtures.find((fx) => fx.id === prev.fixtureIds[i])
            if (!f) continue
            const pos = getPositions(f)[prev.posIndices[i]]
            if (pos) occupied.delete(`${pos.col},${pos.row}`)
          }
          if (arePositionsValid(targets, occupied)) {
            const updates = new Map<string, VizPosition[]>()
            for (let i = 0; i < prev.fixtureIds.length; i++) {
              const fId = prev.fixtureIds[i]
              const pi = prev.posIndices[i]
              const f = fixtures.find((fx) => fx.id === fId)
              if (!f) continue
              if (!updates.has(fId)) updates.set(fId, [...getPositions(f)])
              const positions = updates.get(fId)!
              positions[pi] = targets[i]
            }
            for (const [id, positions] of updates) {
              onFixtureVizChange?.(id, positions)
            }
          }
          return null
        })
        return
      }

      pendingSidebarDrag.current = null

      // Sidebar drag drop
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
  }, [fixtures, onFixtureVizChange, gridCols, gridRows, ownerWindow, stageDrag])

  const onLightDragStart = useCallback((e: React.MouseEvent, fixtureId: string, posIndex: number, pos: VizPosition) => {
    if (!isEditing) return
    e.preventDefault()
    e.stopPropagation()
    if (!stageRef.current) return

    const posKey = `${fixtureId}:${posIndex}`
    const isGroup = selectedStage.has(posKey) && selectedStage.size > 1

    type PosEntry = { fixtureId: string; posIndex: number; pos: VizPosition }
    const entries: PosEntry[] = []

    if (isGroup) {
      for (const key of selectedStage) {
        const [fId, piStr] = key.split(':')
        const pi = parseInt(piStr, 10)
        const f = fixtures.find((fx) => fx.id === fId)
        if (!f) continue
        const positions = getPositions(f)
        if (pi < positions.length) entries.push({ fixtureId: fId, posIndex: pi, pos: positions[pi] })
      }
    } else {
      entries.push({ fixtureId, posIndex, pos })
    }

    const offsets = entries.map((ent) => ({ col: ent.pos.col - pos.col, row: ent.pos.row - pos.row }))
    const fixtureIds = entries.map((ent) => ent.fixtureId)
    const posIndices = entries.map((ent) => ent.posIndex)

    pendingStageDrag.current = {
      fixtureIds,
      posIndices,
      offsets,
      startX: e.clientX,
      startY: e.clientY,
      anchorCol: pos.col,
      anchorRow: pos.row,
    }
  }, [isEditing, stageRef, selectedStage, fixtures])

  const startSidebarDrag = useCallback((fixtureIds: string[], e: React.MouseEvent) => {
    e.preventDefault()
    pendingSidebarDrag.current = { fixtureIds, startX: e.clientX, startY: e.clientY }
  }, [])

  return { sidebarDrag, stageDrag, onLightDragStart, startSidebarDrag }
}
