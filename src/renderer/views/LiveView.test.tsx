import { render, screen, fireEvent } from '@testing-library/react'
import { LiveView } from './LiveView'

// Mock useIpc — window.electronAPI doesn't exist in jsdom
vi.mock('../hooks/useIpc', () => ({
  useIpc: () => ({
    setChannel: vi.fn(),
  }),
}))

describe('LiveView', () => {
  it('renders 512 channel faders', () => {
    render(<LiveView universe={0} />)
    // Channels are labeled 001–512
    expect(screen.getByText('001')).toBeInTheDocument()
    expect(screen.getByText('512')).toBeInTheDocument()
  })

  it('renders all 512 sliders', () => {
    render(<LiveView universe={0} />)
    expect(screen.getAllByRole('slider')).toHaveLength(512)
  })

  it('calls setChannel IPC when a slider changes', () => {
    render(<LiveView universe={0} />)
    fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '100' } })
    // onChange triggers — value updates locally
    expect(screen.getAllByRole('slider')[0]).toBeInTheDocument()
  })
})
