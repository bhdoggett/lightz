import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FaderCard } from './FaderCard'

describe('FaderCard', () => {
  it('renders children', () => {
    render(<FaderCard variant="none"><span>content</span></FaderCard>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('applies a box border for variant="bordered"', () => {
    render(<FaderCard variant="bordered" data-testid="card">x</FaderCard>)
    expect(screen.getByTestId('card').className).toMatch(/bordered/)
  })

  it('applies only a left divider for variant="divider"', () => {
    render(<FaderCard variant="divider" data-testid="card">x</FaderCard>)
    const el = screen.getByTestId('card')
    expect(el.className).toMatch(/divider/)
    expect(el.className).not.toMatch(/bordered/)
  })

  it('applies neither border nor divider for variant="none"', () => {
    render(<FaderCard variant="none" data-testid="card">x</FaderCard>)
    const el = screen.getByTestId('card')
    expect(el.className).not.toMatch(/bordered/)
    expect(el.className).not.toMatch(/divider/)
  })

  it('sets the accent color as a CSS custom property and adds the thicker bottom edge, only when bordered', () => {
    render(<FaderCard variant="bordered" accentColor="#ff0000" data-testid="card">x</FaderCard>)
    const el = screen.getByTestId('card')
    expect(el.className).toMatch(/accentBottom/)
    expect(el.style.getPropertyValue('--fader-card-accent')).toBe('#ff0000')
  })

  it('does not apply the accent bottom edge for variant="divider" even if accentColor is passed', () => {
    render(<FaderCard variant="divider" accentColor="#ff0000" data-testid="card">x</FaderCard>)
    expect(screen.getByTestId('card').className).not.toMatch(/accentBottom/)
  })

  it('forwards a ref to the underlying div', () => {
    let node: HTMLDivElement | null = null
    render(
      <FaderCard
        variant="none"
        ref={(el) => { node = el }}
        data-testid="card"
      >
        x
      </FaderCard>
    )
    expect(node).toBe(screen.getByTestId('card'))
  })

  it('merges a consumer className alongside its own variant classes', () => {
    render(<FaderCard variant="bordered" className="consumer-class" data-testid="card">x</FaderCard>)
    expect(screen.getByTestId('card').className).toMatch(/consumer-class/)
  })

  it('forwards arbitrary DOM props like onClick and data attributes', () => {
    const onClick = vi.fn()
    render(<FaderCard variant="none" data-testid="card" onClick={onClick}>x</FaderCard>)
    screen.getByTestId('card').click()
    expect(onClick).toHaveBeenCalled()
  })
})
