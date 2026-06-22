import type { Fixture, VizPosition } from '../../../shared/types'

export function isPlaced(fixture: Fixture): boolean {
  return !!(fixture.vizPositions && fixture.vizPositions.length > 0)
}

export function getPositions(fixture: Fixture): VizPosition[] {
  return fixture.vizPositions ?? []
}

export function colToPercent(col: number, totalCols: number): number {
  if (totalCols <= 1) return 50
  return (col / (totalCols - 1)) * 100
}

export function rowToPercent(row: number, totalRows: number): number {
  if (totalRows <= 1) return 50
  return (row / (totalRows - 1)) * 100
}

export function hasFixtureAt(fixtures: Fixture[], axis: 'col' | 'row', index: number): boolean {
  for (const fixture of fixtures) {
    for (const pos of getPositions(fixture)) {
      if (pos[axis] === index) return true
    }
  }
  return false
}

export function buildOccupied(fixtures: Fixture[], excludeFixtureId?: string, excludePosIndex?: number): Set<string> {
  const set = new Set<string>()
  for (const f of fixtures) {
    for (let i = 0; i < getPositions(f).length; i++) {
      if (f.id === excludeFixtureId && i === excludePosIndex) continue
      const p = getPositions(f)[i]
      set.add(`${p.col},${p.row}`)
    }
  }
  return set
}

export function findNextFree(col: number, row: number, gridCols: number, gridRows: number, occupied: Set<string>): VizPosition | null {
  let c = col
  let r = row
  for (let i = 0; i < gridCols * gridRows; i++) {
    if (!occupied.has(`${c},${r}`)) return { col: c, row: r }
    c++
    if (c >= gridCols) { c = 0; r++ }
    if (r >= gridRows) r = 0
  }
  return null
}
