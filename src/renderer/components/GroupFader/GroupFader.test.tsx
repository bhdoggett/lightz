import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupFader } from './GroupFader'
import type { Group } from '../../../shared/types'

const group: Group = { id: 'g1', name: 'Front Wash', color: '#6366f1', fixtureIds: [] }

const defaultProps = {
  group,
  fader: 100,
  onFaderChange: vi.fn(),
  onFull: vi.fn(),
  onMute: vi.fn(),
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

  it('shows fader percentage value', () => {
    render(<GroupFader {...defaultProps} fader={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('calls onFaderChange when slider moves', () => {
    const onFaderChange = vi.fn()
    render(<GroupFader {...defaultProps} onFaderChange={onFaderChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } })
    expect(onFaderChange).toHaveBeenCalledWith(50)
  })

  it('calls onFull when full button clicked', async () => {
    const onFull = vi.fn()
    render(<GroupFader {...defaultProps} onFull={onFull} />)
    await userEvent.click(screen.getByRole('button', { name: /full/i }))
    expect(onFull).toHaveBeenCalled()
  })

  it('calls onMute when mute button clicked', async () => {
    const onMute = vi.fn()
    render(<GroupFader {...defaultProps} onMute={onMute} />)
    await userEvent.click(screen.getByRole('button', { name: /mute/i }))
    expect(onMute).toHaveBeenCalled()
  })

  it('does not change fader when full button clicked', async () => {
    const onFaderChange = vi.fn()
    render(<GroupFader {...defaultProps} fader={40} onFaderChange={onFaderChange} />)
    await userEvent.click(screen.getByRole('button', { name: /full/i }))
    expect(onFaderChange).not.toHaveBeenCalled()
  })

  it('slider is always enabled', () => {
    render(<GroupFader {...defaultProps} />)
    expect(screen.getByRole('slider')).not.toBeDisabled()
  })

  it('calls onEdit when name clicked', async () => {
    const onEdit = vi.fn()
    render(<GroupFader {...defaultProps} onEdit={onEdit} />)
    await userEvent.click(screen.getByText('Front Wash'))
    expect(onEdit).toHaveBeenCalled()
  })
})
