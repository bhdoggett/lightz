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

  it('calls onChange(255) when toggle clicked while off', async () => {
    const onChange = vi.fn()
    render(<RawFader channel={1} value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }))
    expect(onChange).toHaveBeenCalledWith(255)
  })

  it('calls onChange(0) when toggle clicked while on', async () => {
    const onChange = vi.fn()
    render(<RawFader channel={1} value={200} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('toggle has aria-pressed=false when value is 0', () => {
    render(<RawFader channel={1} value={0} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /toggle/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggle has aria-pressed=true when value is above 0', () => {
    render(<RawFader channel={1} value={128} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /toggle/i })).toHaveAttribute('aria-pressed', 'true')
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

  it('calls onRename with empty string when name is cleared', async () => {
    const onRename = vi.fn()
    render(<RawFader channel={1} value={0} label="Old Name" onChange={vi.fn()} onRename={onRename} />)
    await userEvent.click(screen.getByText('Old Name'))
    const input = screen.getByTestId('rename-input')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('')
  })

  describe('value editing', () => {
    it('shows value input when value display is clicked', async () => {
      render(<RawFader channel={1} value={128} onChange={vi.fn()} />)
      await userEvent.click(screen.getByTestId('value-display'))
      expect(screen.getByTestId('value-input')).toBeInTheDocument()
    })

    it('calls onChange with typed value on Enter', async () => {
      const onChange = vi.fn()
      render(<RawFader channel={1} value={100} onChange={onChange} />)
      await userEvent.click(screen.getByTestId('value-display'))
      const input = screen.getByTestId('value-input')
      fireEvent.change(input, { target: { value: '200' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onChange).toHaveBeenCalledWith(200)
    })

    it('calls onChange with typed value on blur', async () => {
      const onChange = vi.fn()
      render(<RawFader channel={1} value={100} onChange={onChange} />)
      await userEvent.click(screen.getByTestId('value-display'))
      const input = screen.getByTestId('value-input')
      fireEvent.change(input, { target: { value: '50' } })
      fireEvent.blur(input)
      expect(onChange).toHaveBeenCalledWith(50)
    })

    it('clamps value to 255 max', async () => {
      const onChange = vi.fn()
      render(<RawFader channel={1} value={100} onChange={onChange} />)
      await userEvent.click(screen.getByTestId('value-display'))
      const input = screen.getByTestId('value-input')
      fireEvent.change(input, { target: { value: '999' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onChange).toHaveBeenCalledWith(255)
    })

    it('sets value to 0 when input is fully cleared (backspace all)', async () => {
      const onChange = vi.fn()
      render(<RawFader channel={1} value={128} onChange={onChange} />)
      await userEvent.click(screen.getByTestId('value-display'))
      const input = screen.getByTestId('value-input')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onChange).toHaveBeenCalledWith(0)
    })

    it('cancels editing on Escape without changing value', async () => {
      const onChange = vi.fn()
      render(<RawFader channel={1} value={128} onChange={onChange} />)
      await userEvent.click(screen.getByTestId('value-display'))
      const input = screen.getByTestId('value-input')
      fireEvent.change(input, { target: { value: '50' } })
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByTestId('value-display')).toBeInTheDocument()
    })

  })

  const dragHandleProps = {
    draggable: true as const,
    'data-drag-id': 'f1',
    onMouseDown: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
  }

  describe('edit mode', () => {
    it('renders a drag handle instead of the editable value display when isEditing', () => {
      render(<RawFader channel={1} value={128} onChange={vi.fn()} isEditing dragHandleProps={dragHandleProps} />)
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
      expect(screen.queryByTestId('value-display')).not.toBeInTheDocument()
    })

    it('renders a drag handle whenever dragHandleProps is provided, even without isEditing', () => {
      render(<RawFader channel={1} value={128} onChange={vi.fn()} dragHandleProps={dragHandleProps} />)
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
    })

    it('does not block the slider, toggle, or rename when dragHandleProps is provided without isEditing', async () => {
      const onChange = vi.fn()
      const onRename = vi.fn()
      render(
        <RawFader
          channel={1}
          value={0}
          label="Old Name"
          onChange={onChange}
          onRename={onRename}
          dragHandleProps={dragHandleProps}
        />
      )
      expect(screen.queryByTestId('select-overlay')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /toggle/i }))
      expect(onChange).toHaveBeenCalledWith(255)
      await userEvent.click(screen.getByText('Old Name'))
      expect(screen.getByTestId('rename-input')).toBeInTheDocument()
    })

    it('does not render drag handle or select overlay when isEditing is false', () => {
      render(<RawFader channel={1} value={0} onChange={vi.fn()} />)
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
      expect(screen.queryByTestId('select-overlay')).not.toBeInTheDocument()
    })

    it('calls onSelect when the select overlay is clicked', async () => {
      const onSelect = vi.fn()
      render(<RawFader channel={1} value={0} onChange={vi.fn()} isEditing onSelect={onSelect} />)
      await userEvent.click(screen.getByTestId('select-overlay'))
      expect(onSelect).toHaveBeenCalled()
    })

    it('calls onSelect when clicking the toggle button area (bubbles to root)', async () => {
      const onSelect = vi.fn()
      render(<RawFader channel={1} value={0} onChange={vi.fn()} isEditing onSelect={onSelect} />)
      await userEvent.click(screen.getByRole('button', { name: /toggle/i }))
      expect(onSelect).toHaveBeenCalled()
    })

    it('does not call onChange when the toggle button is clicked while editing', async () => {
      const onChange = vi.fn()
      render(<RawFader channel={1} value={0} onChange={onChange} isEditing onSelect={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /toggle/i }))
      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not call onSelect when clicking the drag handle itself', async () => {
      const onSelect = vi.fn()
      render(<RawFader channel={1} value={0} onChange={vi.fn()} isEditing onSelect={onSelect} dragHandleProps={dragHandleProps} />)
      await userEvent.click(screen.getByTestId('drag-handle'))
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('does not open the rename input when the name area is clicked while editing', async () => {
      render(<RawFader channel={1} value={0} label="Old Name" onChange={vi.fn()} onRename={vi.fn()} isEditing onSelect={vi.fn()} />)
      await userEvent.click(screen.getByText('Old Name'))
      expect(screen.queryByTestId('rename-input')).not.toBeInTheDocument()
    })

    it('renders the selected class on the root when selected', () => {
      render(<RawFader channel={1} value={0} onChange={vi.fn()} isEditing selected />)
      expect(screen.getByTestId('fader-root').className).toMatch(/selected/)
    })

    it('spreads dragHandleProps onto the drag handle', () => {
      render(
        <RawFader
          channel={1}
          value={0}
          onChange={vi.fn()}
          isEditing
          dragHandleProps={{
            draggable: true,
            'data-drag-id': 'f1',
            onMouseDown: vi.fn(),
            onDragStart: vi.fn(),
            onDragEnd: vi.fn(),
          }}
        />
      )
      const handle = screen.getByTestId('drag-handle')
      expect(handle).toHaveAttribute('draggable', 'true')
      expect(handle).toHaveAttribute('data-drag-id', 'f1')
    })
  })
})
