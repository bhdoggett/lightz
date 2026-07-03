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

  it('forwards isEditing/selected/onSelect/dragHandleProps to RawFader', async () => {
    const onSelect = vi.fn()
    render(
      <FixtureFader
        channel={5}
        name="Chandelier L"
        value={128}
        onChange={vi.fn()}
        isEditing
        selected
        onSelect={onSelect}
        dragHandleProps={{
          draggable: true,
          'data-drag-id': 'f1',
          onMouseDown: vi.fn(),
          onDragStart: vi.fn(),
          onDragEnd: vi.fn(),
        }}
      />
    )
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
    expect(screen.getByTestId('fader-root').className).toMatch(/selected/)
    fireEvent.click(screen.getByTestId('select-overlay'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('renders a filler footer below the fader, matching group/multi fader footers', () => {
    render(<FixtureFader channel={5} name="Chandelier L" value={0} onChange={vi.fn()} />)
    expect(screen.getByTestId('fader-footer-filler')).toBeInTheDocument()
  })
})
