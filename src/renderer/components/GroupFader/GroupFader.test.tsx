import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupFader } from './GroupFader'
import type { Group } from '../../../shared/types'

const group: Group = { id: 'g1', name: 'Front Wash', color: '#6366f1', fixtureIds: [] }

const defaultProps = {
  group,
  fader: 100,
  override: null as 'full' | 'mute' | null,
  onFaderChange: vi.fn(),
  onOverrideChange: vi.fn(),
  onEdit: vi.fn(),
}

describe('GroupFader', () => {
  it('renders group name', () => {
    render(<GroupFader {...defaultProps} />)
    expect(screen.getByText('Front Wash')).toBeInTheDocument()
  })

  it('renders fader slider', () => {
    render(<GroupFader {...defaultProps} fader={75} />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveValue('75')
  })

  it('shows fader value when no override', () => {
    render(<GroupFader {...defaultProps} fader={75} override={null} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows 255 when full override active', () => {
    render(<GroupFader {...defaultProps} fader={75} override="full" />)
    expect(screen.getByText('255')).toBeInTheDocument()
  })

  it('shows 0 when mute override active', () => {
    render(<GroupFader {...defaultProps} fader={75} override="mute" />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('calls onFaderChange when slider moves', () => {
    const onFaderChange = vi.fn()
    render(<GroupFader {...defaultProps} onFaderChange={onFaderChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } })
    expect(onFaderChange).toHaveBeenCalledWith(50)
  })

  it('calls onOverrideChange("full") when full button clicked while no override', async () => {
    const onOverrideChange = vi.fn()
    render(<GroupFader {...defaultProps} override={null} onOverrideChange={onOverrideChange} />)
    await userEvent.click(screen.getByRole('button', { name: /full/i }))
    expect(onOverrideChange).toHaveBeenCalledWith('full')
  })

  it('releases full override when full button clicked while already full', async () => {
    const onOverrideChange = vi.fn()
    render(<GroupFader {...defaultProps} override="full" onOverrideChange={onOverrideChange} />)
    await userEvent.click(screen.getByRole('button', { name: /full/i }))
    expect(onOverrideChange).toHaveBeenCalledWith(null)
  })

  it('calls onOverrideChange("mute") when mute button clicked while no override', async () => {
    const onOverrideChange = vi.fn()
    render(<GroupFader {...defaultProps} override={null} onOverrideChange={onOverrideChange} />)
    await userEvent.click(screen.getByRole('button', { name: /mute/i }))
    expect(onOverrideChange).toHaveBeenCalledWith('mute')
  })

  it('releases mute override when mute button clicked while already muted', async () => {
    const onOverrideChange = vi.fn()
    render(<GroupFader {...defaultProps} override="mute" onOverrideChange={onOverrideChange} />)
    await userEvent.click(screen.getByRole('button', { name: /mute/i }))
    expect(onOverrideChange).toHaveBeenCalledWith(null)
  })

  it('calls onEdit when name clicked', async () => {
    const onEdit = vi.fn()
    render(<GroupFader {...defaultProps} onEdit={onEdit} />)
    await userEvent.click(screen.getByText('Front Wash'))
    expect(onEdit).toHaveBeenCalled()
  })

  it('slider is disabled when override is active', () => {
    render(<GroupFader {...defaultProps} override="full" />)
    expect(screen.getByRole('slider')).toBeDisabled()
  })
})
