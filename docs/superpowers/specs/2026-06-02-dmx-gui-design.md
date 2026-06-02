# Church Lights DMX GUI — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

A desktop application for a church AV operator to control DMX lighting from a MacBook connected directly to a DMX port via an Enttec USB DMX Pro Mk2. The operator can label fixtures, control them live (faders and toggles), save/recall named scenes, and trigger scenes remotely from Bitfocus Companion over HTTP.

---

## Stack

- **Framework:** Electron (main process: Node.js, renderer: Vite + React)
- **DMX library:** `node-dmx` — first-class Enttec USB DMX Pro Mk2 support
- **HTTP server:** Express running in the main process (Companion integration)
- **Storage:** JSON file via `electron-store` in `app.getPath('userData')`
- **Platform:** macOS, distributed as `.dmg`

---

## Architecture

### Processes

**Main process (Node.js)**
- Owns the DMX connection via `node-dmx`
- Manages the Enttec USB DMX Pro Mk2 (supports two DMX universes)
- Runs an Express HTTP server on a configurable port (default: 3000) for Companion
- Reads/writes config JSON (fixtures + scenes)
- Handles all IPC messages from the renderer

**Renderer process (React + Vite)**
- The full UI
- Communicates with main via Electron IPC
- No direct DMX or file access

### IPC Surface (renderer → main)

| Channel | Payload | Description |
|---|---|---|
| `dmx:setChannel` | `{ universe, channel, value }` | Live fader/toggle update |
| `scene:save` | `{ name, fadeDuration, values }` | Save current state as scene |
| `scene:load` | `{ id }` | Activate a scene |
| `scene:delete` | `{ id }` | Delete a scene |
| `fixture:update` | `Fixture` | Create or update a fixture |
| `fixture:delete` | `{ id }` | Remove a fixture |
| `config:get` | — | Fetch full config on app start |
| `config:setPort` | `{ port }` | Update Companion HTTP port |

### Companion HTTP API (Express, main process)

| Method | Path | Description |
|---|---|---|
| `POST` | `/scenes/:id/activate` | Activate a scene by ID |
| `GET` | `/scenes` | List all scenes (id, name) |
| `GET` | `/status` | Connection health check |

Scene IDs are URL-safe slugs generated from scene names (e.g. "Worship Mode" → `worship-mode`). If a slug would collide with an existing scene, a numeric suffix is appended (`worship-mode-2`, etc.).

---

## Data Model

Stored as a single JSON file in `app.getPath('userData')/config.json`.

```ts
type FixtureType = 'dimmer' | 'switch';

interface Fixture {
  id: string;          // uuid
  name: string;        // e.g. "Chandelier Left"
  channel: number;     // 1–512
  universe: 0 | 1;     // Enttec Mk2 has two universes
  type: FixtureType;
}

interface Scene {
  id: string;          // url-safe slug from name
  name: string;        // e.g. "Worship Mode"
  fadeDuration: number; // milliseconds, 0 = instant snap
  values: Record<string, number>; // fixtureId → 0–255
}

interface Config {
  fixtures: Fixture[];
  scenes: Scene[];
  companionPort: number; // default 3000
}
```

**Scene fade:** value interpolation runs in the main process on a ~16ms interval (≈60fps) between the current channel state and the target scene values, using linear interpolation over `fadeDuration` ms.

---

## UI

### Main View (default)

**Header bar:**
- App name / logo
- DMX connection status badge (green "Connected" / red "Disconnected")
- Gear icon → Setup view
- Info icon → About/Companion modal

**Scenes strip (top):**
- One button per saved scene; active scene highlighted
- "+ Save Scene" button — prompts for name and fade duration, captures current channel state

**Fixture controls (below scenes):**
- Dimmers: vertical fader (0–255) with fixture name label below
- Switches: toggle button (on/off) with fixture name label
- Fixtures are ordered by channel number

### Setup View (navigate to, with back button)

**Left panel — channel browser:**
- Scrollable list of all 512 channels
- Each row: channel number | value bar | label (or "unlabeled" in muted style)
- Click a row to select it for editing

**Right panel — channel editor:**
- Name text field
- Type selector: Dimmer / Switch
- Universe selector: 1 / 2
- Save button
- Delete button (only shown for labeled fixtures)

### About / Companion Setup (modal, header info button)

- Local HTTP URL and port (port is editable inline, saves to config)
- Table of all scene endpoints with copy-to-clipboard button per row:  
  e.g. `POST http://localhost:3000/scenes/worship-mode/activate`
- Plain-English Companion setup steps:  
  1. Add a "Generic HTTP" button  
  2. Set method to POST  
  3. Paste the URL for the scene  

---

## App Startup

On launch, all DMX channels are set to 0 (all lights off). No scene is automatically activated. The last-active scene is not persisted — the operator always chooses the starting state.

---

## Scene Transitions

- Each scene stores its own `fadeDuration` in milliseconds
- `0` = instant (all channels jump to target values immediately)
- Non-zero = linear interpolation in main process, ~60fps tick
- Fade applies to dimmer fixtures only; switches snap immediately regardless of fade duration

---

## File & Project Structure

```
church-lights/
  electron/
    main.ts         # Electron main process entry
    dmx.ts          # node-dmx wrapper
    server.ts       # Express Companion HTTP server
    store.ts        # electron-store config read/write
    ipc.ts          # IPC handler registration
  src/
    App.tsx
    views/
      MainView.tsx
      SetupView.tsx
    components/
      ScenesStrip.tsx
      FixtureFader.tsx
      FixtureToggle.tsx
      ChannelList.tsx
      ChannelEditor.tsx
      CompanionModal.tsx
    hooks/
      useIpc.ts     # typed IPC helpers
      useDmxState.ts
  vite.config.ts
  electron-builder.config.ts
```

---

## Out of Scope

- Scheduled / time-based automations
- Color mixing (RGB/RGBW)
- Moving head control
- Multi-user or networked operation
- Windows / Linux support
