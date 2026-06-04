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
  onPortChange: vi.fn(),
  onDevicePathChange: vi.fn(),
  onClose: vi.fn(),
}

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

  it('renders detected ports as clickable options', () => {
    render(
      <CompanionModal
        {...defaultProps}
        ports={['/dev/tty.usbmodem123', '/dev/tty.usbserial-ABC']}
      />
    )
    expect(screen.getByText('/dev/tty.usbmodem123')).toBeInTheDocument()
    expect(screen.getByText('/dev/tty.usbserial-ABC')).toBeInTheDocument()
  })

  it('shows empty message when no ports detected', () => {
    render(<CompanionModal {...defaultProps} ports={[]} />)
    expect(screen.getByText(/no usb serial devices/i)).toBeInTheDocument()
  })
})
