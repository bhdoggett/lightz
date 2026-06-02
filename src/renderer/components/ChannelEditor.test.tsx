import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChannelEditor } from './ChannelEditor'
import type { Fixture } from '../../shared/types'

const fixture: Fixture = { id: 'f1', name: 'Chandelier L', channel: 1, universe: 0, type: 'dimmer' }

describe('ChannelEditor', () => {
  it('shows placeholder when no channel selected', () => {
    render(<ChannelEditor channel={null} fixture={null} onSave={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/select a channel/i)).toBeInTheDocument()
  })

  it('shows channel number when selected', () => {
    render(<ChannelEditor channel={5} fixture={null} onSave={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/channel 5/i)).toBeInTheDocument()
  })

  it('prepopulates name from existing fixture', () => {
    render(<ChannelEditor channel={1} fixture={fixture} onSave={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByDisplayValue('Chandelier L')).toBeInTheDocument()
  })

  it('calls onSave with fixture data when Save clicked', async () => {
    const onSave = vi.fn()
    render(<ChannelEditor channel={1} fixture={null} onSave={onSave} onDelete={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/fixture name/i), 'New Light')
    await userEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Light', channel: 1 }))
  })
})
