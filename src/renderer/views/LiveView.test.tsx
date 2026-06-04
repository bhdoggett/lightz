import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiveView } from './LiveView'

const mockSetChannel = vi.fn()
const mockGetChannel = vi.fn().mockReturnValue(0)

vi.mock('../hooks/useIpc', () => ({
  useIpc: () => ({
    setChannel: mockSetChannel,
  }),
}))

const defaultProps = {
  universe: 0 as const,
  getChannel: mockGetChannel,
  setChannel: vi.fn(),
}

describe('LiveView', () => {
  beforeEach(() => {
    mockSetChannel.mockClear()
    mockGetChannel.mockClear()
    mockGetChannel.mockReturnValue(0)
  })

  it('renders 512 channel faders', () => {
    render(<LiveView {...defaultProps} />)
    expect(screen.getByText('001')).toBeInTheDocument()
    expect(screen.getByText('512')).toBeInTheDocument()
  })

  it('renders all 512 sliders', () => {
    render(<LiveView {...defaultProps} />)
    expect(screen.getAllByRole('slider')).toHaveLength(512)
  })

  it('calls setChannel IPC when a slider changes', () => {
    render(<LiveView {...defaultProps} />)
    fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '100' } })
    expect(mockSetChannel).toHaveBeenCalledWith({ universe: 0, channel: 1, value: 100 })
  })

  it('renders the All Off button', () => {
    render(<LiveView {...defaultProps} />)
    expect(screen.getByRole('button', { name: /all off/i })).toBeInTheDocument()
  })

  it('calls setChannel(0) for all 512 channels when All Off clicked', async () => {
    const setChannelProp = vi.fn()
    render(<LiveView {...defaultProps} setChannel={setChannelProp} />)
    await userEvent.click(screen.getByRole('button', { name: /all off/i }))
    expect(setChannelProp).toHaveBeenCalledTimes(512)
    expect(setChannelProp).toHaveBeenCalledWith(0, 1, 0)
    expect(setChannelProp).toHaveBeenCalledWith(0, 512, 0)
    expect(mockSetChannel).toHaveBeenCalledTimes(512)
  })
})
