import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupStrip } from './GroupStrip'
import type { Group, Fixture } from '../../shared/types'

const groups: Group[] = [
  { id: 'g1', name: 'Front Wash', color: '#6366f1', fixtureIds: ['f1'] },
  { id: 'g2', name: 'Back Light', color: '#22c55e', fixtureIds: ['f2'] },
]
const fixtures: Fixture[] = [
  { id: 'f1', name: 'Chandelier', channel: 1, universe: 0, type: 'dimmer' },
  { id: 'f2', name: 'Spot', channel: 2, universe: 0, type: 'dimmer' },
]
const defaultStates = {
  g1: { fader: 100, override: null as 'full' | 'mute' | null },
  g2: { fader: 100, override: null as 'full' | 'mute' | null },
}
const defaultProps = {
  groups,
  fixtures,
  groupStates: defaultStates,
  onStateChange: vi.fn(),
  onSaveGroup: vi.fn(),
  onDeleteGroup: vi.fn(),
}

describe('GroupStrip', () => {
  it('renders all group names', () => {
    render(<GroupStrip {...defaultProps} />)
    expect(screen.getByText('Front Wash')).toBeInTheDocument()
    expect(screen.getByText('Back Light')).toBeInTheDocument()
  })

  it('renders a + Group button', () => {
    render(<GroupStrip {...defaultProps} />)
    expect(screen.getByRole('button', { name: /\+ group/i })).toBeInTheDocument()
  })

  it('opens GroupEditor when + Group clicked', async () => {
    render(<GroupStrip {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: /\+ group/i }))
    expect(screen.getByPlaceholderText(/group name/i)).toBeInTheDocument()
  })

  it('calls onSaveGroup when editor saves', async () => {
    const onSaveGroup = vi.fn()
    render(<GroupStrip {...defaultProps} onSaveGroup={onSaveGroup} />)
    await userEvent.click(screen.getByRole('button', { name: /\+ group/i }))
    await userEvent.type(screen.getByPlaceholderText(/group name/i), 'New Group')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSaveGroup).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Group' }))
  })

  it('calls onStateChange when group fader changes', () => {
    const onStateChange = vi.fn()
    render(<GroupStrip {...defaultProps} onStateChange={onStateChange} />)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '50' } })
    expect(onStateChange).toHaveBeenCalledWith('g1', { fader: 50, override: null })
  })
})
