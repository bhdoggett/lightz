// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the message when provided', () => {
    render(<Toast message="Channel 5 is already taken" onDismiss={vi.fn()} />)
    expect(screen.getByText('Channel 5 is already taken')).toBeInTheDocument()
  })

  it('calls onDismiss after the duration elapses', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Hello" onDismiss={onDismiss} duration={1000} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(onDismiss).toHaveBeenCalled()
  })
})
