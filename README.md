# Church Lights

A macOS desktop app for controlling DMX church lighting via an **Enttec USB DMX Pro Mk2**. Built for live worship environments — fast scene recall, DCA-style fixture groups, and Bitfocus Companion integration.

> **macOS only.** Windows is not supported — the Enttec driver relies on macOS serial port access.

---

## Download & Install

### Option A — Build from source (recommended for now)

```bash
git clone https://github.com/bhdoggett/church-lights.git
cd church-lights
npm install
npm run build:mac
```

Open `dist-electron/Church Lights-0.1.0-arm64.dmg` (Apple Silicon) or `Church Lights-0.1.0.dmg` (Intel) from Finder. Drag **Church Lights** to Applications.

### Option B — Download pre-built .dmg

**[→ All releases](https://github.com/bhdoggett/church-lights/releases)**

Download the right file for your Mac:

| Download | For |
|---|---|
| [Church Lights-0.1.0-arm64.dmg](https://github.com/bhdoggett/church-lights/releases/download/v0.1.0/Church.Lights-0.1.0-arm64.dmg) | Apple Silicon (M1/M2/M3/M4) |
| [Church Lights-0.1.0.dmg](https://github.com/bhdoggett/church-lights/releases/download/v0.1.0/Church.Lights-0.1.0.dmg) | Intel Mac |

Double-click the `.dmg`, drag Church Lights to Applications, then open it. macOS may prompt you in **System Settings → Privacy & Security** on first launch — click **Open Anyway**.

---

## Hardware Requirements

- **Enttec USB DMX Pro Mk2** (dual-universe USB-to-DMX interface)
- **macOS 12 Monterey or later** (Apple Silicon and Intel supported)

> **No additional driver needed on macOS 12+.** The Enttec Mk2 appears automatically in the Settings device list — no downloads required.
>
> On **older macOS versions**, you may need to install the driver manually. Download it from the [Enttec support page](https://support.enttec.com/support/solutions/articles/103000261045-usb-dmx-pro-mk2-user-manual) or the [FTDI VCP driver page](https://ftdichip.com/drivers/vcp-drivers/) if the device is not detected after plugging in.

---

## First Launch

1. Plug in the Enttec device via USB.
2. Open Church Lights.
3. Click **⚙** (top right) → **Settings**.
4. Under **DMX Device**, click **↺ Refresh** — your device should appear as `/dev/cu.usbmodem...`.
5. Click the device path to select it, then click **Connect**.
6. The connection badge in the header turns green: **DMX Connected**.

---

## Core Concepts

### Full tab — raw channel control
All 512 DMX channels displayed as vertical sliders. Use this for initial patching and diagnosing which channel controls which fixture. Click a channel number to name it (this creates a fixture in the Custom tab).

### Custom tab — named fixture control
Only your labeled fixtures appear here as named faders. Use this during a service.

### Scenes
A scene is a snapshot of all fixture values at a moment in time. The scenes strip runs along the top of both tabs.

- **Save Scene** — type a name and optional fade duration, click Save. Values are captured from current fader positions.
- **Activate** — click a scene button to fade or snap all fixtures to those values.
- **Edit** — select a scene, click **Edit** to rename, change fade time, or delete.
- **Drag to reorder** — drag scene buttons left/right to rearrange.

### Groups (DCA-style)
Groups work like a soundboard DCA — a master control that scales a set of fixtures together.

- Create a group via **+ Group** in the Custom tab.
- Each fixture can belong to only one group.
- **○ (Full)** — forces all fixtures in the group to 255 regardless of scene values.
- **✕ (Mute)** — silences all fixtures in the group.
- **Fader** — scales output proportionally (50% = half brightness).
- Groups reset to Full (100%) on every app launch — they are session controls, not saved state.

### Shows
A show file captures your entire rig: fixture definitions, scenes, group setup, and device settings.

- Shows are saved to **`~/Documents/Church Lights/`** as named JSON files — no file picker needed.
- Click **Shows** in the header to open, save, or manage shows.
- **+ New Show** clears all fixtures, scenes, and groups (device settings preserved).
- Share show files by copying the `.json` files from `~/Documents/Church Lights/`.

---

## Adding Fixtures

### From the Custom tab
Click **+ Add Fixtures** → select channels by range (`1-8`, `1,3,5`) or by clicking the channel grid → name each fixture → **Add Fixtures**.

### From the Full tab
Click any channel number on a fader to type a name. Named channels become fixtures in the Custom tab automatically.

---

## Settings (⚙)

| Setting | Description |
|---|---|
| **DMX Device** | Auto-detects USB serial devices. Click Refresh, then select your Enttec path. |
| **Output Port** | Which physical output port on the Mk2 (matches QLC+ outputs 1/2/3). |
| **Companion HTTP Port** | Default: 5551. Change only if another service uses that port. Restart required. |

---

## Bitfocus Companion Integration

Church Lights runs a local HTTP server that Companion can call to fire scenes.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/status` | Health check → `{ status: "ok" }` |
| `GET` | `/scenes` | List all scenes → `[{ id, name }]` |
| `POST` | `/scenes/:id/activate` | Activate a scene by slug ID |

### Setup in Companion

1. Add a button → action type: **Generic HTTP**
2. Method: `POST`
3. URL: `http://localhost:5551/scenes/<scene-slug>/activate`
4. The scene slug is shown in the Settings modal next to each scene name.

---

## Keyboard & Interaction Tips

| Action | How |
|---|---|
| Rename a fixture | Click the channel number or fixture name on any fader |
| Clear a fixture name | Rename to empty — removes the fixture |
| Reorder scenes | Drag a scene button left or right |
| Fire a scene | Click the scene button |
| All Off (Full tab) | Click **✕ All Off** — zeros all 512 channels on the active universe |

---

## Development

### Prerequisites

- Node.js 20+
- Xcode Command Line Tools — `xcode-select --install` (required for native serialport)

### Commands

```bash
npm install          # install dependencies (also runs electron-rebuild)
npm run dev          # launch in development mode
npm test             # run test suite
npm run build:mac    # build distributable .dmg files
```

Output DMGs: `dist-electron/Church Lights-<version>[-arm64].dmg`

### Project Structure

```
electron/
  main/index.ts         Electron entry, BrowserWindow, IPC wiring
  preload/index.ts      contextBridge — typed window.electronAPI
  dmx.ts                DmxManager — hardware + group multipliers
  server.ts             Express — Companion HTTP server
  store.ts              electron-store — config persistence
  ipc.ts                ipcMain handlers
  shows-library.ts      Named show file read/write
  slug.ts               Scene ID slug generation

src/
  shared/
    types.ts            Domain types — Fixture, Scene, Group, Config
    electron-api.d.ts   Window.electronAPI type declarations
  renderer/
    App.tsx             Root — header, show management, modal routing
    globals.css         CSS custom properties (design tokens)
    components/         Modal, Slider, RawFader, FixtureFader,
                        GroupFader, GroupStrip, GroupEditor,
                        ScenesStrip, CompanionModal, ShowsModal,
                        AddFixturesModal, ConnectionBadge
    views/              MainView, LiveView
    hooks/              useIpc, useDmxState
```

### Tech Stack

- [Electron](https://electronjs.org/) 28 + [electron-vite](https://electron-vite.org/) 2
- [React](https://react.dev/) 18 + TypeScript + CSS Modules
- [serialport](https://serialport.io/) for Enttec hardware communication
- [electron-store](https://github.com/sindresorhus/electron-store) for config persistence
- [Express](https://expressjs.com/) for Companion HTTP server
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)
