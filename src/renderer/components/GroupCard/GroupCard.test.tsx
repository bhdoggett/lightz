import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupCard } from './GroupCard'
import type { ComponentProps } from 'react'
import type { Group, Fixture } from '../../../shared/types'

const group: Group = { id: 'g1', name: 'Front Wash', color: '#6366f1', fixtureIds: ['f1', 'f2'] }
const fixtures: Fixture[] = [
  { id: 'f1', name: 'Spot L', channel: 1, universe: 0, type: 'dimmer' },
  { id: 'f2', name: 'Spot R', channel: 2, universe: 0, type: 'dimmer' },
]

const defaultProps = {
  group,
  fader: 100,
  fixtures,
  getChannel: (_u: 0 | 1, _ch: number) => 128,
  onFaderChange: vi.fn(),
  onFull: vi.fn(),
  onMute: vi.fn(),
  onEdit: vi.fn(),
  onFixtureChange: vi.fn(),
  onMultiFixtureChange: vi.fn(),
}

describe('GroupCard', () => {
  it('renders group name', () => {
    render(<GroupCard {...defaultProps} />)
    expect(screen.getByText('Front Wash')).toBeInTheDocument()
  })

  it('is collapsed by default — fixture value displays not visible', () => {
    render(<GroupCard {...defaultProps} />)
    expect(screen.queryByTestId('value-display')).not.toBeInTheDocument()
  })

  it('shows fixture faders when expanded', async () => {
    render(<GroupCard {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(screen.getAllByTestId('value-display').length).toBeGreaterThan(0)
  })

  it('collapses again on second click', async () => {
    render(<GroupCard {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /collapse/i }))
    expect(screen.queryByTestId('value-display')).not.toBeInTheDocument()
  })

  it('calls onFull when full button clicked', async () => {
    const onFull = vi.fn()
    render(<GroupCard {...defaultProps} onFull={onFull} />)
    await userEvent.click(screen.getByRole('button', { name: /full/i }))
    expect(onFull).toHaveBeenCalled()
  })

  it('calls onMute when mute button clicked', async () => {
    const onMute = vi.fn()
    render(<GroupCard {...defaultProps} onMute={onMute} />)
    await userEvent.click(screen.getByRole('button', { name: /mute/i }))
    expect(onMute).toHaveBeenCalled()
  })

  it('calls onEdit when gear button clicked', async () => {
    const onEdit = vi.fn()
    render(<GroupCard {...defaultProps} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: /edit group/i }))
    expect(onEdit).toHaveBeenCalled()
  })

  it('calls onFaderChange when slider moved', () => {
    const onFaderChange = vi.fn()
    render(<GroupCard {...defaultProps} onFaderChange={onFaderChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } })
    expect(onFaderChange).toHaveBeenCalledWith(60)
  })

  it('calls onDropFixture when fixture dragged onto master panel', () => {
    const onDropFixture = vi.fn()
    render(<GroupCard {...defaultProps} onDropFixture={onDropFixture} />)
    const panel = screen.getByTestId('group-drop-target')
    fireEvent.dragOver(panel, { preventDefault: () => {} })
    fireEvent.drop(panel, {
      dataTransfer: { getData: () => 'f99' },
      preventDefault: () => {},
    })
    expect(onDropFixture).toHaveBeenCalledWith('f99')
  })

  describe('edit mode', () => {
    it('renders a drag handle instead of the plain fader value when isEditing', () => {
      render(<GroupCard {...defaultProps} isEditing />)
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
    })

    it('calls onSelect when the master panel is clicked while editing', async () => {
      const onSelect = vi.fn()
      render(<GroupCard {...defaultProps} isEditing onSelect={onSelect} />)
      await userEvent.click(screen.getByTestId('select-overlay'))
      expect(onSelect).toHaveBeenCalled()
    })

    it('replaces the full/mute buttons with Unpack while editing', () => {
      render(<GroupCard {...defaultProps} isEditing onSelect={vi.fn()} onUnpack={vi.fn()} />)
      expect(screen.queryByRole('button', { name: /^full$/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^mute$/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /unpack/i })).toBeInTheDocument()
    })

    it('renders Unpack alongside Expand while editing (both available)', () => {
      render(<GroupCard {...defaultProps} isEditing onSelect={vi.fn()} onUnpack={vi.fn()} />)
      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /unpack/i })).toBeInTheDocument()
    })

    it('expanding while editing does not also call onSelect', async () => {
      const onSelect = vi.fn()
      render(<GroupCard {...defaultProps} isEditing onSelect={onSelect} onUnpack={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /expand/i }))
      expect(onSelect).not.toHaveBeenCalled()
      expect(screen.getAllByTestId('drag-handle').length).toBeGreaterThan(1)
    })

    it('calls onUnpack when Unpack is clicked, without also calling onSelect', async () => {
      const onUnpack = vi.fn()
      const onSelect = vi.fn()
      render(<GroupCard {...defaultProps} isEditing onSelect={onSelect} onUnpack={onUnpack} />)
      await userEvent.click(screen.getByRole('button', { name: /unpack/i }))
      expect(onUnpack).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('renders the selected class on the whole card when selected', () => {
      render(<GroupCard {...defaultProps} isEditing selected />)
      expect(screen.getByTestId('group-card').className).toMatch(/selected/)
    })

    it('keeps the selected outline on the whole card, not just the master panel, when the group is expanded', async () => {
      const { rerender } = render(<GroupCard {...defaultProps} />)
      await userEvent.click(screen.getByRole('button', { name: /expand/i }))
      rerender(<GroupCard {...defaultProps} isEditing selected />)
      expect(screen.getByTestId('group-card').className).toMatch(/selected/)
      // fixture panel content is still rendered (as drag handles, now that the group is editing)
      expect(screen.getAllByTestId('drag-handle').length).toBeGreaterThan(1)
    })

    it('does not render drag handle, overlay, or Unpack when isEditing is false', () => {
      render(<GroupCard {...defaultProps} />)
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
      expect(screen.queryByTestId('select-overlay')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /unpack/i })).not.toBeInTheDocument()
    })
  })

  describe('within-group drag and drop', () => {
    function stubRect(el: Element, left: number, width: number) {
      (el as HTMLElement).getBoundingClientRect = () => ({
        left, width, right: left + width, top: 0, bottom: 0, height: 0, x: left, y: 0, toJSON: () => {},
      })
    }

    // RTL's fireEvent.dragOver(el, { clientX }) does not actually apply clientX to
    // the resulting event in this jsdom version — construct a real MouseEvent instead.
    function fireDragOver(el: Element, clientX: number) {
      const event = new MouseEvent('dragover', { clientX, bubbles: true, cancelable: true })
      Object.defineProperty(event, 'dataTransfer', { value: { dropEffect: '' } })
      fireEvent(el, event)
    }

    async function renderExpanded(props: Partial<ComponentProps<typeof GroupCard>> = {}) {
      const utils = render(<GroupCard {...defaultProps} isEditing onSelect={vi.fn()} {...props} />)
      await userEvent.click(screen.getByRole('button', { name: /expand/i }))
      const panel = screen.getByTestId('fixture-panel')
      const dragIdEls = Array.from(panel.querySelectorAll('[data-drag-id]')) as HTMLElement[]
      stubRect(dragIdEls[0], 0, 100)
      stubRect(dragIdEls[1], 100, 100)
      return { panel, dragIdEls }
    }

    it('calls onReorderFixtures with the new order when a member fixture is dragged to a new position', async () => {
      const onReorderFixtures = vi.fn()
      const { panel } = await renderExpanded({ onReorderFixtures })

      fireDragOver(panel, 150)
      fireEvent.drop(panel, { preventDefault: () => {}, dataTransfer: { getData: () => 'f1' } })

      expect(onReorderFixtures).toHaveBeenCalledWith(['f2', 'f1'])
    })

    it('calls onDropFixture with a position when a fixture from outside the group is dropped at a specific spot', async () => {
      const onDropFixture = vi.fn()
      const { panel } = await renderExpanded({ onDropFixture })

      fireDragOver(panel, 20)
      fireEvent.drop(panel, { preventDefault: () => {}, dataTransfer: { getData: () => 'external-fixture' } })

      expect(onDropFixture).toHaveBeenCalledWith('external-fixture', 0)
    })

    it('shows an insertion line at the computed position for a fixture dragged in from outside the group', async () => {
      const { panel } = await renderExpanded()

      fireDragOver(panel, 20)

      expect(panel.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    })

    it('does not reorder or add a fixture when dropped without ever dragging over the panel', async () => {
      const onReorderFixtures = vi.fn()
      const onDropFixture = vi.fn()
      const { panel } = await renderExpanded({ onReorderFixtures, onDropFixture })

      fireEvent.drop(panel, { preventDefault: () => {}, dataTransfer: { getData: () => 'f1' } })

      expect(onReorderFixtures).not.toHaveBeenCalled()
      expect(onDropFixture).not.toHaveBeenCalled()
    })
  })

  it('shows a GROUP label above the group name', () => {
    render(<GroupCard {...defaultProps} />)
    expect(screen.getByText('GROUP')).toBeInTheDocument()
  })

  it('renders its gear/expand controls inside a shared FaderFooter', () => {
    render(<GroupCard {...defaultProps} />)
    const footer = screen.getByTestId('fader-footer')
    expect(footer).toContainElement(screen.getByRole('button', { name: /edit group/i }))
    expect(footer).toContainElement(screen.getByRole('button', { name: /expand/i }))
  })
})
