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

  it('shows a standalone border by default', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    expect(screen.getByTestId('multi-fixture-card').className).toMatch(/bordered/)
  })

  it('omits the standalone border when nested inside a group', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} standalone={false} />)
    expect(screen.getByTestId('multi-fixture-card').className).not.toMatch(/bordered/)
  })

  it('does not double up the right-neighbor divider with its own standalone border when expanded', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} hasRightNeighbor />)
    const expandedPanel = screen.getByTestId('multi-fixture-card').firstElementChild
    expect(expandedPanel?.className).not.toMatch(/borderRight/)
  })

  it('keeps the right-neighbor divider when nested inside a group and expanded', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} standalone={false} hasRightNeighbor />)
    const expandedPanel = screen.getByTestId('multi-fixture-card').firstElementChild
    expect(expandedPanel?.className).toMatch(/borderRight/)
  })

  it('is expanded by default, showing channel labels', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    expect(screen.getByText('Red')).toBeTruthy()
    expect(screen.getByText('Green')).toBeTruthy()
    expect(screen.getByText('Strobe')).toBeTruthy()
  })

  it('collapses and expands again with the expand button', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Collapse channels'))
    expect(screen.queryByText('Red')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Expand channels'))
    expect(screen.getByText('Red')).toBeInTheDocument()
  })

  // The first toggle is the master fader's; the rest belong to the sub-channels.
  const masterToggle = () => screen.getAllByRole('button', { name: 'toggle' })[0]

  it('master toggle turns the linked channels off', () => {
    const onChange = vi.fn()
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={onChange} />)
    fireEvent.click(masterToggle())
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ 'c-r': 0, 'c-g': 0, 'c-b': 0, 'c-s': 0 })
    )
  })

  it('master toggle turns back on at full, keeping the color mix', () => {
    const onChange = vi.fn()
    const { rerender } = render(<MultiFixtureFader fixture={fixture} values={values} onChange={onChange} />)
    fireEvent.click(masterToggle()) // off
    const off = { 'c-r': 0, 'c-g': 0, 'c-b': 0, 'c-s': 0 }
    rerender(<MultiFixtureFader fixture={fixture} values={off} onChange={onChange} />)
    fireEvent.click(masterToggle()) // on
    // 200:100:50 scaled so the brightest channel is at 255
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ 'c-r': 255, 'c-g': 128, 'c-b': 64, 'c-s': 0 })
    )
  })

  it('renders its gear/swatch/expand controls inside a shared FaderFooter', () => {
    render(<MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />)
    const footer = screen.getByTestId('fader-footer')
    expect(footer).toContainElement(screen.getByTitle('Edit fixture'))
    expect(footer).toContainElement(screen.getByTitle('Collapse channels'))
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
      expect(screen.getByText('Red')).toBeInTheDocument()
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
      // The master's overlay comes first; sub-channel overlays follow.
      fireEvent.click(screen.getAllByTestId('select-overlay')[0])
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

    it('collapses and expands with the expand button while editing, like a group can be toggled open', () => {
      render(
        <MultiFixtureFader
          fixture={fixture}
          values={values}
          onChange={vi.fn()}
          isEditing
          onSelect={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTitle('Collapse channels'))
      expect(screen.queryByText('Red')).not.toBeInTheDocument()
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
      fireEvent.click(screen.getByTitle('Collapse channels'))
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('disables sub-channel faders once editing starts, even if the fixture was already expanded', () => {
      const { rerender, container } = render(
        <MultiFixtureFader fixture={fixture} values={values} onChange={vi.fn()} />
      )
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
