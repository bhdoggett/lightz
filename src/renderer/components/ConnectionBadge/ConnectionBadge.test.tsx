import { render, screen } from '@testing-library/react'
import { ConnectionBadge } from './ConnectionBadge'

describe('ConnectionBadge', () => {
  it('shows connected state', () => {
    render(<ConnectionBadge status="connected" />)
    expect(screen.getByText(/connected/i)).toBeInTheDocument()
  })

  it('shows disconnected state', () => {
    render(<ConnectionBadge status="disconnected" />)
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(<ConnectionBadge status="error" />)
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
