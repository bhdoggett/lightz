import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScenesStrip } from './ScenesStrip'
import type { Scene } from '../../shared/types'

const scenes: Scene[] = [
  { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1000, values: {} },
  { id: 'full-bright', name: 'Full Bright', fadeDuration: 0, values: {} },
]

describe('ScenesStrip', () => {
  it('renders all scene buttons', () => {
    render(<ScenesStrip scenes={scenes} activeSceneId={null} onActivate={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Worship Mode')).toBeInTheDocument()
    expect(screen.getByText('Full Bright')).toBeInTheDocument()
  })

  it('highlights the active scene', () => {
    render(<ScenesStrip scenes={scenes} activeSceneId="worship-mode" onActivate={vi.fn()} onSave={vi.fn()} />)
    const btn = screen.getByText('Worship Mode').closest('button')
    expect(btn).toHaveStyle({ fontWeight: '700' })
  })

  it('calls onActivate when a scene is clicked', async () => {
    const onActivate = vi.fn()
    render(<ScenesStrip scenes={scenes} activeSceneId={null} onActivate={onActivate} onSave={vi.fn()} />)
    await userEvent.click(screen.getByText('Worship Mode'))
    expect(onActivate).toHaveBeenCalledWith('worship-mode')
  })

  it('renders save scene button', () => {
    render(<ScenesStrip scenes={scenes} activeSceneId={null} onActivate={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText(/save scene/i)).toBeInTheDocument()
  })
})
