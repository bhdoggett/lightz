import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RawFader } from './RawFader'

describe('RawFader', () => {
  it('shows the current value', () => {
    render(<RawFader channel={1} value={200} onChange={vi.fn()} />)
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('shows the channel number', () => {
    render(<RawFader channel={42} value={0} onChange={vi.fn()} />)
    expect(screen.getByText('042')).toBeInTheDocument()
  })

  it('shows optional label when provided', () => {
    render(<RawFader channel={1} value={0} label="Front Wash" onChange={vi.fn()} />)
    expect(screen.getByText('Front Wash')).toBeInTheDocument()
  })

  it('does not show label element when label is omitted', () => {
    render(<RawFader channel={1} value={0} onChange={vi.fn()} />)
    expect(screen.queryByTestId('raw-fader-label')).not.toBeInTheDocument()
  })

  it('calls onChange when slider moves', () => {
    const onChange = vi.fn()
    render(<RawFader channel={1} value={0} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '128' } })
    expect(onChange).toHaveBeenCalledWith(128)
  })

  it('calls onChange(255) when circle button clicked', async () => {
    const onChange = vi.fn()
    render(<RawFader channel={1} value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /max/i }))
    expect(onChange).toHaveBeenCalledWith(255)
  })

  it('calls onChange(0) when X button clicked', async () => {
    const onChange = vi.fn()
    render(<RawFader channel={1} value={200} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /off/i }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('does not show rename input without onRename prop', () => {
    render(<RawFader channel={1} value={0} onChange={vi.fn()} />)
    expect(screen.queryByTestId('rename-input')).not.toBeInTheDocument()
  })

  it('shows rename input when channel area clicked with onRename provided', async () => {
    render(<RawFader channel={1} value={0} onChange={vi.fn()} onRename={vi.fn()} />)
    await userEvent.click(screen.getByText('001'))
    expect(screen.getByTestId('rename-input')).toBeInTheDocument()
  })

  it('calls onRename with new name on Enter', async () => {
    const onRename = vi.fn()
    render(<RawFader channel={1} value={0} label="Old Name" onChange={vi.fn()} onRename={onRename} />)
    await userEvent.click(screen.getByText('Old Name'))
    const input = screen.getByTestId('rename-input')
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('New Name')
  })

  it('calls onRename on blur', async () => {
    const onRename = vi.fn()
    render(<RawFader channel={5} value={0} onChange={vi.fn()} onRename={onRename} />)
    await userEvent.click(screen.getByText('005'))
    const input = screen.getByTestId('rename-input')
    fireEvent.change(input, { target: { value: 'Spotlight' } })
    fireEvent.blur(input)
    expect(onRename).toHaveBeenCalledWith('Spotlight')
  })
})
