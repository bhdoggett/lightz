// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiFixtureFader } from './MultiFixtureFader'
import type { Fixture } from '../../shared/types'

const fixture: Fixture = {
  id: 'f1', name: 'Stage Left Q6', channel: 1, universe: 0, type: 'dimmer',
  channels: [
    { id: 'c-r', role: 'red',   label: 'Red',   channel: 1, universe: 0, linked: true },
    { id: 'c-g', role: 'green', label: 'Green', channel: 2, universe: 0, linked: true },
    { id: 'c-b', role: 'blue',  label: 'Blue',  channel: 3, universe: 0, linked: true },
    { id: 'c-s', role: 'strobe', label: 'Strobe', channel: 4, universe: 0, linked: false },
  ],
}
const values = { 'c-r': 200, 'c-g': 100, 'c-b': 50, 'c-s': 0 }

describe('MultiFixtureFader', () => {
  it('renders fixture name', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    expect(screen.getByText('Stage Left Q6')).toBeTruthy()
  })

  it('expands on click to show channel labels', async () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Stage Left Q6'))
    expect(screen.getByText('Red')).toBeTruthy()
    expect(screen.getByText('Green')).toBeTruthy()
    expect(screen.getByText('Strobe')).toBeTruthy()
  })

  it('on/off toggle calls onChange with zeros when toggled off', () => {
    const onChange = vi.fn()
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ 'c-r': 0, 'c-g': 0, 'c-b': 0, 'c-s': 0 })
    )
  })

  it('on/off toggle restores values when toggled back on', () => {
    const onChange = vi.fn()
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={onChange} />)
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle) // off
    fireEvent.click(toggle) // on
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ 'c-r': 200, 'c-g': 100, 'c-b': 50, 'c-s': 0 })
    )
  })
})
