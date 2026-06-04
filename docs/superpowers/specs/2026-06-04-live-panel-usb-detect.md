# Live Channel Panel + USB Auto-Detect Design

**Date:** 2026-06-04
**Status:** Approved

---

## Overview

Two features:
1. **USB auto-detect** — settings modal scans for serial devices automatically so the user never has to guess a path.
2. **Live channel panel** — a raw 512-channel DMX control view accessible from a tab in the main view, plus a `RawFader` component that replaces the existing `FixtureFader` internals for visual consistency.

---

## Feature 1: USB Auto-Detect

### IPC Layer

New handler `device:listPorts` in `electron/ipc.ts`. Reads `/dev` using `fs.readdirSync` and filters for entries matching `tty.usb*`, `cu.usb*`, and `tty.usbmodem*`. Returns `string[]` of full paths (e.g. `["/dev/tty.usbmodem1HP0035381"]`). No new npm dependencies.

New file `electron/ports.ts`:
```ts
export function listSerialPorts(): string[] {
  // reads /dev, filters by known USB serial prefixes
}
```

### Preload

`window.electronAPI.listPorts(): Promise<string[]>`

### UI: Settings Modal (`CompanionModal`)

When the modal opens, `listPorts()` is called automatically. Results render as a clickable list above the device path text input. Clicking a result populates the input field (does not auto-connect). A "Refresh" button re-scans without closing the modal. If the list is empty, show "No USB serial devices detected — try plugging in the device and refreshing."

Flow: scan → click result → field populated → click Connect → `setDevicePath` IPC called → DMX connects → badge updates.

---

## Feature 2: Live Channel Panel

### Layout

`MainView` gains a "Scenes | Live" tab strip immediately below the header (replacing the current `ScenesStrip`-at-the-top layout). The `ScenesStrip` moves inside the Scenes tab. The Live tab renders `LiveView`.

A universe toggle **U1 / U2** sits at the right end of the tab strip. State lives in `MainView`.

### `LiveView` component

`src/renderer/views/LiveView.tsx`

Props:
```ts
interface Props {
  universe: 0 | 1
}
```

Renders 512 `RawFader` instances (channels 1–512) in a horizontally-scrolling strip. On mount and on `universe` prop change, reads current channel values from `useDmxState`. On slider/button interaction, calls `ipc.setChannel` and updates local state via `useDmxState`.

Performance: 512 DOM nodes is fine for a desktop Electron app. No virtualisation needed.

### `RawFader` component

`src/renderer/components/RawFader.tsx` + `RawFader.module.css`

```ts
interface Props {
  channel: number      // 1–512, shown as label
  value: number        // 0–255
  label?: string       // optional fixture name overlay
  onChange: (value: number) => void
}
```

Visual layout (top → bottom):
1. Value label (e.g. `128`, coloured accent when > 0)
2. Vertical range slider (0–255)
3. Row: ○ button (→ 255) | ✕ button (→ 0)
4. Channel number (monospace, muted)
5. Optional fixture label (small, truncated)

### `FixtureFader` refactor

`FixtureFader` becomes a wrapper around `RawFader`, passing `name` as `label` and `channel` from the fixture. The `FixtureFader` props interface stays identical so no callers change.

---

## Data Flow

```
LiveView
  └── RawFader (×512)
        onChange → useDmxState.setChannel (local)
               → ipc.setChannel (IPC → DmxManager.setChannel → hardware)

MainView (universe toggle state)
  └── LiveView (universe prop)
```

`LiveView` owns its own `useDmxState` instance — live channel state is independent from the named-fixture state in `MainView`. Changes in `LiveView` still fire `ipc.setChannel` so hardware always reflects both. `useDmxState` has no global store; each hook call is a separate React state. This is intentional: live control is a scratchpad, not tied to scenes.

---

## Files Changed / Created

| File | Change |
|---|---|
| `electron/ports.ts` | New — `listSerialPorts()` |
| `electron/ipc.ts` | Add `device:listPorts` handler |
| `electron/preload/index.ts` | Expose `listPorts` |
| `src/shared/electron-api.d.ts` | Add `listPorts` type |
| `src/renderer/components/RawFader.tsx` | New component |
| `src/renderer/components/RawFader.module.css` | New styles |
| `src/renderer/components/FixtureFader.tsx` | Refactor to wrap RawFader |
| `src/renderer/components/FixtureFader.module.css` | Remove (RawFader owns styles) |
| `src/renderer/components/CompanionModal.tsx` | Add port list UI |
| `src/renderer/components/CompanionModal.module.css` | Add port list styles |
| `src/renderer/views/LiveView.tsx` | New view |
| `src/renderer/views/LiveView.module.css` | New styles |
| `src/renderer/views/MainView.tsx` | Add Scenes/Live tabs + universe toggle |
| `src/renderer/views/MainView.module.css` | Add tab styles |

---

## Testing

- `electron/ports.ts`: unit test mocking `fs.readdirSync` — verifies prefix filtering, full paths, empty result.
- `RawFader`: RTL tests — renders value, calls onChange on slider move, calls onChange(255) on ○, calls onChange(0) on ✕.
- `LiveView`: RTL smoke test — renders 512 faders for the given universe.
- `CompanionModal`: add test that port list renders when `ports` prop is provided.
- `FixtureFader`: existing tests pass unchanged (wrapper contract preserved).
