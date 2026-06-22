import { useState, useCallback, useEffect } from 'react'
import type { Fixture, VizPosition } from '../../../shared/types'
import { buildOccupied, findNextFree, getPositions, hasFixtureAt, isPlaced } from './vizUtils'

interface UseGridEditorArgs {
  fixtures: Fixture[]
  onFixtureVizChange?: (fixtureId: string, vizPositions: VizPosition[]) => void
}

export function useGridEditor({ fixtures, onFixtureVizChange }: UseGridEditorArgs) {
  const [gridCols, setGridCols] = useState(10)
  const [gridRows, setGridRows] = useState(6)

  const placedFixtures = fixtures.filter(isPlaced)
  const unplacedFixtures = fixtures.filter((f) => !isPlaced(f))

  useEffect(() => {
    let maxCol = gridCols - 1
    let maxRow = gridRows - 1
    for (const f of fixtures) {
      for (const p of getPositions(f)) {
        if (p.col > maxCol) maxCol = p.col
        if (p.row > maxRow) maxRow = p.row
      }
    }
    if (maxCol >= gridCols) setGridCols(maxCol + 1)
    if (maxRow >= gridRows) setGridRows(maxRow + 1)
  }, [fixtures])

  const handleDuplicate = useCallback((fixture: Fixture, posIndex: number) => {
    const positions = getPositions(fixture)
    const source = positions[posIndex]
    const occupied = buildOccupied(fixtures)
    const startCol = Math.min(gridCols - 1, source.col + 1)
    const free = findNextFree(startCol, source.row, gridCols, gridRows, occupied)
    if (!free) return
    onFixtureVizChange?.(fixture.id, [...positions, free])
  }, [fixtures, onFixtureVizChange, gridCols, gridRows])

  const handleRemove = useCallback((fixture: Fixture, posIndex: number) => {
    const positions = getPositions(fixture)
    const next = positions.filter((_, i) => i !== posIndex)
    onFixtureVizChange?.(fixture.id, next)
  }, [fixtures, onFixtureVizChange])

  const handleAutoPlace = useCallback(() => {
    const occupied = buildOccupied(fixtures)
    let rows = gridRows
    for (const fixture of unplacedFixtures) {
      let free = findNextFree(0, 0, gridCols, rows, occupied)
      if (!free) {
        rows++
        free = { col: 0, row: rows - 1 }
      }
      occupied.add(`${free.col},${free.row}`)
      onFixtureVizChange?.(fixture.id, [free])
    }
    if (rows !== gridRows) setGridRows(rows)
  }, [fixtures, unplacedFixtures, gridCols, gridRows, onFixtureVizChange])

  const addCol = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
        if (positions.length > 0) {
          onFixtureVizChange?.(fixture.id, positions.map((p) => ({ col: p.col + 1, row: p.row })))
        }
      }
    }
    setGridCols((c) => c + 1)
  }, [fixtures, onFixtureVizChange])

  const removeCol = useCallback((side: 'left' | 'right') => {
    const edgeCol = side === 'left' ? 0 : gridCols - 1
    if (hasFixtureAt(fixtures, 'col', edgeCol)) return
    if (gridCols <= 3) return
    if (side === 'left') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
        if (positions.length > 0) {
          onFixtureVizChange?.(fixture.id, positions.map((p) => ({ col: p.col - 1, row: p.row })))
        }
      }
    }
    setGridCols((c) => c - 1)
  }, [fixtures, onFixtureVizChange, gridCols])

  const addRow = useCallback((side: 'top' | 'bottom') => {
    if (side === 'top') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
        if (positions.length > 0) {
          onFixtureVizChange?.(fixture.id, positions.map((p) => ({ col: p.col, row: p.row + 1 })))
        }
      }
    }
    setGridRows((r) => r + 1)
  }, [fixtures, onFixtureVizChange])

  const removeRow = useCallback((side: 'top' | 'bottom') => {
    const edgeRow = side === 'top' ? 0 : gridRows - 1
    if (hasFixtureAt(fixtures, 'row', edgeRow)) return
    if (gridRows <= 3) return
    if (side === 'top') {
      for (const fixture of fixtures) {
        const positions = getPositions(fixture)
        if (positions.length > 0) {
          onFixtureVizChange?.(fixture.id, positions.map((p) => ({ col: p.col, row: p.row - 1 })))
        }
      }
    }
    setGridRows((r) => r - 1)
  }, [fixtures, onFixtureVizChange, gridRows])

  const canRemoveLeftCol = gridCols > 3 && !hasFixtureAt(fixtures, 'col', 0)
  const canRemoveRightCol = gridCols > 3 && !hasFixtureAt(fixtures, 'col', gridCols - 1)
  const canRemoveTopRow = gridRows > 3 && !hasFixtureAt(fixtures, 'row', 0)
  const canRemoveBottomRow = gridRows > 3 && !hasFixtureAt(fixtures, 'row', gridRows - 1)

  return {
    gridCols, gridRows,
    placedFixtures, unplacedFixtures,
    handleDuplicate, handleRemove, handleAutoPlace,
    addCol, removeCol, addRow, removeRow,
    canRemoveLeftCol, canRemoveRightCol, canRemoveTopRow, canRemoveBottomRow,
  }
}
