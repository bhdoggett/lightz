import { render, screen } from '@testing-library/react'
import { CompanionModal } from './CompanionModal'
import type { Scene } from '../../shared/types'

const scenes: Scene[] = [
  { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1000, values: {} },
]

const defaultProps = {
  scenes,
  port: 3000,
  devicePath: '',
  ports: [],
  dmxOutputPort: 0 as const,
  onPortChange: vi.fn(),
  onDevicePathChange: vi.fn(),
  onDmxOutputPortChange: vi.fn(),
  onClose: vi.fn(),
}

beforeAll(() => {
  Object.defineProperty(window, 'electronAPI', {
    value: { listPorts: vi.fn().mockResolvedValue([]) },
    writable: true,
  })
})

describe('CompanionModal', () => {
  it('shows the companion port', () => {
    render(<CompanionModal {...defaultProps} />)
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument()
  })

  it('shows scene endpoint for each scene', () => {
    render(<CompanionModal {...defaultProps} />)
    expect(screen.getByText(/worship-mode/)).toBeInTheDocument()
  })

  it('shows setup instructions', () => {
    render(<CompanionModal {...defaultProps} />)
    expect(screen.getAllByText(/companion/i).length).toBeGreaterThan(0)
  })

  it('shows device path input', () => {
    render(<CompanionModal {...defaultProps} devicePath="/dev/tty.usbserial-123" />)
    expect(screen.getByDisplayValue('/dev/tty.usbserial-123')).toBeInTheDocument()
  })

  it('renders detected ports as clickable options', async () => {
    vi.mocked(window.electronAPI.listPorts).mockResolvedValue([
      '/dev/cu.usbmodem123',
      '/dev/cu.usbserial-ABC',
    ])
    render(
      <CompanionModal
        {...defaultProps}
        ports={['/dev/cu.usbmodem123', '/dev/cu.usbserial-ABC']}
      />
    )
    await screen.findByText('/dev/cu.usbmodem123')
    expect(screen.getByText('/dev/cu.usbserial-ABC')).toBeInTheDocument()
  })

  it('shows empty message when no ports detected', async () => {
    vi.mocked(window.electronAPI.listPorts).mockResolvedValue([])
    render(<CompanionModal {...defaultProps} ports={[]} />)
    expect(await screen.findByText(/no usb serial devices found/i)).toBeInTheDocument()
  })
})
