// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FaderFooter } from './FaderFooter'

describe('FaderFooter', () => {
  it('renders the footer with a divider', () => {
    render(<FaderFooter variant="filler" />)
    expect(screen.getByTestId('fader-footer')).toBeInTheDocument()
  })

  it('filler variant renders an inert block with no interactive controls', () => {
    render(<FaderFooter variant="filler" />)
    expect(screen.getByTestId('fader-footer-filler')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('controls variant renders the passed children instead of the filler block', () => {
    render(
      <FaderFooter variant="controls">
        <button>Edit</button>
      </FaderFooter>
    )
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByTestId('fader-footer-filler')).not.toBeInTheDocument()
  })
})
