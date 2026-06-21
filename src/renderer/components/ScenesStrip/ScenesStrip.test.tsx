import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScenesStrip } from './ScenesStrip'
import type { Scene } from '../../../shared/types'

const scenes: Scene[] = [
  { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1000, values: {} },
  { id: 'full-bright', name: 'Full Bright', fadeDuration: 0, values: {} },
]

const defaultProps = {
  scenes,
  activeSceneId: null as string | null,
  onActivate: vi.fn(),
  onSave: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onReorder: vi.fn(),
}

describe('ScenesStrip', () => {
  it('renders all scene buttons', () => {
    render(<ScenesStrip {...defaultProps} />)
    expect(screen.getByText('Worship Mode')).toBeInTheDocument()
    expect(screen.getByText('Full Bright')).toBeInTheDocument()
  })

  it('highlights the active scene', () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" />)
    const btn = screen.getByText('Worship Mode').closest('button')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onActivate when a scene is clicked', async () => {
    const onActivate = vi.fn()
    render(<ScenesStrip {...defaultProps} onActivate={onActivate} />)
    await userEvent.click(screen.getByText('Worship Mode'))
    expect(onActivate).toHaveBeenCalledWith('worship-mode')
  })

  it('renders save scene button', () => {
    render(<ScenesStrip {...defaultProps} />)
    expect(screen.getByText(/save scene/i)).toBeInTheDocument()
  })

  it('does not show Edit button when no scene is active', () => {
    render(<ScenesStrip {...defaultProps} activeSceneId={null} />)
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })

  it('shows Edit button when a scene is active', () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" />)
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })

  it('opens edit dialog with pre-filled values when Edit clicked', async () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" />)
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByDisplayValue('Worship Mode')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
  })

  it('calls onUpdate when Update clicked in edit dialog', async () => {
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onUpdate={onUpdate} />)
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    fireEvent.change(screen.getByDisplayValue('Worship Mode'), { target: { value: 'New Name' } })
    await userEvent.click(screen.getByRole('button', { name: /^update$/i }))
    expect(onUpdate).toHaveBeenCalledWith('worship-mode', 'New Name', 1000)
  })

  it('calls onDelete when Delete clicked in edit dialog', async () => {
    const onDelete = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(onDelete).toHaveBeenCalledWith('worship-mode')
  })

  it('closes edit dialog without changes when Cancel clicked', async () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" />)
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByDisplayValue('Worship Mode')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByDisplayValue('Worship Mode')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })
})
