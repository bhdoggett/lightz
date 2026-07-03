// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiFixtureFader } from './MultiFixtureFader'
import type { Fixture } from '../../../shared/types'

vi.mock('../../api/context', () => ({
  useApi: () => ({
    updateFixture: vi.fn().mockResolvedValue({}),
  }),
}))

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

  it('shows MULTI under the fixture name on the master fader instead of a channel number', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    expect(screen.getByText('MULTI')).toBeTruthy()
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

  it('renders its gear/swatch/expand controls inside a shared FaderFooter', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    const footer = screen.getByTestId('fader-footer')
    expect(footer).toContainElement(screen.getByTitle('Edit fixture'))
    expect(footer).toContainElement(screen.getByTitle('Expand channels'))
  })

  describe('edit mode', () => {
    const dragHandleProps = {
      draggable: true as const,
      'data-drag-id': 'f1',
      onMouseDown: vi.fn(),
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
    }

    it('renders exactly one drag handle (the master), not one per sub-channel, when expanded', () => {
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={vi.fn()}
          dragHandleProps={dragHandleProps}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /expand channels/i }))
      expect(screen.getAllByTestId('drag-handle')).toHaveLength(1)
    })

    it('calls onSelect when the master fader area is clicked', () => {
      const onSelect = vi.fn()
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={onSelect}
        />
      )
      fireEvent.click(screen.getByTestId('select-overlay'))
      expect(onSelect).toHaveBeenCalled()
    })

    it('does not render a drag handle when isEditing is false', () => {
      render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
    })

    it('does not call onEdit when the gear button is clicked while editing', () => {
      const onEdit = vi.fn()
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          onEdit={onEdit}
          isEditing
          onSelect={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTitle('Edit fixture'))
      expect(onEdit).not.toHaveBeenCalled()
    })

    it('calls onSelect (via bubbling) when the gear button is clicked while editing', () => {
      const onSelect = vi.fn()
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={onSelect}
        />
      )
      fireEvent.click(screen.getByTitle('Edit fixture'))
      expect(onSelect).toHaveBeenCalled()
    })

    it('keeps the color picker swatch visible while editing', () => {
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={vi.fn()}
        />
      )
      expect(screen.getByTitle('Pick color')).toBeInTheDocument()
    })

    it('clicking the swatch while editing selects the fixture instead of opening the picker', () => {
      const onSelect = vi.fn()
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={onSelect}
        />
      )
      const swatch = screen.getByTitle('Pick color')
      fireEvent.click(swatch)
      expect(onSelect).toHaveBeenCalled()
      expect(swatch).toHaveAttribute('aria-expanded', 'false')
    })

    it('expands when the expand button is clicked while editing, like a group can be toggled open', () => {
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTitle('Expand channels'))
      expect(screen.getByText('Red')).toBeInTheDocument()
    })

    it('does not call onSelect when the expand button is clicked while editing', () => {
      const onSelect = vi.fn()
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={onSelect}
        />
      )
      fireEvent.click(screen.getByTitle('Expand channels'))
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('disables sub-channel faders once editing starts, even if the fixture was already expanded', () => {
      const { rerender, container } = render(
        <MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />
      )
      fireEvent.click(screen.getByTitle('Expand channels'))
      expect(screen.getByText('Red')).toBeTruthy()

      rerender(
        <MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} isEditing onSelect={vi.fn()} />
      )
      const overlays = container.querySelectorAll('[data-testid="select-overlay"]')
      expect(overlays.length).toBe(1 + fixture.channels!.length)
    })

    it('applies the selected outline to the whole card, not just the master fader', () => {
      const { container } = render(
        <MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} isEditing selected onSelect={vi.fn()} />
      )
      const card = container.querySelector('[class*="card"]')
      expect(card?.className).toMatch(/selected/)
    })
  })
})
