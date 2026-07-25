import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScenesStrip } from './ScenesStrip'
import type { Scene, Group } from '../../../shared/types'

const scenes: Scene[] = [
  { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1000, values: {} },
  { id: 'full-bright', name: 'Full Bright', fadeDuration: 0, values: {} },
]

const defaultProps = {
  scenes,
  activeSceneId: null as string | null,
  groups: [] as Group[],
  currentGroupStates: {} as Record<string, { fader: number }>,
  companionPort: 5551,
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

  it('opens save dialog when saveTrigger is set', () => {
    render(<ScenesStrip {...defaultProps} saveTrigger={1} />)
    expect(screen.getByPlaceholderText('Scene name')).toBeInTheDocument()
  })

  it('opens edit dialog with pre-filled values when editTrigger is set', () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" editTrigger={1} />)
    expect(screen.getByDisplayValue('Worship Mode')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
  })

  it('saves immediately without a warning when the rename does not change the id', async () => {
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onUpdate={onUpdate} editTrigger={1} />)
    fireEvent.change(screen.getByDisplayValue('Worship Mode'), { target: { value: 'WORSHIP MODE' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onUpdate).toHaveBeenCalledWith('worship-mode', 'WORSHIP MODE', 1000, {})
    expect(screen.queryByText(/Companion Endpoint/i)).not.toBeInTheDocument()
  })

  it('shows a rename warning instead of saving when the rename would change the id', async () => {
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onUpdate={onUpdate} editTrigger={1} />)
    fireEvent.change(screen.getByDisplayValue('Worship Mode'), { target: { value: 'New Name' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('⚠ Companion Endpoint Will Change')).toBeInTheDocument()
    expect(screen.getByText('POST http://localhost:5551/scenes/worship-mode/activate')).toBeInTheDocument()
    expect(screen.getByText('POST http://localhost:5551/scenes/new-name/activate')).toBeInTheDocument()
  })

  it('calls onUpdate with the pending rename when Accept is clicked', async () => {
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onUpdate={onUpdate} editTrigger={1} />)
    fireEvent.change(screen.getByDisplayValue('Worship Mode'), { target: { value: 'New Name' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^accept$/i }))
    expect(onUpdate).toHaveBeenCalledWith('worship-mode', 'New Name', 1000, {})
  })

  it('does not call onUpdate and keeps the edit dialog open when the rename warning is cancelled', async () => {
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onUpdate={onUpdate} editTrigger={1} />)
    fireEvent.change(screen.getByDisplayValue('Worship Mode'), { target: { value: 'New Name' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    const cancelButtons = screen.getAllByRole('button', { name: /^cancel$/i })
    await userEvent.click(cancelButtons[cancelButtons.length - 1])
    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue('New Name')).toBeInTheDocument()
  })

  it('calls onDelete when Delete clicked in edit dialog', async () => {
    const onDelete = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onDelete={onDelete} editTrigger={1} />)
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(onDelete).toHaveBeenCalledWith('worship-mode')
  })

  it('closes edit dialog without changes when Cancel clicked', async () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" editTrigger={1} />)
    expect(screen.getByDisplayValue('Worship Mode')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByDisplayValue('Worship Mode')).not.toBeInTheDocument()
  })

  it('shows an error and disables Save when the name is already taken', async () => {
    render(<ScenesStrip {...defaultProps} saveTrigger={1} />)
    fireEvent.change(screen.getByPlaceholderText('Scene name'), { target: { value: 'Worship Mode' } })
    expect(screen.getByText('A scene with this name already exists')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('flags a name as taken when it collides on slug with another scene', () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="full-bright" editTrigger={1} />)
    fireEvent.change(screen.getByDisplayValue('Full Bright'), { target: { value: 'Worship Mode' } })
    expect(screen.getByText('A scene with this name already exists')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('does not treat a scene’s own current name as taken while editing it', () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" editTrigger={1} />)
    expect(screen.queryByText('A scene with this name already exists')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled()
  })

  it('does not block editing a legacy scene whose name collides with another scene created under the old suffix-id logic', async () => {
    // Simulates a show saved before unique names were enforced, where two
    // scenes share the same `name`, disambiguated only by a suffixed id.
    const legacyScenes: Scene[] = [
      { id: 'bright', name: 'Bright', fadeDuration: 0, values: {} },
      { id: 'bright-2', name: 'Bright', fadeDuration: 500, values: {} },
    ]
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} scenes={legacyScenes} activeSceneId="bright-2" onUpdate={onUpdate} editTrigger={1} />)
    expect(screen.queryByText('A scene with this name already exists')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onUpdate).toHaveBeenCalledWith('bright-2', 'Bright', 500, {})
    expect(screen.queryByText(/Companion Endpoint/i)).not.toBeInTheDocument()
  })
})

const groups: Group[] = [
  { id: 'g1', name: 'Stage Left', color: '#6366f1', fixtureIds: [] },
  { id: 'g2', name: 'Stage Right', color: '#22c55e', fixtureIds: [] },
]

const currentGroupStates = {
  g1: { fader: 75 },
  g2: { fader: 100 },
}

describe('ScenesStrip group buttons', () => {
  it('shows group buttons in save dialog', () => {
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} saveTrigger={1} />)
    expect(screen.getByText('Include Group Settings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Stage Left/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Stage Right/i })).toBeInTheDocument()
  })

  it('group buttons default to not pressed', () => {
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} saveTrigger={1} />)
    expect(screen.getByRole('button', { name: /Stage Left/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Stage Right/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSave with groupStates for selected groups only', async () => {
    const onSave = vi.fn()
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} onSave={onSave} saveTrigger={1} />)
    fireEvent.change(screen.getByPlaceholderText('Scene name'), { target: { value: 'My Scene' } })
    await userEvent.click(screen.getByRole('button', { name: /Stage Left/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith('My Scene', 0, { g1: { fader: 75 } })
  })

  it('calls onSave with empty groupStates when no groups selected', async () => {
    const onSave = vi.fn()
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} onSave={onSave} saveTrigger={1} />)
    fireEvent.change(screen.getByPlaceholderText('Scene name'), { target: { value: 'My Scene' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith('My Scene', 0, {})
  })

  it('pre-selects groups already in scene when editing', () => {
    const sceneWithGroups: Scene = {
      ...scenes[0],
      groupStates: { g1: { fader: 75 } },
    }
    render(
      <ScenesStrip
        {...defaultProps}
        groups={groups}
        currentGroupStates={currentGroupStates}
        scenes={[sceneWithGroups, scenes[1]]}
        activeSceneId={sceneWithGroups.id}
        editTrigger={1}
      />
    )
    expect(screen.getByRole('button', { name: /Stage Left/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Stage Right/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onUpdate with groupStates for selected groups', async () => {
    const onUpdate = vi.fn()
    const sceneWithGroups: Scene = {
      ...scenes[0],
      groupStates: { g1: { fader: 75 } },
    }
    render(
      <ScenesStrip
        {...defaultProps}
        groups={groups}
        currentGroupStates={currentGroupStates}
        scenes={[sceneWithGroups, scenes[1]]}
        activeSceneId={sceneWithGroups.id}
        onUpdate={onUpdate}
        editTrigger={1}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onUpdate).toHaveBeenCalledWith(sceneWithGroups.id, 'Worship Mode', 1000, { g1: { fader: 75 } })
  })

  it('hides group section when no groups exist', () => {
    render(<ScenesStrip {...defaultProps} groups={[]} currentGroupStates={{}} saveTrigger={1} />)
    expect(screen.queryByText('Groups')).not.toBeInTheDocument()
  })
})
