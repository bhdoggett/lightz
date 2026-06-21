import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChannelList } from './ChannelList'
import type { Fixture } from '../../shared/types'

const fixtures: Fixture[] = [
  { id: 'f1', name: 'Chandelier L', channel: 1, universe: 0, type: 'dimmer' },
]

describe('ChannelList', () => {
  it('renders channel numbers 1 through 512', () => {
    render(<ChannelList fixtures={fixtures} channelValues={{}} selectedChannel={null} onSelect={vi.fn()} />)
    expect(screen.getByText('001')).toBeInTheDocument()
    expect(screen.getByText('512')).toBeInTheDocument()
  })

  it('shows fixture name for labeled channels', () => {
    render(<ChannelList fixtures={fixtures} channelValues={{}} selectedChannel={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Chandelier L')).toBeInTheDocument()
  })

  it('calls onSelect with channel number when row clicked', async () => {
    const onSelect = vi.fn()
    render(<ChannelList fixtures={fixtures} channelValues={{}} selectedChannel={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('001').closest('div')!)
    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
