import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupCard } from './GroupCard'
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

    it('does not call onFull when the full button is clicked while editing', async () => {
      const onFull = vi.fn()
      render(<GroupCard {...defaultProps} onFull={onFull} isEditing onSelect={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /full/i }))
      expect(onFull).not.toHaveBeenCalled()
    })

    it('renders an Unpack button instead of Expand while editing', () => {
      render(<GroupCard {...defaultProps} isEditing onSelect={vi.fn()} onUnpack={vi.fn()} />)
      expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /unpack/i })).toBeInTheDocument()
    })

    it('calls onUnpack when Unpack is clicked, without also calling onSelect', async () => {
      const onUnpack = vi.fn()
      const onSelect = vi.fn()
      render(<GroupCard {...defaultProps} isEditing onSelect={onSelect} onUnpack={onUnpack} />)
      await userEvent.click(screen.getByRole('button', { name: /unpack/i }))
      expect(onUnpack).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('renders the selected class on the master panel when selected', () => {
      render(<GroupCard {...defaultProps} isEditing selected />)
      expect(screen.getByTestId('group-drop-target').className).toMatch(/selected/)
    })

    it('does not render drag handle, overlay, or Unpack when isEditing is false', () => {
      render(<GroupCard {...defaultProps} />)
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
      expect(screen.queryByTestId('select-overlay')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /unpack/i })).not.toBeInTheDocument()
    })
  })
})
