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
  currentGroupStates: {} as Record<string, { fader: number; override: 'full' | 'mute' | null }>,
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

  it('calls onUpdate when Update clicked in edit dialog', async () => {
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onUpdate={onUpdate} editTrigger={1} />)
    fireEvent.change(screen.getByDisplayValue('Worship Mode'), { target: { value: 'New Name' } })
    await userEvent.click(screen.getByRole('button', { name: /^update$/i }))
    expect(onUpdate).toHaveBeenCalledWith('worship-mode', 'New Name', 1000, {})
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
})

const groups: Group[] = [
  { id: 'g1', name: 'Stage Left', color: '#6366f1', fixtureIds: [] },
  { id: 'g2', name: 'Stage Right', color: '#22c55e', fixtureIds: [] },
]

const currentGroupStates = {
  g1: { fader: 75, override: null as null },
  g2: { fader: 100, override: 'mute' as const },
}

describe('ScenesStrip group checkboxes', () => {
  it('shows group checkboxes in save dialog', () => {
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} saveTrigger={1} />)
    expect(screen.getByText('Include group settings?')).toBeInTheDocument()
    expect(screen.getByLabelText('Stage Left')).toBeInTheDocument()
    expect(screen.getByLabelText('Stage Right')).toBeInTheDocument()
  })

  it('group checkboxes default to unchecked', () => {
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} saveTrigger={1} />)
    expect(screen.getByLabelText('Stage Left')).not.toBeChecked()
    expect(screen.getByLabelText('Stage Right')).not.toBeChecked()
  })

  it('calls onSave with groupStates for checked groups only', async () => {
    const onSave = vi.fn()
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} onSave={onSave} saveTrigger={1} />)
    fireEvent.change(screen.getByPlaceholderText('Scene name'), { target: { value: 'My Scene' } })
    await userEvent.click(screen.getByLabelText('Stage Left'))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith('My Scene', 0, { g1: { fader: 75, override: null } })
  })

  it('calls onSave with empty groupStates when no groups checked', async () => {
    const onSave = vi.fn()
    render(<ScenesStrip {...defaultProps} groups={groups} currentGroupStates={currentGroupStates} onSave={onSave} saveTrigger={1} />)
    fireEvent.change(screen.getByPlaceholderText('Scene name'), { target: { value: 'My Scene' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith('My Scene', 0, {})
  })

  it('pre-checks groups already in scene when editing', () => {
    const sceneWithGroups: Scene = {
      ...scenes[0],
      groupStates: { g1: { fader: 75, override: null } },
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
    expect(screen.getByLabelText('Stage Left')).toBeChecked()
    expect(screen.getByLabelText('Stage Right')).not.toBeChecked()
  })

  it('calls onUpdate with groupStates for checked groups', async () => {
    const onUpdate = vi.fn()
    const sceneWithGroups: Scene = {
      ...scenes[0],
      groupStates: { g1: { fader: 75, override: null } },
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
    await userEvent.click(screen.getByRole('button', { name: /^update$/i }))
    expect(onUpdate).toHaveBeenCalledWith(sceneWithGroups.id, 'Worship Mode', 1000, { g1: { fader: 75, override: null } })
  })

  it('hides group section when no groups exist', () => {
    render(<ScenesStrip {...defaultProps} groups={[]} currentGroupStates={{}} saveTrigger={1} />)
    expect(screen.queryByText('Include group settings?')).not.toBeInTheDocument()
  })
})
