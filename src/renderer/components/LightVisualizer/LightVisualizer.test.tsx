import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LightVisualizer } from './LightVisualizer'
import type { Fixture } from '../../../shared/types'

const fixtures: Fixture[] = [
  { id: 'dim1', name: 'Front Wash', channel: 1, universe: 0, type: 'dimmer', vizPositions: [{ col: 0, row: 0 }] },
  {
    id: 'rgb1', name: 'RGB Par', channel: 10, universe: 0, type: 'dimmer',
    vizPositions: [{ col: 1, row: 0 }],
    channels: [
      { id: 'rgb1-r', role: 'red', label: 'Red', channel: 10, universe: 0, linked: true },
      { id: 'rgb1-g', role: 'green', label: 'Green', channel: 11, universe: 0, linked: true },
      { id: 'rgb1-b', role: 'blue', label: 'Blue', channel: 12, universe: 0, linked: true },
    ],
  },
]

describe('LightVisualizer', () => {
  it('starts collapsed by default', () => {
    const { container } = render(
      <LightVisualizer
        fixtures={fixtures}
        getChannel={() => 0}
      />
    )
    expect(container.querySelector('[data-testid="viz-lights"]')).toBeNull()
  })

  it('renders fixture labels when expanded', () => {
    render(
      <LightVisualizer
        fixtures={fixtures}
        getChannel={() => 0}
        defaultExpanded
      />
    )
    expect(screen.getByText('Front Wash')).toBeTruthy()
    expect(screen.getByText('RGB Par')).toBeTruthy()
  })

  it('toggles expanded/collapsed on chevron click', () => {
    const { container } = render(
      <LightVisualizer
        fixtures={fixtures}
        getChannel={() => 128}
        defaultExpanded
      />
    )
    expect(container.querySelector('[data-testid="viz-lights"]')).toBeTruthy()
    const toggle = container.querySelector('[data-testid="viz-toggle"]')!
    expect(toggle).toBeTruthy()
    fireEvent.click(toggle)
    // After click, panel should collapse — lights container hidden
    const lights = container.querySelector('[data-testid="viz-lights"]')
    expect(lights).toBeNull()
  })
})
