import { deriveSectionOrder } from './MainView'
import type { Fixture, Group } from '../../shared/types'

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
