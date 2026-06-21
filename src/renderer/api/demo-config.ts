import type { Config } from '../../shared/types'

export const demoConfig: Config = {
  fixtures: [
    { id: 'front-wash-l', name: 'Front Wash L', channel: 1, universe: 0, type: 'dimmer', vizX: 30, vizY: 75 },
    { id: 'front-wash-r', name: 'Front Wash R', channel: 2, universe: 0, type: 'dimmer', vizX: 70, vizY: 75 },
    { id: 'back-wash', name: 'Back Wash', channel: 3, universe: 0, type: 'dimmer', vizX: 50, vizY: 10 },
    { id: 'side-fill-l', name: 'Side Fill L', channel: 4, universe: 0, type: 'dimmer', vizX: 10, vizY: 45 },
    { id: 'side-fill-r', name: 'Side Fill R', channel: 5, universe: 0, type: 'dimmer', vizX: 90, vizY: 45 },
    {
      id: 'rgb-par-l', name: 'RGB Par L', channel: 10, universe: 0, type: 'dimmer', vizX: 25, vizY: 30,
      channels: [
        { id: 'rgb-par-l-r', role: 'red', label: 'Red', channel: 10, universe: 0, linked: true },
        { id: 'rgb-par-l-g', role: 'green', label: 'Green', channel: 11, universe: 0, linked: true },
        { id: 'rgb-par-l-b', role: 'blue', label: 'Blue', channel: 12, universe: 0, linked: true },
        { id: 'rgb-par-l-d', role: 'dimmer', label: 'Dimmer', channel: 13, universe: 0, linked: false },
      ],
    },
    {
      id: 'rgb-par-r', name: 'RGB Par R', channel: 14, universe: 0, type: 'dimmer', vizX: 75, vizY: 30,
      channels: [
        { id: 'rgb-par-r-r', role: 'red', label: 'Red', channel: 14, universe: 0, linked: true },
        { id: 'rgb-par-r-g', role: 'green', label: 'Green', channel: 15, universe: 0, linked: true },
        { id: 'rgb-par-r-b', role: 'blue', label: 'Blue', channel: 16, universe: 0, linked: true },
        { id: 'rgb-par-r-d', role: 'dimmer', label: 'Dimmer', channel: 17, universe: 0, linked: false },
      ],
    },
    {
      id: 'rgbw-spot', name: 'RGBW Spot C', channel: 20, universe: 1, type: 'dimmer', vizX: 50, vizY: 45,
      channels: [
        { id: 'rgbw-spot-r', role: 'red', label: 'Red', channel: 20, universe: 1, linked: true },
        { id: 'rgbw-spot-g', role: 'green', label: 'Green', channel: 21, universe: 1, linked: true },
        { id: 'rgbw-spot-b', role: 'blue', label: 'Blue', channel: 22, universe: 1, linked: true },
        { id: 'rgbw-spot-w', role: 'white', label: 'White', channel: 23, universe: 1, linked: true },
        { id: 'rgbw-spot-d', role: 'dimmer', label: 'Dimmer', channel: 24, universe: 1, linked: false },
      ],
    },
  ],
  scenes: [
    {
      id: 'warm-wash', name: 'Warm Wash', fadeDuration: 2000,
      values: {
        'front-wash-l': 200, 'front-wash-r': 200, 'back-wash': 80,
        'side-fill-l': 120, 'side-fill-r': 120,
        'rgb-par-l-r': 255, 'rgb-par-l-g': 140, 'rgb-par-l-b': 30, 'rgb-par-l-d': 180,
        'rgb-par-r-r': 255, 'rgb-par-r-g': 140, 'rgb-par-r-b': 30, 'rgb-par-r-d': 180,
        'rgbw-spot-r': 200, 'rgbw-spot-g': 120, 'rgbw-spot-b': 40, 'rgbw-spot-w': 100, 'rgbw-spot-d': 200,
      },
    },
    {
      id: 'cool-blue', name: 'Cool Blue', fadeDuration: 3000,
      values: {
        'front-wash-l': 60, 'front-wash-r': 60, 'back-wash': 180,
        'side-fill-l': 40, 'side-fill-r': 40,
        'rgb-par-l-r': 20, 'rgb-par-l-g': 80, 'rgb-par-l-b': 255, 'rgb-par-l-d': 200,
        'rgb-par-r-r': 20, 'rgb-par-r-g': 80, 'rgb-par-r-b': 255, 'rgb-par-r-d': 200,
        'rgbw-spot-r': 30, 'rgbw-spot-g': 60, 'rgbw-spot-b': 220, 'rgbw-spot-w': 0, 'rgbw-spot-d': 220,
      },
    },
    {
      id: 'full-color', name: 'Full Color', fadeDuration: 1500,
      values: {
        'front-wash-l': 255, 'front-wash-r': 255, 'back-wash': 200,
        'side-fill-l': 180, 'side-fill-r': 180,
        'rgb-par-l-r': 255, 'rgb-par-l-g': 0, 'rgb-par-l-b': 200, 'rgb-par-l-d': 255,
        'rgb-par-r-r': 0, 'rgb-par-r-g': 255, 'rgb-par-r-b': 100, 'rgb-par-r-d': 255,
        'rgbw-spot-r': 255, 'rgbw-spot-g': 255, 'rgbw-spot-b': 255, 'rgbw-spot-w': 255, 'rgbw-spot-d': 255,
      },
    },
    {
      id: 'blackout', name: 'Blackout', fadeDuration: 500,
      values: {
        'front-wash-l': 0, 'front-wash-r': 0, 'back-wash': 0,
        'side-fill-l': 0, 'side-fill-r': 0,
        'rgb-par-l-r': 0, 'rgb-par-l-g': 0, 'rgb-par-l-b': 0, 'rgb-par-l-d': 0,
        'rgb-par-r-r': 0, 'rgb-par-r-g': 0, 'rgb-par-r-b': 0, 'rgb-par-r-d': 0,
        'rgbw-spot-r': 0, 'rgbw-spot-g': 0, 'rgbw-spot-b': 0, 'rgbw-spot-w': 0, 'rgbw-spot-d': 0,
      },
    },
  ],
  groups: [
    { id: 'front', name: 'Front', color: '#6366f1', fixtureIds: ['front-wash-l', 'front-wash-r'] },
    { id: 'color', name: 'Color', color: '#ec4899', fixtureIds: ['rgb-par-l', 'rgb-par-r', 'rgbw-spot'] },
  ],
  fixtureTemplates: [],
  companionPort: 5551,
  devicePath: '',
  dmxOutputPort: 0,
}
