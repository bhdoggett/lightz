import { render, screen, fireEvent } from '@testing-library/react'
import { FixtureFader } from './FixtureFader'

describe('FixtureFader', () => {
  it('renders fixture name', () => {
    render(<FixtureFader channel={5} name="Chandelier L" value={128} onChange={vi.fn()} />)
    expect(screen.getByText('Chandelier L')).toBeInTheDocument()
  })

  it('shows current value', () => {
    render(<FixtureFader channel={5} name="Chandelier L" value={200} onChange={vi.fn()} />)
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('shows the channel number', () => {
    render(<FixtureFader channel={12} name="Front Wash" value={0} onChange={vi.fn()} />)
    expect(screen.getByText('012')).toBeInTheDocument()
  })

  it('calls onChange when slider moves', () => {
    const onChange = vi.fn()
    render(<FixtureFader channel={5} name="Chandelier L" value={0} onChange={onChange} />)
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '128' } })
    expect(onChange).toHaveBeenCalledWith(128)
  })

  it('shows group suppression dot when groupColor provided', () => {
    render(<FixtureFader channel={5} name="Spot" value={200} onChange={vi.fn()} groupColor="#ef4444" />)
    expect(screen.getByTestId('group-dot')).toBeInTheDocument()
  })

  it('does not show group dot when groupColor not provided', () => {
    render(<FixtureFader channel={5} name="Spot" value={200} onChange={vi.fn()} />)
    expect(screen.queryByTestId('group-dot')).not.toBeInTheDocument()
  })
})
