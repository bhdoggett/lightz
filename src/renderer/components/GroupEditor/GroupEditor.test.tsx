import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupEditor } from './GroupEditor'
import type { Group, Fixture } from '../../shared/types'

const fixtures: Fixture[] = [
  { id: 'f1', name: 'Front Wash', channel: 1, universe: 0, type: 'dimmer' },
  { id: 'f2', name: 'Back Light', channel: 2, universe: 0, type: 'dimmer' },
  { id: 'f3', name: 'Spot', channel: 3, universe: 0, type: 'dimmer' },
]

const existingGroup: Group = { id: 'g1', name: 'Front', color: '#6366f1', fixtureIds: ['f1'] }
const otherGroup: Group = { id: 'g2', name: 'Back', color: '#22c55e', fixtureIds: ['f2'] }

const defaultProps = {
  groups: [existingGroup, otherGroup],
  fixtures,
  editing: null as Group | null,
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onCancel: vi.fn(),
}

describe('GroupEditor', () => {
  it('shows empty name field when creating new group', () => {
    render(<GroupEditor {...defaultProps} editing={null} />)
    expect(screen.getByPlaceholderText(/group name/i)).toHaveValue('')
  })

  it('pre-fills name when editing existing group', () => {
    render(<GroupEditor {...defaultProps} editing={existingGroup} />)
    expect(screen.getByDisplayValue('Front')).toBeInTheDocument()
  })

  it('renders fixture checkboxes', () => {
    render(<GroupEditor {...defaultProps} editing={null} />)
    expect(screen.getByLabelText('Front Wash')).toBeInTheDocument()
    expect(screen.getByLabelText('Back Light')).toBeInTheDocument()
    expect(screen.getByLabelText('Spot')).toBeInTheDocument()
  })

  it('pre-checks fixtures belonging to editing group', () => {
    render(<GroupEditor {...defaultProps} editing={existingGroup} />)
    expect(screen.getByLabelText('Front Wash')).toBeChecked()
    expect(screen.getByLabelText('Back Light')).not.toBeChecked()
  })

  it('disables fixtures belonging to other groups', () => {
    render(<GroupEditor {...defaultProps} editing={existingGroup} />)
    expect(screen.getByLabelText('Back Light')).toBeDisabled()
  })

  it('calls onSave with correct group data when Save clicked', async () => {
    const onSave = vi.fn()
    render(<GroupEditor {...defaultProps} editing={null} onSave={onSave} />)
    await userEvent.type(screen.getByPlaceholderText(/group name/i), 'New Group')
    await userEvent.click(screen.getByLabelText('Spot'))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Group',
      fixtureIds: ['f3'],
    }))
  })

  it('shows Delete button when editing existing group', () => {
    render(<GroupEditor {...defaultProps} editing={existingGroup} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('does not show Delete button when creating', () => {
    render(<GroupEditor {...defaultProps} editing={null} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('calls onDelete when Delete clicked', async () => {
    const onDelete = vi.fn()
    render(<GroupEditor {...defaultProps} editing={existingGroup} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('g1')
  })

  it('calls onCancel when Cancel clicked', async () => {
    const onCancel = vi.fn()
    render(<GroupEditor {...defaultProps} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})
