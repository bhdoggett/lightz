# Save-State Indicator + Scene-Rename Id Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show unsaved-changes state on the header save icon (yellow when dirty, brief green checkmark on save), and make renaming a scene regenerate its id so the companion HTTP route (`/scenes/:id/activate`) tracks the new name.

**Architecture:** Two independent slices. (1) `App.tsx` gains `dirty`/`justSaved` state set by its existing config-mutation handlers, rendered via new CSS classes/tokens. (2) `electron/store.ts`'s `updateScene` regenerates the scene's `id` via the existing `makeSceneId` slug helper, threaded back through `scene:update` IPC and `MainView`'s `activeSceneId` tracking.

**Tech Stack:** React + TypeScript (renderer), Electron main process + electron-store (backend), Vitest for tests.

---

### Task 1: Scene rename regenerates its id

**Files:**
- Modify: `electron/store.ts:79-85` (the `updateScene` function), imports at top
- Test: `electron/store.test.ts:61-86` (the `updateScene` describe block)

- [ ] **Step 1: Write the failing tests**

Replace the existing `updateScene` describe block (lines 61-86) in `electron/store.test.ts` with:

```typescript
describe('updateScene', () => {
  it('regenerates the id from the new name, preserving values', () => {
    const scenes = [
      { id: 's1', name: 'Old Name', fadeDuration: 0, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    const result = updateScene('s1', 'New Name', 2000)
    expect(result).toEqual({ id: 'new-name', name: 'New Name', fadeDuration: 2000, values: { f1: 100 } })
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 'new-name', name: 'New Name', fadeDuration: 2000, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ])
  })

  it('keeps the same id when the name is unchanged', () => {
    const scenes = [
      { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    const result = updateScene('worship-mode', 'Worship Mode', 1500)
    expect(result).toEqual({ id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1500, values: {} })
  })

  it('appends a suffix when the new name collides with another scene id', () => {
    const scenes = [
      { id: 's1', name: 'Old Name', fadeDuration: 0, values: {} },
      { id: 'bright', name: 'Bright', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    const result = updateScene('s1', 'Bright', 0)
    expect(result?.id).toBe('bright-2')
  })

  it('returns null when id not found', () => {
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? [] : def
    )
    inst().set.mockClear()
    expect(updateScene('nonexistent', 'X', 0)).toBeNull()
    expect(inst().set).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run electron/store.test.ts`
Expected: FAIL — `updateScene('s1', 'New Name', 2000)` currently returns `undefined` (function returns `void`), so `result` is `undefined` and the `toEqual` assertions fail. The collision test fails because `result?.id` is `undefined`, not `'bright-2'`.

- [ ] **Step 3: Implement the id-regeneration logic**

In `electron/store.ts`, add the import at the top (after the existing type import on line 2):

```typescript
import { makeSceneId } from './slug'
```

Replace the `updateScene` function (lines 79-85):

```typescript
export function updateScene(id: string, name: string, fadeDuration: number): Scene | null {
  const scenes = store.get('scenes', [])
  const idx = scenes.findIndex((s) => s.id === id)
  if (idx < 0) return null
  const otherIds = scenes.filter((s) => s.id !== id).map((s) => s.id)
  const newId = makeSceneId(name, otherIds)
  scenes[idx] = { ...scenes[idx], id: newId, name, fadeDuration }
  store.set('scenes', scenes)
  return scenes[idx]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run electron/store.test.ts`
Expected: PASS — all `updateScene` tests green, and the rest of the file (fixtures, groups, reorder) still passes since those are untouched.

- [ ] **Step 5: Commit**

```bash
git add electron/store.ts electron/store.test.ts
git commit -m "feat: regenerate scene id from name on update"
```

---

### Task 2: Propagate the regenerated id through IPC and MainView

**Files:**
- Modify: `electron/ipc.ts:57-60` (the `scene:update` handler)
- Modify: `src/renderer/views/MainView.tsx:120-123` (`handleSceneUpdate`)

- [ ] **Step 1: Simplify the `scene:update` IPC handler**

In `electron/ipc.ts`, replace the `scene:update` handler (lines 57-60):

```typescript
  ipcMain.handle('scene:update', (_e, args: UpdateSceneArgs) => {
    return updateScene(args.id, args.name, args.fadeDuration)
  })
```

This drops the old `getConfig().scenes.find((s) => s.id === args.id) ?? null` lookup, which would now miss the scene whenever its id changed. `updateScene` (Task 1) already returns the updated `Scene | null` directly, and `getConfig` is still used elsewhere in this file so its import stays.

- [ ] **Step 2: Update `MainView.handleSceneUpdate` to track a changed active-scene id**

In `src/renderer/views/MainView.tsx`, replace `handleSceneUpdate` (lines 120-123):

```typescript
  const handleSceneUpdate = useCallback(async (id: string, name: string, fadeDuration: number) => {
    const updated = await ipc.updateScene({ id, name, fadeDuration })
    if (!updated) return
    onScenesChange(scenes.map((s) => s.id === id ? updated : s))
    if (activeSceneId === id) setActiveSceneId(updated.id)
  }, [scenes, ipc, onScenesChange, activeSceneId])
```

`activeSceneId` and `setActiveSceneId` already exist (declared on line 29: `const [activeSceneId, setActiveSceneId] = useState<string | null>(null)`); this just adds `activeSceneId` to the dependency array.

- [ ] **Step 3: Run the full test suite and typecheck**

Run: `npx vitest run`
Expected: PASS — no existing test exercises `MainView.handleSceneUpdate` or the `scene:update` IPC handler directly, so this should be a clean pass with the same results as before this task.

Run: `npx tsc -b`
Expected: no output, exit code 0 (both `tsconfig.web.json` and `tsconfig.node.json` project references typecheck cleanly).

- [ ] **Step 4: Commit**

```bash
git add electron/ipc.ts src/renderer/views/MainView.tsx
git commit -m "fix: keep active scene and companion route in sync after rename"
```

---

### Task 3: Unsaved-changes indicator on the save icon

**Files:**
- Modify: `src/renderer/globals.css:25-28` (Status tokens)
- Modify: `src/renderer/App.module.css` (save icon styles)
- Modify: `src/renderer/App.tsx` (state, handlers, render)

- [ ] **Step 1: Add the warning color token**

In `src/renderer/globals.css`, the `/* Status */` block currently reads (lines 25-28):

```css
  /* Status */
  --status-connected: #22c55e;
  --status-disconnected: #6b7280;
  --status-error: #ef4444;
```

Replace it with:

```css
  /* Status */
  --status-connected: #22c55e;
  --status-disconnected: #6b7280;
  --status-error: #ef4444;
  --status-warning: #f59e0b;
```

- [ ] **Step 2: Add dirty/saved styles for the save icon**

In `src/renderer/App.module.css`, the `.saveIconBtn` rules currently read:

```css
.saveIconBtn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
}

.saveIconBtn:hover {
  color: var(--text-primary);
}
```

Add these two rules immediately after `.saveIconBtn:hover`:

```css
.saveIconBtn.dirty,
.saveIconBtn.dirty:hover {
  color: var(--status-warning);
}

.saveIconBtn.saved,
.saveIconBtn.saved:hover {
  color: var(--status-connected);
}
```

- [ ] **Step 3: Add `dirty`/`justSaved` state and wire up the mutation handlers**

In `src/renderer/App.tsx`, change the import on line 1 from:

```typescript
import { useEffect, useState } from 'react'
```

to:

```typescript
import { useEffect, useRef, useState } from 'react'
```

Add new state and a timeout ref alongside the existing state declarations (after `const [saving, setSaving] = useState(false)` on line 15):

```typescript
  const [dirty, setDirty] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const justSavedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (justSavedTimeout.current) clearTimeout(justSavedTimeout.current)
    }
  }, [])
```

Now update the config-mutation handlers to mark `dirty`. Replace:

```typescript
  const handleFixturesChange = (fixtures: Fixture[]) =>
    setConfig((c) => c ? { ...c, fixtures } : c)

  const handleScenesChange = (scenes: Scene[]) =>
    setConfig((c) => c ? { ...c, scenes } : c)

  const handleGroupsChange = (groups: Group[]) =>
    setConfig((c) => c ? { ...c, groups } : c)

  const handlePortChange = async (port: number) => {
    await window.electronAPI.setPort(port)
    setConfig((c) => c ? { ...c, companionPort: port } : c)
  }

  const handleDevicePathChange = async (path: string) => {
    await window.electronAPI.setDevicePath(path)
    setConfig((c) => c ? { ...c, devicePath: path } : c)
  }

  const handleDmxOutputPortChange = async (port: 0 | 1 | 2) => {
    await window.electronAPI.setDmxOutputPort(port)
    setConfig((c) => c ? { ...c, dmxOutputPort: port } : c)
  }
```

with:

```typescript
  const handleFixturesChange = (fixtures: Fixture[]) => {
    setConfig((c) => c ? { ...c, fixtures } : c)
    setDirty(true)
  }

  const handleScenesChange = (scenes: Scene[]) => {
    setConfig((c) => c ? { ...c, scenes } : c)
    setDirty(true)
  }

  const handleGroupsChange = (groups: Group[]) => {
    setConfig((c) => c ? { ...c, groups } : c)
    setDirty(true)
  }

  const handlePortChange = async (port: number) => {
    await window.electronAPI.setPort(port)
    setConfig((c) => c ? { ...c, companionPort: port } : c)
    setDirty(true)
  }

  const handleDevicePathChange = async (path: string) => {
    await window.electronAPI.setDevicePath(path)
    setConfig((c) => c ? { ...c, devicePath: path } : c)
    setDirty(true)
  }

  const handleDmxOutputPortChange = async (port: 0 | 1 | 2) => {
    await window.electronAPI.setDmxOutputPort(port)
    setConfig((c) => c ? { ...c, dmxOutputPort: port } : c)
    setDirty(true)
  }
```

Also mark dirty when a device auto-connects. Replace the mount effect:

```typescript
  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig)
    window.electronAPI.onDmxStatus(setDmxStatus)
    window.electronAPI.onDeviceAutoConnected((path) =>
      setConfig((c) => c ? { ...c, devicePath: path } : c)
    )
  }, [])
```

with:

```typescript
  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig)
    window.electronAPI.onDmxStatus(setDmxStatus)
    window.electronAPI.onDeviceAutoConnected((path) => {
      setConfig((c) => c ? { ...c, devicePath: path } : c)
      setDirty(true)
    })
  }, [])
```

- [ ] **Step 4: Clear `dirty` on load/new/save, and flash `justSaved` on header save**

Replace `handleSaveCurrent`:

```typescript
  const handleSaveCurrent = async () => {
    if (!currentShowName) return
    setSaving(true)
    try {
      await window.electronAPI.saveNamedShow(currentShowName)
    } finally {
      setSaving(false)
    }
  }
```

with:

```typescript
  const handleSaveCurrent = async () => {
    if (!currentShowName) return
    setSaving(true)
    try {
      await window.electronAPI.saveNamedShow(currentShowName)
      setDirty(false)
      setJustSaved(true)
      if (justSavedTimeout.current) clearTimeout(justSavedTimeout.current)
      justSavedTimeout.current = setTimeout(() => setJustSaved(false), 1500)
    } finally {
      setSaving(false)
    }
  }
```

Replace the `ShowsModal` usage:

```typescript
      {showsOpen && (
        <ShowsModal
          onLoad={(imported, name) => { setConfig(imported); setCurrentShowName(name) }}
          onSaved={(name) => setCurrentShowName(name)}
          onNew={(fresh) => { setConfig(fresh); setCurrentShowName(null) }}
          onClose={() => setShowsOpen(false)}
        />
      )}
```

with:

```typescript
      {showsOpen && (
        <ShowsModal
          onLoad={(imported, name) => { setConfig(imported); setCurrentShowName(name); setDirty(false) }}
          onSaved={(name) => { setCurrentShowName(name); setDirty(false) }}
          onNew={(fresh) => { setConfig(fresh); setCurrentShowName(null); setDirty(false) }}
          onClose={() => setShowsOpen(false)}
        />
      )}
```

- [ ] **Step 5: Render the icon based on `dirty`/`justSaved`**

Replace the save button block:

```typescript
          {currentShowName && (
            <button
              className={styles.saveIconBtn}
              onClick={handleSaveCurrent}
              disabled={saving}
              title={`Save to "${currentShowName}"`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="3.5" y="1" width="5" height="4.5" rx="0.5" fill="currentColor"/>
                <rect x="3" y="7" width="8" height="5" rx="0.5" fill="currentColor"/>
              </svg>
            </button>
          )}
```

with:

```typescript
          {currentShowName && (
            <button
              className={[
                styles.saveIconBtn,
                justSaved ? styles.saved : dirty ? styles.dirty : '',
              ].filter(Boolean).join(' ')}
              onClick={handleSaveCurrent}
              disabled={saving}
              title={
                justSaved
                  ? 'Saved'
                  : dirty
                    ? `Unsaved changes — save to "${currentShowName}"`
                    : `Save to "${currentShowName}"`
              }
            >
              {justSaved ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="3.5" y="1" width="5" height="4.5" rx="0.5" fill="currentColor"/>
                  <rect x="3" y="7" width="8" height="5" rx="0.5" fill="currentColor"/>
                </svg>
              )}
            </button>
          )}
```

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `npx vitest run`
Expected: PASS — `App.tsx` has no existing test file, so this confirms no regressions elsewhere.

Run: `npx tsc -b`
Expected: no output, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/globals.css src/renderer/App.module.css src/renderer/App.tsx
git commit -m "feat: show unsaved-changes state on the save icon"
```

---

### Task 4: Manual verification in the dev app

**Files:** none (manual QA pass)

- [ ] **Step 1: Start the app**

Run: `npm run dev`
Expected: Electron window opens showing Lightz.

- [ ] **Step 2: Verify the dirty indicator**

1. Load or create a show (via the "Shows" button) so the save icon is visible.
2. Confirm the save icon is the default secondary color (not yellow).
3. Make an edit — rename a fixture channel, add/save a scene, or create a group.
4. Confirm the save icon turns **yellow** (`--status-warning`).

- [ ] **Step 3: Verify the save flash**

1. Click the yellow save icon.
2. Confirm it briefly shows a **green checkmark**.
3. Confirm after ~1.5s it reverts to the default secondary color (no longer yellow, no longer a checkmark).

- [ ] **Step 4: Verify load/new reset the indicator**

1. Make an edit (icon turns yellow).
2. Open "Shows" and load a different show (or create a new one).
3. Confirm the save icon is back to the default color (not yellow) without needing to click save.

- [ ] **Step 5: Verify scene rename updates the companion route**

1. Save a scene (e.g. name it "Test Scene") — note its slug in Settings → Scene Endpoints (e.g. `/scenes/test-scene/activate`).
2. Activate that scene (click it so it's the active scene).
3. Click **Edit**, rename it to e.g. "Worship Mode", click **Update**.
4. Confirm the scene stays highlighted as active and the **Edit** button is still available for it.
5. Open Settings → Scene Endpoints and confirm the URL for that scene is now `/scenes/worship-mode/activate` (matching the new name).
