# Scene Editing Design

**Date:** 2026-06-04
**Status:** Approved

---

## Overview

Three additions to the `ScenesStrip`:
1. **Edit button** — visible when a scene is active; opens an edit dialog pre-filled with the scene's name and fade duration
2. **Edit dialog** — Update, Delete, Cancel actions; Delete only accessible through this dialog
3. **Drag to reorder** — HTML5 native drag-and-drop on scene buttons; persisted via new IPC

---

## Feature 1: Edit Button + Edit Dialog

### UX Flow

1. User activates a scene (clicks it, it becomes `activeSceneId`)
2. An **Edit** button appears in the strip alongside the existing "+ Save Scene" button
3. Clicking Edit opens the edit dialog, pre-filled with the active scene's `name` and `fadeDuration`
4. Dialog has three actions:
   - **Update** — saves the new name/fade, closes dialog
   - **Delete** — removes the scene from the store and the list, clears `activeSceneId`, closes dialog
   - **Cancel** — closes dialog without changes
5. Edit dialog reuses the same `SaveDialog` component but with seed props and an additional Delete button

### `ScenesStrip` changes

New props added:
```typescript
onUpdate: (id: string, name: string, fadeDuration: number) => void
onDelete: (id: string) => void
```

Internal state: `editing: boolean` — true when the edit dialog is open for the active scene.

When `activeSceneId !== null` and `!saving` and `!editing`:
- Show existing "+ Save Scene" button
- Show new "Edit" button

When `editing`:
- Render `EditDialog` with `initialName` and `initialFade` seeded from active scene
- `EditDialog` calls `onUpdate` or `onDelete`

### `EditDialog` component (internal to ScenesStrip file)

```typescript
interface EditDialogProps {
  initialName: string
  initialFade: number
  onUpdate: (name: string, fadeDuration: number) => void
  onDelete: () => void
  onCancel: () => void
}
```

Identical layout to `SaveDialog` but:
- Inputs pre-filled with `initialName` / `initialFade`
- Save button reads "Update"
- Additional "Delete" button (red/destructive style)
- Cancel button

### New IPC: `scene:update`

Handler in `electron/ipc.ts`:
```typescript
ipcMain.handle('scene:update', (_e, { id, name, fadeDuration }: UpdateSceneArgs) => {
  updateScene(id, name, fadeDuration)
  return getConfig().scenes.find((s) => s.id === id)
})
```

New type in `src/shared/types.ts`:
```typescript
export interface UpdateSceneArgs {
  id: string
  name: string
  fadeDuration: number
}
```

New store function in `electron/store.ts`:
```typescript
export function updateScene(id: string, name: string, fadeDuration: number): void {
  const scenes = store.get('scenes', [])
  const idx = scenes.findIndex((s) => s.id === id)
  if (idx < 0) return
  scenes[idx] = { ...scenes[idx], name, fadeDuration }
  store.set('scenes', scenes)
}
```

Preload + type declaration: `updateScene: (args: UpdateSceneArgs) => Promise<Scene>`

`scene:delete` IPC handler already exists. Preload already exposes `deleteScene`.

---

## Feature 2: Drag to Reorder

### UX

Scene buttons are draggable. Dragging left/right reorders the strip in real time. On drop, the new order is persisted via `scene:reorder` IPC.

### Implementation

HTML5 native drag-and-drop — no external library.

`ScenesStrip` internal state: `dragIndex: number | null` — the index of the button being dragged.

On each scene button:
- `draggable={true}`
- `onDragStart` — sets `dragIndex`
- `onDragOver` — prevents default (enables drop), computes new order and updates local `orderedScenes` state
- `onDrop` — calls `onReorder(orderedScenes)` and clears `dragIndex`
- `onDragEnd` — clears `dragIndex` (fallback cleanup)

Visual feedback: dragged button gets reduced opacity (0.4) via CSS class.

`ScenesStrip` new prop:
```typescript
onReorder: (scenes: Scene[]) => void
```

### New IPC: `scene:reorder`

Handler:
```typescript
ipcMain.handle('scene:reorder', (_e, { ids }: { ids: string[] }) => {
  reorderScenes(ids)
})
```

New store function:
```typescript
export function reorderScenes(ids: string[]): void {
  const scenes = store.get('scenes', [])
  const ordered = ids.map((id) => scenes.find((s) => s.id === id)).filter(Boolean) as Scene[]
  store.set('scenes', ordered)
}
```

Preload + type declaration: `reorderScenes: (ids: string[]) => Promise<void>`

---

## Files Changed / Created

| File | Change |
|---|---|
| `src/shared/types.ts` | Add `UpdateSceneArgs` |
| `electron/store.ts` | Add `updateScene`, `reorderScenes` |
| `electron/ipc.ts` | Add `scene:update`, `scene:reorder` handlers |
| `electron/preload/index.ts` | Expose `updateScene`, `reorderScenes` |
| `src/shared/electron-api.d.ts` | Add type declarations |
| `src/renderer/components/ScenesStrip.tsx` | Add Edit button, EditDialog, drag-and-drop |
| `src/renderer/components/ScenesStrip.module.css` | Add edit/delete/drag styles |
| `src/renderer/components/ScenesStrip.test.tsx` | Add tests for edit, delete, reorder |
| `src/renderer/views/MainView.tsx` | Pass `onUpdate`, `onDelete`, `onReorder` to ScenesStrip |

---

## Testing

- `store.ts`: unit tests for `updateScene` (updates name+fade, preserves values) and `reorderScenes` (produces correct order)
- `ScenesStrip`: RTL tests for Edit button visibility (only when active), EditDialog rendering, Update call, Delete call, Cancel behaviour, drag reorder order
- Existing `ScenesStrip` tests must still pass
