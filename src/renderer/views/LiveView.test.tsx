import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiveView } from './LiveView'

const mockSetChannel = vi.fn()
const mockGetChannel = vi.fn().mockReturnValue(0)

vi.mock('../api/context', () => ({
  useApi: () => ({
    setChannel: mockSetChannel,
  }),
}))

const defaultProps = {
  fixtures: [],
  getChannel: mockGetChannel,
  setChannel: vi.fn(),
  onRename: vi.fn(),
}

describe('LiveView', () => {
  beforeEach(() => {
    mockSetChannel.mockClear()
    mockGetChannel.mockClear()
    mockGetChannel.mockReturnValue(0)
  })

  it('renders 512 channel faders for each of the two universes', () => {
    render(<LiveView {...defaultProps} />)
    expect(screen.getByText('1-001')).toBeInTheDocument()
    expect(screen.getByText('1-512')).toBeInTheDocument()
    expect(screen.getByText('2-001')).toBeInTheDocument()
    expect(screen.getByText('2-512')).toBeInTheDocument()
  })

  it('renders 1024 sliders across both universes', () => {
    render(<LiveView {...defaultProps} />)
    expect(screen.getAllByRole('slider')).toHaveLength(1024)
  })

  it('calls setChannel IPC when a slider changes', () => {
    render(<LiveView {...defaultProps} />)
    fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '100' } })
    expect(mockSetChannel).toHaveBeenCalledWith({ universe: 0, channel: 1, value: 100 })
  })

  it('sends a universe 2 slider change with universe 1', () => {
    const setChannelProp = vi.fn()
    render(<LiveView {...defaultProps} setChannel={setChannelProp} />)
    fireEvent.change(screen.getAllByRole('slider')[512], { target: { value: '42' } })
    expect(setChannelProp).toHaveBeenCalledWith(1, 1, 42)
    expect(mockSetChannel).toHaveBeenCalledWith({ universe: 1, channel: 1, value: 42 })
  })

  it('collapses a universe when its header is clicked', async () => {
    render(<LiveView {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: /universe 1/i }))
    expect(screen.queryByText('1-001')).not.toBeInTheDocument()
    expect(screen.getAllByRole('slider')).toHaveLength(512)
  })

  it('shows fixture label for a labeled channel', () => {
    const fixtures = [{ id: 'f1', name: 'Front Wash', channel: 3, universe: 0 as const, type: 'dimmer' as const }]
    render(<LiveView {...defaultProps} fixtures={fixtures} />)
    expect(screen.getByText('Front Wash')).toBeInTheDocument()
  })
})
