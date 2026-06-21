# Lightz

A macOS desktop app for controlling DMX lighting via an **Enttec USB DMX Pro Mk2**. Built for live environments — fast scene recall, DCA-style fixture groups, multi-channel fixtures with color mixing, and Bitfocus Companion integration.

**[Try the web demo →](https://lightz.benapps.xyz)** — no download needed, includes a light visualizer with a pre-loaded demo show.

> **macOS only** for hardware control. The web version is a portfolio demo with a simulated light visualizer.

---

## Download & Install

### Option A — Build from source (recommended for now)

```bash
git clone https://github.com/bhdoggett/lightz.git
cd lightz
npm install
npm run build:mac
```

Open `dist-electron/Lightz-0.2.0-arm64.dmg` (Apple Silicon) or `Lightz-0.2.0.dmg` (Intel) from Finder. Drag **Lightz** to Applications.

### Option B — Download pre-built .dmg

**[→ All releases](https://github.com/bhdoggett/lightz/releases)**

Download the right file for your Mac:

| Download                                                                                                      | For                         |
| ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| [Lightz-0.2.0-arm64.dmg](https://github.com/bhdoggett/lightz/releases/download/v0.2.0/Lightz-0.2.0-arm64.dmg) | Apple Silicon (M1/M2/M3/M4) |
| [Lightz-0.2.0.dmg](https://github.com/bhdoggett/lightz/releases/download/v0.2.0/Lightz-0.2.0.dmg)             | Intel Mac                   |

Double-click the `.dmg`, drag Lightz to Applications, then open it. macOS may prompt you in **System Settings → Privacy & Security** on first launch — click **Open Anyway**.

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
2. Open Lightz.
3. Click the **Settings** icon (top right).
4. Under **DMX Device**, click **↺ Refresh** — your device should appear as `/dev/cu.usbmodem...`.
5. Click the device path to select it, then click **Connect**.
6. The connection badge in the header turns green: **DMX Connected**.

---

## Core Concepts

### Full tab — raw channel control

Both DMX universes are displayed as stacked, collapsible sections (Universe 1 above Universe 2). Use this for initial patching and diagnosing which channel controls which fixture. Channel labels show universe-prefixed numbers (e.g. `1-001`, `2-001`). Click a channel label to name it — named channels become fixtures in the Custom tab automatically.

### Custom tab — named fixture control

Your labeled fixtures appear here, grouped by universe and collapsible. Use this during a service. Sections (Scenes, Groups, Fixtures) can be collapsed to reclaim screen space.

### Scenes

A scene is a snapshot of all fixture values at a moment in time.

- **Save Scene** — click **+ Save Scene** to open a popover, type a name and optional fade duration, click Save.
- **Activate** — click a scene button to fade or snap all fixtures to those values.
- **Edit** — select a scene, click **Edit** to rename, change fade time, or delete.
- **Drag to reorder** — drag scene buttons left/right to rearrange.

### Groups (DCA-style)

Groups work like a soundboard DCA — a master control that scales a set of fixtures together.

- Create a group via **+ Group** in the Custom tab.
- Each fixture can belong to only one group. The group color appears on the master fader fill and as an indicator dot on sub-faders.
- **○ (Full)** — forces all fixtures in the group to 255 regardless of scene values.
- **✕ (Mute)** — silences all fixtures in the group.
- **Fader** — scales output proportionally (50% = half brightness).
- Groups reset to 100% on every app launch — they are session controls, not saved state.

### Kill Switch

**✕ All Off** is always visible in the tab bar. Clicking it zeros all 512 channels on both universes immediately and clears the active scene.

### Shows

A show file captures your entire rig: fixture definitions, scenes, group setup, and device settings.

- Shows are saved to **`~/Documents/Lightz/`** as named JSON files — no file picker needed.
- Click **Shows** in the header to open, save, or manage shows.
- **+ New Show** clears all fixtures, scenes, and groups (device settings preserved).
- Share show files by copying the `.json` files from `~/Documents/Lightz/`.

---

## Adding Fixtures

### Single-channel fixtures (dimmers, simple pars)

**From the Custom tab:** Click **+ Add Channels** → select channels by range (`1-8`, `1,3,5`) or by clicking the channel grid → name each fixture → **Add Fixtures**.

**From the Full tab:** Click any channel label on a fader to type a name. Named channels become fixtures in the Custom tab automatically.

### Multi-channel custom fixtures (moving heads, RGB/RGBW pars, etc.)

Click **+ Add Custom Fixture** to open the fixture builder:

1. **Name** the fixture (becomes the master fader label).
2. Set the **Starting Channel** and **Universe**.
3. Add channels one by one — each channel has a **role** (Red, Green, Blue, Amber, White, UV, Dimmer, Strobe, Other) and a **label**.
4. **Link** toggles whether a channel follows the master fader. Linked channels scale together; unlinked channels are independent.
5. **Save as Template** to reuse this fixture layout for other fixtures of the same type.

Multi-channel fixtures appear in the Custom tab as a fader card with:

- **Master fader** — scales all linked sub-channels proportionally.
- **Color swatch / picker** — click to open an HSV color picker that drives the RGB, Amber channels together. White and UV channels are left untouched by the color picker and are controlled independently via their sub-faders.
- **⚙ Gear button** — reopens the fixture editor to rename, add/remove channels, or change roles.
- **Expand (›)** — reveals all individual sub-faders with role-colored fills (red, green, blue, etc.) and link toggles beneath each.
- **Link toggles** — click the chain icon below a sub-fader to unlink it from the master (e.g. to lock a strobe channel independently).

#### Color mixing behavior

- **RGB/RGBW:** The color picker controls Red, Green, Blue, and derives Amber from warm tones automatically.
- **White channel:** Lightens the displayed color toward white when raised — controlled only via its sub-fader, not the picker.
- **UV channel:** Contributes to the color display but is not set by the color picker — control it via its sub-fader.

---

## Settings

| Setting                 | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| **DMX Device**          | Auto-detects USB serial devices. Click Refresh, then select your Enttec path.   |
| **Output Port**         | Which physical output port on the Mk2 (matches QLC+ outputs 1/2/3).             |
| **Companion HTTP Port** | Default: 5551. Change only if another service uses that port. Restart required. |

---

## Bitfocus Companion Integration

Lightz runs a local HTTP server that Companion can call to fire scenes.

| Method | Endpoint               | Description                        |
| ------ | ---------------------- | ---------------------------------- |
| `GET`  | `/status`              | Health check → `{ status: "ok" }`  |
| `GET`  | `/scenes`              | List all scenes → `[{ id, name }]` |
| `POST` | `/scenes/:id/activate` | Activate a scene by slug ID        |

### Setup in Companion

1. Add a button → action type: **Generic HTTP**
2. Method: `POST`
3. URL: `http://localhost:5551/scenes/<scene-slug>/activate`
4. The scene slug is shown in the Settings modal next to each scene name.

---

## Keyboard & Interaction Tips

| Action                        | How                                                                      |
| ----------------------------- | ------------------------------------------------------------------------ |
| Rename a fixture              | Click the channel label or fixture name on any fader                     |
| Clear a fixture name          | Rename to empty — removes the fixture                                    |
| Reorder scenes                | Drag a scene button left or right                                        |
| Fire a scene                  | Click the scene button                                                   |
| All Off (kill switch)         | Click **✕ All Off** in the tab bar — zeros all channels on both universes |
| Open color picker             | Click the color swatch on a multi-channel fixture master fader           |
| Edit a custom fixture         | Click the ⚙ gear icon on the fixture master fader                       |
| Expand sub-faders             | Click the **›** arrow on a multi-channel fixture                         |
| Link/unlink a sub-fader       | Click the chain icon beneath the sub-fader label                        |
| Collapse a section            | Click the section header (Scenes, Groups, Universe 1, Universe 2, etc.) |

---

## Development

### Prerequisites

- Node.js 20+
- Xcode Command Line Tools — `xcode-select --install` (required for native serialport)

### Commands

```bash
npm install          # install dependencies (also runs electron-rebuild)
npm run dev          # launch Electron in development mode
npm run dev:web      # launch web version in browser (no Electron)
npm test             # run test suite
npm run build:mac    # build distributable .dmg files
npm run build:web    # build static web SPA to dist-web/
```

Output DMGs: `dist-electron/Lightz-<version>[-arm64].dmg`

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
    dmx-utils.ts        Shared interpolation and clamping math
    electron-api.d.ts   Window.electronAPI type declarations
  renderer/
    App.tsx             Root — header, show management, modal routing
    main.tsx            Electron entry — wraps App in ElectronApiProvider
    main-web.tsx        Web entry — wraps App in WebApiProvider with demo config
    globals.css         CSS custom properties (design tokens)
    api/
      types.ts          LightzApi interface — platform-agnostic API surface
      context.tsx       ApiContext + useApi() hook
      electron-provider Wraps window.electronAPI for Electron
      web-provider      In-memory store with demo config for web
      demo-config       Pre-loaded demo show data
    components/         Folder-per-component (ComponentName/index.ts barrel)
      LightVisualizer   2D stage visualizer with draggable lights, grid editor
      PopoutWindow      Renders children in a separate browser window
      RawFader          Base fader (value, slider, toggle, label)
      MultiFixtureFader Multi-channel fixture card with color picker
      ScenesStrip       Scene buttons row with save/edit popover
      GroupFader        DCA-style group master with ○/✕ overrides
      GroupStrip        Horizontal group rack
      ...               (19 components total)
    views/
      MainView          Tab bar, section layout, fixture/scene/group wiring
      LiveView          Full raw-channel view (both universes, collapsible)
    hooks/
      useDmxState       In-memory DMX channel state
    utils/
      colorSync         RGB/RGBW color math
      gangFader         Proportional ratio math for linked channel scaling

vite.web.config.ts      Standalone Vite config for web build
Dockerfile              Multi-stage build for Coolify deployment
```

### Tech Stack

- [Electron](https://electronjs.org/) 28 + [electron-vite](https://electron-vite.org/) 2
- [React](https://react.dev/) 18 + TypeScript + CSS Modules
- [react-colorful](https://github.com/omgovich/react-colorful) for HSV color picker
- [serialport](https://serialport.io/) for Enttec hardware communication
- [electron-store](https://github.com/sindresorhus/electron-store) for config persistence
- [Express](https://expressjs.com/) for Companion HTTP server
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)
