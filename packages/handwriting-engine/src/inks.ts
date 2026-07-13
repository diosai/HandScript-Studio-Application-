import type { InkConfig, InkPresetId } from '@handscript/shared';

/** Built-in pen/ink presets consumed by the SVG renderer's filter pipeline. */
const INKS: Record<InkPresetId, InkConfig> = {
  'blue-ballpoint': {
    id: 'blue-ballpoint',
    label: 'Blue ballpoint',
    color: '#1a3a8f',
    opacity: 0.92,
    strokeWidth: 0.05,
    spread: 0.15,
    pressureVariance: 0.35,
    texture: 0.3,
    dryness: 0.15,
  },
  'black-ballpoint': {
    id: 'black-ballpoint',
    label: 'Black ballpoint',
    color: '#1c1c22',
    opacity: 0.94,
    strokeWidth: 0.05,
    spread: 0.12,
    pressureVariance: 0.3,
    texture: 0.3,
    dryness: 0.15,
  },
  'red-ballpoint': {
    id: 'red-ballpoint',
    label: 'Red ballpoint',
    color: '#b0221f',
    opacity: 0.9,
    strokeWidth: 0.05,
    spread: 0.15,
    pressureVariance: 0.35,
    texture: 0.3,
    dryness: 0.2,
  },
  'green-ballpoint': {
    id: 'green-ballpoint',
    label: 'Green ballpoint',
    color: '#1c6b32',
    opacity: 0.9,
    strokeWidth: 0.05,
    spread: 0.15,
    pressureVariance: 0.35,
    texture: 0.3,
    dryness: 0.2,
  },
  pencil: {
    id: 'pencil',
    label: 'Pencil (HB)',
    color: '#4a4a52',
    opacity: 0.68,
    strokeWidth: 0.02,
    spread: 0.05,
    pressureVariance: 0.5,
    texture: 0.7,
    dryness: 0.35,
  },
  'fountain-pen': {
    id: 'fountain-pen',
    label: 'Fountain pen',
    color: '#14265c',
    opacity: 0.88,
    strokeWidth: 0.09,
    spread: 0.4,
    pressureVariance: 0.55,
    texture: 0.25,
    dryness: 0.1,
  },
  'gel-pen': {
    id: 'gel-pen',
    label: 'Gel pen',
    color: '#101018',
    opacity: 0.98,
    strokeWidth: 0.07,
    spread: 0.2,
    pressureVariance: 0.2,
    texture: 0.1,
    dryness: 0.05,
  },
};

export function getInk(id: InkPresetId): InkConfig {
  return INKS[id];
}

export function listInks(): InkConfig[] {
  return Object.values(INKS);
}
