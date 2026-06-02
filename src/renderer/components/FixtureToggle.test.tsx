import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FixtureToggle } from './FixtureToggle'

describe('FixtureToggle', () => {
  it('renders fixture name', () => {
    render(<FixtureToggle name="Ceiling" value={0} onChange={vi.fn()} />)
    expect(screen.getByText('Ceiling')).toBeInTheDocument()
  })

  it('calls onChange with 255 when toggled on', async () => {
    const onChange = vi.fn()
    render(<FixtureToggle name="Ceiling" value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(255)
  })

  it('calls onChange with 0 when toggled off', async () => {
    const onChange = vi.fn()
    render(<FixtureToggle name="Ceiling" value={255} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(0)
  })
})
