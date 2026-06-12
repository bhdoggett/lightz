# Save-state indicator + scene-rename → companion route sync

## 1. Unsaved-changes indicator on the save icon

### Goal
The header save icon (`src/renderer/App.tsx`) currently looks the same whether
or not the in-memory show differs from the file on disk. Add visual feedback:

- Icon turns **yellow** while there are unsaved changes.
- Clicking save shows a brief **green checkmark**, then reverts to normal.

### State
Add to `App`:
- `dirty: boolean` — true when `config` has diverged from the last
  saved/loaded show.
- `justSaved: boolean` — true for ~1.5s after a successful save via the
  header button.

### Marking dirty
`dirty = true` is set inside every handler that mutates `config` in place:
- `handleFixturesChange`
- `handleScenesChange`
- `handleGroupsChange`
- `handlePortChange`
- `handleDevicePathChange`
- `handleDmxOutputPortChange`
- the `onDeviceAutoConnected` listener (it updates `config.devicePath`)

These already cover every code path that calls `setConfig` for an edit.

### Clearing dirty
`dirty = false` is set:
- after the initial `getConfig().then(setConfig)` on mount
- in `ShowsModal`'s `onLoad` (loading a different show)
- in `ShowsModal`'s `onNew` (resetting to a blank show)
- after `handleSaveCurrent` succeeds
- in `ShowsModal`'s `onSaved` (saving via the modal's save row also persists
  the current config)

### Save click feedback
In `handleSaveCurrent`, after `saveNamedShow` resolves:
- `setDirty(false)`
- `setJustSaved(true)`
- start a timeout (stored in a ref so it can be cleared on unmount or a
  repeat click) that sets `justSaved(false)` after ~1.5s

Only the header save button triggers `justSaved` — saving via the Shows
modal clears `dirty` but does not flash the header checkmark.

### Rendering
In the save button:
- if `justSaved`: render a checkmark `<svg>` (currentColor), styled with
  `color: var(--status-connected)` (green)
- else if `dirty`: render the existing floppy-disk `<svg>`, styled with
  `color: var(--status-warning)` (new token, amber `#f59e0b`)
- else: existing floppy-disk `<svg>` with default `--text-secondary` color

`title` updates to reflect state, e.g. `"Unsaved changes — save to \"X\""` /
`"Saved"` / `"Save to \"X\""`.

### New design token
Add to `src/renderer/globals.css` under `/* Status */`:
```css
--status-warning: #f59e0b;
```

---

## 2. Scene rename regenerates its id (and companion route)

### Goal
`POST /scenes/:id/activate` is keyed on `scene.id`, a slug generated once at
creation time via `makeSceneId`. Today, renaming a scene (Edit dialog →
Update) changes `name`/`fadeDuration` but leaves `id` untouched, so the
companion route silently stops matching the scene's current name. Renaming
should regenerate `id` (and therefore the route shown in `CompanionModal`) to
match the new name.

**Tradeoff (accepted):** any Companion button already configured with the old
URL breaks after a rename and must be re-copied from `CompanionModal`.

### `electron/store.ts`
`updateScene(id, name, fadeDuration)`:
- find the scene by current `id`; return `null` if not found
- compute `otherIds = scenes.filter(s => s.id !== id).map(s => s.id)`
- `newId = makeSceneId(name, otherIds)`
- replace the entry: `{ ...scene, id: newId, name, fadeDuration }`
- persist and return the updated `Scene`

Renaming to the same name reproduces the same slug (since the scene's own
old id is excluded from the collision set), so no-op renames keep their id.
Renaming to a name that collides with another scene's slug gets a `-2`,
`-3`, … suffix, same as scene creation.

### `electron/ipc.ts`
`scene:update` handler returns `updateScene(...)` directly (the previous
`getConfig().scenes.find(s => s.id === args.id) ?? null` lookup is now wrong
once `id` can change).

### `src/renderer/views/MainView.tsx`
`handleSceneUpdate`:
- call `ipc.updateScene({ id, name, fadeDuration })`
- if a scene came back: replace it in `scenes` (by the *old* `id`) via
  `onScenesChange`
- if `activeSceneId === id` (the renamed scene was active), update
  `setActiveSceneId(updated.id)` so the active highlight and Edit button
  keep tracking it

### `CompanionModal`
No code change — it already renders `scene.id`/`scene.name` reactively from
props, so the new `/scenes/:id/activate` URL appears immediately after the
parent's `scenes` state updates.

---

## Testing

- `electron/store.test.ts`:
  - update the existing `updateScene` test to expect the regenerated id for
    a name change
  - add a case for a rename that collides with another scene's id, expecting
    a `-2` suffix
  - add a case for a no-op rename (same name) keeping the same id
- `electron/server.test.ts`: no change needed (route behavior driven by
  `scene.id`, already covered)
- `App.tsx` save icon and `MainView`'s `activeSceneId`-on-rename behavior:
  no existing test files for either component and adding harnesses for both
  is out of scope for this fix. Verify manually in the dev app:
  - edit a fixture/scene/group → icon turns yellow
  - click save → checkmark flashes, then icon returns to normal
  - load/create a new show → icon returns to normal (not yellow)
  - rename the active scene → it stays highlighted/active, Edit button still
    works, and `CompanionModal`'s URL for it updates to the new slug
