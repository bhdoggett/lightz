# Scene Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scene editing (rename + fade), deletion via edit dialog, and drag-to-reorder to the ScenesStrip.

**Architecture:** Two new store functions (`updateScene`, `reorderScenes`) feed two new IPC handlers. `ScenesStrip` gains an Edit button (active scene only) that opens an `EditDialog` pre-filled with current values and containing Update/Delete/Cancel. Drag-and-drop reorder uses HTML5 native drag API with no library.

**Tech Stack:** Electron 28, electron-vite, React 18, TypeScript, CSS Modules, Vitest, React Testing Library, electron-store v8

---

## File Map

```
electron/
  store.ts              MODIFY — add updateScene(), reorderScenes()
  store.test.ts         MODIFY — add tests for both new functions
  ipc.ts                MODIFY — add scene:update, scene:reorder handlers
  preload/index.ts      MODIFY — expose updateScene, reorderScenes
src/
  shared/
    types.ts            MODIFY — add UpdateSceneArgs
    electron-api.d.ts   MODIFY — add updateScene, reorderScenes types
  renderer/
    hooks/useIpc.ts     MODIFY — add updateScene, reorderScenes wrappers
    components/
      ScenesStrip.tsx        MODIFY — EditDialog, Edit button, drag-and-drop
      ScenesStrip.module.css MODIFY — edit/delete/drag styles
      ScenesStrip.test.tsx   MODIFY — update defaultProps, add new tests
    views/
      MainView.tsx      MODIFY — wire onUpdate, onDelete, onReorder
```

---

## Task 1: Store Functions

**Files:**
- Modify: `electron/store.ts`
- Modify: `electron/store.test.ts`

- [ ] **Step 1: Add failing tests for `updateScene` and `reorderScenes`**

Add these two `describe` blocks to `electron/store.test.ts` after the existing `describe('config store', ...)` block:

```typescript
import Store from 'electron-store'

// Helper to get the single mock instance created when store.ts was imported
const inst = () => (Store as any).mock.results[0].value

describe('updateScene', () => {
  it('updates name and fadeDuration in place, preserving values', () => {
    const scenes = [
      { id: 's1', name: 'Old Name', fadeDuration: 0, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    updateScene('s1', 'New Name', 2000)
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 's1', name: 'New Name', fadeDuration: 2000, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ])
  })

  it('does nothing when id not found', () => {
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? [] : def
    )
    inst().set.mockClear()
    updateScene('nonexistent', 'X', 0)
    expect(inst().set).not.toHaveBeenCalled()
  })
})

describe('reorderScenes', () => {
  it('reorders scenes by given id list', () => {
    const scenes = [
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
      { id: 's2', name: 'B', fadeDuration: 0, values: {} },
      { id: 's3', name: 'C', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    reorderScenes(['s3', 's1', 's2'])
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 's3', name: 'C', fadeDuration: 0, values: {} },
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
      { id: 's2', name: 'B', fadeDuration: 0, values: {} },
    ])
  })

  it('drops scenes whose id is not in the list', () => {
    const scenes = [
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
      { id: 's2', name: 'B', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    reorderScenes(['s1'])
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
    ])
  })
})
```

Also add `updateScene, reorderScenes` to the import at the top of `store.test.ts`:

```typescript
import { getConfig, saveFixture, deleteFixture, saveScene, deleteScene, setCompanionPort, updateScene, reorderScenes } from './store'
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/store.test.ts
```

Expected: FAIL — `updateScene is not a function` / `reorderScenes is not a function`

- [ ] **Step 3: Add `updateScene` and `reorderScenes` to `electron/store.ts`**

Add after the `deleteScene` function:

```typescript
export function updateScene(id: string, name: string, fadeDuration: number): void {
  const scenes = store.get('scenes', [])
  const idx = scenes.findIndex((s) => s.id === id)
  if (idx < 0) return
  scenes[idx] = { ...scenes[idx], name, fadeDuration }
  store.set('scenes', scenes)
}

export function reorderScenes(ids: string[]): void {
  const scenes = store.get('scenes', [])
  const ordered = ids.map((id) => scenes.find((s) => s.id === id)).filter(Boolean) as Scene[]
  store.set('scenes', ordered)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run electron/store.test.ts
```

Expected: PASS (all tests including the 4 new ones)

- [ ] **Step 5: Commit**

```bash
git add electron/store.ts electron/store.test.ts
git commit -m "feat: add updateScene and reorderScenes store functions"
```

---

## Task 2: Types, IPC, Preload, Type Declaration

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `electron/ipc.ts`
- Modify: `electron/preload/index.ts`
- Modify: `src/shared/electron-api.d.ts`

- [ ] **Step 1: Add `UpdateSceneArgs` to `src/shared/types.ts`**

Add after `SaveSceneArgs`:

```typescript
export interface UpdateSceneArgs {
  id: string
  name: string
  fadeDuration: number
}
```

- [ ] **Step 2: Add IPC handlers to `electron/ipc.ts`**

Add this import at the top alongside the existing store imports:

```typescript
import { getConfig, saveFixture, deleteFixture, saveScene, deleteScene, setCompanionPort, setDevicePath, setDmxOutputPort, replaceConfig, updateScene, reorderScenes } from './store'
```

Add this type import alongside the existing type imports:

```typescript
import type { Fixture, SaveSceneArgs, SetChannelArgs, UpdateSceneArgs } from '../src/shared/types'
```

Add these two handlers inside `registerIpcHandlers`, after the `scene:delete` handler:

```typescript
  ipcMain.handle('scene:update', (_e, args: UpdateSceneArgs) => {
    updateScene(args.id, args.name, args.fadeDuration)
    return getConfig().scenes.find((s) => s.id === args.id) ?? null
  })

  ipcMain.handle('scene:reorder', (_e, { ids }: { ids: string[] }) => {
    reorderScenes(ids)
  })
```

- [ ] **Step 3: Expose in `electron/preload/index.ts`**

Add before the `exportShow` line:

```typescript
  updateScene: (args: UpdateSceneArgs) => ipcRenderer.invoke('scene:update', args),
  reorderScenes: (ids: string[]) => ipcRenderer.invoke('scene:reorder', { ids }),
```

Add `UpdateSceneArgs` to the import at the top of the preload file:

```typescript
import type { Fixture, SaveSceneArgs, SetChannelArgs, DmxStatus, UpdateSceneArgs } from '../../src/shared/types'
```

- [ ] **Step 4: Add types to `src/shared/electron-api.d.ts`**

Add these two lines to the `Window.electronAPI` interface, before `exportShow`:

```typescript
      updateScene: (args: UpdateSceneArgs) => Promise<Scene | null>
      reorderScenes: (ids: string[]) => Promise<void>
```

Add `UpdateSceneArgs` to the import at the top:

```typescript
import type { Fixture, Config, Scene, SaveSceneArgs, SetChannelArgs, DmxStatus, UpdateSceneArgs } from './types'
```

- [ ] **Step 5: Verify build compiles**

```bash
./node_modules/.bin/electron-vite build 2>&1 | tail -5
```

Expected: `✓ built in ...ms`

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts electron/ipc.ts electron/preload/index.ts src/shared/electron-api.d.ts
git commit -m "feat: add scene:update and scene:reorder IPC handlers"
```

---

## Task 3: useIpc Hook

**Files:**
- Modify: `src/renderer/hooks/useIpc.ts`

- [ ] **Step 1: Add `updateScene` and `reorderScenes` to `src/renderer/hooks/useIpc.ts`**

Read the current file, then add:
- Import `UpdateSceneArgs` to the type imports at the top:

```typescript
import type { Fixture, SaveSceneArgs, SetChannelArgs, UpdateSceneArgs } from '../shared/types'
```

- Add these two lines inside the `useIpc` function return object (after `deleteScene`):

```typescript
  const updateScene = useCallback((args: UpdateSceneArgs) => window.electronAPI.updateScene(args), [])
  const reorderScenes = useCallback((ids: string[]) => window.electronAPI.reorderScenes(ids), [])
```

- Add `updateScene` and `reorderScenes` to the return object.

The full updated `src/renderer/hooks/useIpc.ts`:

```typescript
import { useCallback } from 'react'
import type { Fixture, SaveSceneArgs, SetChannelArgs, UpdateSceneArgs } from '../shared/types'

export function useIpc() {
  const getConfig = useCallback(() => window.electronAPI.getConfig(), [])
  const setChannel = useCallback((args: SetChannelArgs) => window.electronAPI.setChannel(args), [])
  const saveScene = useCallback((args: SaveSceneArgs) => window.electronAPI.saveScene(args), [])
  const loadScene = useCallback((id: string) => window.electronAPI.loadScene(id), [])
  const deleteScene = useCallback((id: string) => window.electronAPI.deleteScene(id), [])
  const updateScene = useCallback((args: UpdateSceneArgs) => window.electronAPI.updateScene(args), [])
  const reorderScenes = useCallback((ids: string[]) => window.electronAPI.reorderScenes(ids), [])
  const updateFixture = useCallback((f: Fixture) => window.electronAPI.updateFixture(f), [])
  const deleteFixture = useCallback((id: string) => window.electronAPI.deleteFixture(id), [])
  const setPort = useCallback((port: number) => window.electronAPI.setPort(port), [])

  return { getConfig, setChannel, saveScene, loadScene, deleteScene, updateScene, reorderScenes, updateFixture, deleteFixture, setPort }
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no tests for useIpc directly, but nothing should break).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/hooks/useIpc.ts
git commit -m "feat: expose updateScene and reorderScenes in useIpc hook"
```

---

## Task 4: ScenesStrip Component

**Files:**
- Modify: `src/renderer/components/ScenesStrip.tsx`
- Modify: `src/renderer/components/ScenesStrip.module.css`
- Modify: `src/renderer/components/ScenesStrip.test.tsx`

- [ ] **Step 1: Add failing tests**

Update `src/renderer/components/ScenesStrip.test.tsx` — replace the full file:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScenesStrip } from './ScenesStrip'
import type { Scene } from '../../shared/types'

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
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows Edit button when a scene is active', () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" />)
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('opens edit dialog with pre-filled values when Edit clicked', async () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByDisplayValue('Worship Mode')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
  })

  it('calls onUpdate when Update clicked in edit dialog', async () => {
    const onUpdate = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onUpdate={onUpdate} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    fireEvent.change(screen.getByDisplayValue('Worship Mode'), { target: { value: 'New Name' } })
    await userEvent.click(screen.getByRole('button', { name: /update/i }))
    expect(onUpdate).toHaveBeenCalledWith('worship-mode', 'New Name', 1000)
  })

  it('calls onDelete when Delete clicked in edit dialog', async () => {
    const onDelete = vi.fn()
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('worship-mode')
  })

  it('closes edit dialog without changes when Cancel clicked', async () => {
    render(<ScenesStrip {...defaultProps} activeSceneId="worship-mode" />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByDisplayValue('Worship Mode')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByDisplayValue('Worship Mode')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm new ones fail**

```bash
npx vitest run src/renderer/components/ScenesStrip.test.tsx
```

Expected: existing 4 pass, new tests FAIL (missing props on component).

- [ ] **Step 3: Add CSS to `ScenesStrip.module.css`**

Add to the end of the file:

```css
.editBtn {
  padding: 4px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

.editBtn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.deleteBtn {
  padding: 4px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-error);
  background: transparent;
  color: var(--status-error);
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

.deleteBtn:hover {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
}

.dragging {
  opacity: 0.4;
}

.dragOver {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Rewrite `src/renderer/components/ScenesStrip.tsx`**

```typescript
import { useState } from 'react'
import type { Scene } from '../../shared/types'
import styles from './ScenesStrip.module.css'

interface SaveDialogProps {
  onConfirm: (name: string, fadeDuration: number) => void
  onCancel: () => void
}

function SaveDialog({ onConfirm, onCancel }: SaveDialogProps) {
  const [name, setName] = useState('')
  const [fade, setFade] = useState(0)
  return (
    <div className={styles.dialog}>
      <input
        placeholder="Scene name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label>
        Fade (ms):
        <input
          type="number"
          value={fade}
          min={0}
          step={500}
          onChange={(e) => setFade(Number(e.target.value))}
        />
      </label>
      <button className={styles.confirmBtn} onClick={() => name.trim() && onConfirm(name.trim(), fade)}>Save</button>
      <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
    </div>
  )
}

interface EditDialogProps {
  initialName: string
  initialFade: number
  onUpdate: (name: string, fadeDuration: number) => void
  onDelete: () => void
  onCancel: () => void
}

function EditDialog({ initialName, initialFade, onUpdate, onDelete, onCancel }: EditDialogProps) {
  const [name, setName] = useState(initialName)
  const [fade, setFade] = useState(initialFade)
  return (
    <div className={styles.dialog}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label>
        Fade (ms):
        <input
          type="number"
          value={fade}
          min={0}
          step={500}
          onChange={(e) => setFade(Number(e.target.value))}
        />
      </label>
      <button className={styles.confirmBtn} onClick={() => name.trim() && onUpdate(name.trim(), fade)}>Update</button>
      <button className={styles.deleteBtn} onClick={onDelete}>Delete</button>
      <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
    </div>
  )
}

interface Props {
  scenes: Scene[]
  activeSceneId: string | null
  onActivate: (id: string) => void
  onSave: (name: string, fadeDuration: number) => void
  onUpdate: (id: string, name: string, fadeDuration: number) => void
  onDelete: (id: string) => void
  onReorder: (scenes: Scene[]) => void
}

export function ScenesStrip({ scenes, activeSceneId, onActivate, onSave, onUpdate, onDelete, onReorder }: Props) {
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = scenes.findIndex((s) => s.id === dragId)
    const to = scenes.findIndex((s) => s.id === targetId)
    const reordered = [...scenes]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onReorder(reordered)
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className={styles.strip}>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onActivate(scene.id)}
          className={[
            styles.sceneBtn,
            scene.id === activeSceneId ? styles.active : '',
            scene.id === dragId ? styles.dragging : '',
            scene.id === dragOverId ? styles.dragOver : '',
          ].filter(Boolean).join(' ')}
          aria-pressed={scene.id === activeSceneId}
          draggable
          onDragStart={() => setDragId(scene.id)}
          onDragOver={(e) => { e.preventDefault(); setDragOverId(scene.id) }}
          onDrop={() => handleDrop(scene.id)}
          onDragEnd={() => { setDragId(null); setDragOverId(null) }}
        >
          {scene.name}
        </button>
      ))}

      {editing && activeScene ? (
        <EditDialog
          initialName={activeScene.name}
          initialFade={activeScene.fadeDuration}
          onUpdate={(name, fade) => { onUpdate(activeScene.id, name, fade); setEditing(false) }}
          onDelete={() => { onDelete(activeScene.id); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      ) : saving ? (
        <SaveDialog
          onConfirm={(name, fade) => { onSave(name, fade); setSaving(false) }}
          onCancel={() => setSaving(false)}
        />
      ) : (
        <>
          <button className={styles.saveBtn} onClick={() => setSaving(true)}>+ Save Scene</button>
          {activeSceneId && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>Edit</button>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/renderer/components/ScenesStrip.test.tsx
```

Expected: PASS (all 12 tests)

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/ScenesStrip.tsx src/renderer/components/ScenesStrip.module.css src/renderer/components/ScenesStrip.test.tsx
git commit -m "feat: add scene edit dialog, delete, and drag-to-reorder in ScenesStrip"
```

---

## Task 5: MainView Wiring

**Files:**
- Modify: `src/renderer/views/MainView.tsx`

- [ ] **Step 1: Update `MainView.tsx` to pass new ScenesStrip props**

In `src/renderer/views/MainView.tsx`, add three handlers after `handleSave` and wire them to `ScenesStrip`.

The full updated section (replace everything after `const sorted = ...`):

Add these three handlers after `handleSave`:

```typescript
  const handleSceneUpdate = useCallback(async (id: string, name: string, fadeDuration: number) => {
    const updated = await ipc.updateScene({ id, name, fadeDuration })
    if (updated) onScenesChange(scenes.map((s) => s.id === id ? updated : s))
  }, [scenes, ipc, onScenesChange])

  const handleSceneDelete = useCallback(async (id: string) => {
    await ipc.deleteScene(id)
    onScenesChange(scenes.filter((s) => s.id !== id))
    setActiveSceneId(null)
  }, [scenes, ipc, onScenesChange])

  const handleSceneReorder = useCallback(async (reordered: Scene[]) => {
    await ipc.reorderScenes(reordered.map((s) => s.id))
    onScenesChange(reordered)
  }, [ipc, onScenesChange])
```

Update the `ScenesStrip` JSX to include the three new props:

```tsx
          <ScenesStrip
            scenes={scenes}
            activeSceneId={activeSceneId}
            onActivate={handleActivate}
            onSave={handleSave}
            onUpdate={handleSceneUpdate}
            onDelete={handleSceneDelete}
            onReorder={handleSceneReorder}
          />
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Build**

```bash
./node_modules/.bin/electron-vite build 2>&1 | tail -5
```

Expected: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add src/renderer/views/MainView.tsx
git commit -m "feat: wire scene update, delete, reorder from MainView to IPC"
```

---

## Self-Review

**Spec coverage:**
- ✅ Edit button only visible when scene active — Task 4 (`activeSceneId && <button ... Edit>`)
- ✅ Edit dialog pre-filled with name + fade — Task 4 (`EditDialog` receives `initialName`, `initialFade`)
- ✅ Delete only accessible from edit dialog — Task 4 (`deleteBtn` inside `EditDialog`)
- ✅ `scene:update` IPC — Task 2
- ✅ `updateScene` store function — Task 1
- ✅ `scene:reorder` IPC — Task 2
- ✅ `reorderScenes` store function — Task 1
- ✅ Drag-to-reorder on scene buttons — Task 4
- ✅ `onUpdate`, `onDelete`, `onReorder` wired in MainView — Task 5
- ✅ `UpdateSceneArgs` type — Task 2

**Type consistency:**
- `UpdateSceneArgs = { id, name, fadeDuration }` — defined Task 2, used in Task 3 (useIpc), Task 4 (ScenesStrip → onUpdate), Task 5 (MainView → ipc.updateScene) ✅
- `onUpdate: (id: string, name: string, fadeDuration: number) => void` — defined Task 4, called Task 5 ✅
- `onReorder: (scenes: Scene[]) => void` — defined Task 4, called Task 5 (maps to `ids` before IPC) ✅

**Placeholder scan:** No TBDs. All code complete. ✅
