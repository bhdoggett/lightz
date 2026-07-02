import { deriveSectionOrder, computeClickSelection, computeRemovalPlan, insertAt } from './MainView'
import type { Fixture, Group } from '../../shared/types'
import type { SelectionState } from './MainView'

const groups: Group[] = [
  { id: 'g1', name: 'A', color: '#f00', fixtureIds: ['f1'] },
  { id: 'g2', name: 'B', color: '#0f0', fixtureIds: [] },
]
const fixtures: Fixture[] = [
  { id: 'f1', name: 'Spot', channel: 5, universe: 0, type: 'dimmer' },
  { id: 'f2', name: 'Wash', channel: 2, universe: 0, type: 'dimmer' },
]

it('derives order from scratch: groups first, then ungrouped fixtures by channel', () => {
  expect(deriveSectionOrder(undefined, fixtures, groups)).toEqual(['g1', 'g2', 'f2'])
})

it('f1 is in group g1 so not included as ungrouped', () => {
  const order = deriveSectionOrder(undefined, fixtures, groups)
  expect(order).not.toContain('f1')
  expect(order).toContain('g1')
})

it('preserves stored order and filters deleted IDs', () => {
  expect(deriveSectionOrder(['g2', 'f2', 'g1'], fixtures, groups)).toEqual(['g2', 'f2', 'g1'])
})

it('appends newly added IDs not in stored order', () => {
  expect(deriveSectionOrder(['g1'], fixtures, groups)).toEqual(['g1', 'g2', 'f2'])
})

describe('computeClickSelection', () => {
  const order = ['a', 'b', 'c', 'd']
  const empty: SelectionState = { selected: new Set(), lastClickedId: null }

  it('plain click selects only the clicked item', () => {
    const result = computeClickSelection(empty, 'b', order, { cmd: false, shift: false })
    expect(result.selected).toEqual(new Set(['b']))
    expect(result.lastClickedId).toBe('b')
  })

  it('plain click replaces a prior selection', () => {
    const state: SelectionState = { selected: new Set(['a', 'c']), lastClickedId: 'c' }
    const result = computeClickSelection(state, 'b', order, { cmd: false, shift: false })
    expect(result.selected).toEqual(new Set(['b']))
  })

  it('cmd click adds to the selection without clearing others', () => {
    const state: SelectionState = { selected: new Set(['a']), lastClickedId: 'a' }
    const result = computeClickSelection(state, 'c', order, { cmd: true, shift: false })
    expect(result.selected).toEqual(new Set(['a', 'c']))
    expect(result.lastClickedId).toBe('c')
  })

  it('cmd click on an already-selected item removes it', () => {
    const state: SelectionState = { selected: new Set(['a', 'c']), lastClickedId: 'c' }
    const result = computeClickSelection(state, 'c', order, { cmd: true, shift: false })
    expect(result.selected).toEqual(new Set(['a']))
  })

  it('shift click selects the range from the anchor forward', () => {
    const state: SelectionState = { selected: new Set(['a']), lastClickedId: 'a' }
    const result = computeClickSelection(state, 'c', order, { cmd: false, shift: true })
    expect(result.selected).toEqual(new Set(['a', 'b', 'c']))
    expect(result.lastClickedId).toBe('a')
  })

  it('shift click selects the range from the anchor backward', () => {
    const state: SelectionState = { selected: new Set(['d']), lastClickedId: 'd' }
    const result = computeClickSelection(state, 'b', order, { cmd: false, shift: true })
    expect(result.selected).toEqual(new Set(['b', 'c', 'd']))
    expect(result.lastClickedId).toBe('d')
  })

  it('shift click with no prior anchor selects only the clicked item', () => {
    const result = computeClickSelection(empty, 'c', order, { cmd: false, shift: true })
    expect(result.selected).toEqual(new Set(['c']))
    expect(result.lastClickedId).toBe('c')
  })

  it('shift click preserves the anchor for further shift-clicks', () => {
    const state: SelectionState = { selected: new Set(['a', 'b']), lastClickedId: 'a' }
    const result = computeClickSelection(state, 'd', order, { cmd: false, shift: true })
    expect(result.lastClickedId).toBe('a')
    expect(result.selected).toEqual(new Set(['a', 'b', 'c', 'd']))
  })
})

describe('computeRemovalPlan', () => {
  const fixtures: Fixture[] = [
    { id: 'f1', name: 'Spot', channel: 1, universe: 0, type: 'dimmer' },
    { id: 'f2', name: 'Wash', channel: 2, universe: 0, type: 'dimmer' },
    { id: 'f3', name: 'Beam', channel: 3, universe: 0, type: 'dimmer' },
  ]
  const groups: Group[] = [
    { id: 'g1', name: 'A', color: '#f00', fixtureIds: ['f1', 'f2'] },
  ]

  it('plans a standalone fixture for deletion', () => {
    const plan = computeRemovalPlan(new Set(['f3']), fixtures, groups)
    expect(plan.fixtureIds).toEqual(['f3'])
    expect(plan.groupIds).toEqual([])
  })

  it('plans a group and all its fixtures for deletion', () => {
    const plan = computeRemovalPlan(new Set(['g1']), fixtures, groups)
    expect(plan.groupIds).toEqual(['g1'])
    expect(plan.fixtureIds.slice().sort()).toEqual(['f1', 'f2'])
  })

  it('merges a selected group with a separately selected standalone fixture without duplicates', () => {
    const plan = computeRemovalPlan(new Set(['g1', 'f3']), fixtures, groups)
    expect(plan.groupIds).toEqual(['g1'])
    expect(plan.fixtureIds.slice().sort()).toEqual(['f1', 'f2', 'f3'])
  })

  it('does not duplicate a fixture id that is both in a selected group and individually selected', () => {
    const plan = computeRemovalPlan(new Set(['g1', 'f1']), fixtures, groups)
    expect(plan.fixtureIds.slice().sort()).toEqual(['f1', 'f2'])
  })
})

describe('insertAt', () => {
  it('appends to the end when index is omitted', () => {
    expect(insertAt(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
  })

  it('inserts at the given index', () => {
    expect(insertAt(['a', 'b', 'c'], 'x', 1)).toEqual(['a', 'x', 'b', 'c'])
  })

  it('inserts at index 0', () => {
    expect(insertAt(['a', 'b'], 'x', 0)).toEqual(['x', 'a', 'b'])
  })

  it('removes a prior occurrence before reinserting, so an existing id moves rather than duplicates', () => {
    expect(insertAt(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a'])
  })

  it('clamps an out-of-range index to the end', () => {
    expect(insertAt(['a', 'b'], 'x', 99)).toEqual(['a', 'b', 'x'])
  })

  it('clamps a negative index to the start', () => {
    expect(insertAt(['a', 'b'], 'x', -5)).toEqual(['x', 'a', 'b'])
  })

  it('inserting an id not already present at the end index appends it', () => {
    expect(insertAt(['a', 'b'], 'c', 2)).toEqual(['a', 'b', 'c'])
  })
})
