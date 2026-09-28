import type { PalettePreset } from '../types/editor';

/** Shared M1 palettes. They are optional PageDoc props, so legacy pages keep their theme. */
export const visualPalettes: PalettePreset[] = [
  {
    id: 'cream', label: 'Warm Cream', accent: '#B8935A', accentFg: '#F6EBD9',
    swatches: ['#3A2A1E', '#6F5A48', '#B8935A', '#EFE3D1', '#FBF7F0'],
    page: { id: 'warm-cream', label: 'Warm Cream', color: '#F4EFE7', fg: '#3A2A1E', muted: '#6F5A48', surface: '#FBF7F0', line: '#E6D9C6' }
  },
  {
    id: 'black', label: 'Luxury Black', accent: '#D4AF6A', accentFg: '#0B0A09',
    swatches: ['#0E0D0C', '#2B221B', '#D4AF6A', '#BFAE96', '#F4EBDD'],
    page: { id: 'luxury-black', label: 'Luxury Black', color: '#0E0D0C', fg: '#E9DCC6', muted: '#BFAE96', surface: '#161412', line: '#3A2F24' }
  },
  {
    id: 'teal', label: 'Deep Teal', accent: '#E4D2B5', accentFg: '#1F4E57',
    swatches: ['#1F4E57', '#2B6570', '#E4D2B5', '#C9DAD9', '#F7F0E6'],
    page: { id: 'deep-teal', label: 'Deep Teal', color: '#F3ECE6', fg: '#1F4E57', muted: '#5B777A', surface: '#2B6570', line: '#2E626C' }
  },
  {
    id: 'sage', label: 'Sage Editorial', accent: '#6B7A4E', accentFg: '#FFFFFF',
    swatches: ['#111111', '#545D50', '#6B7A4E', '#EEF2EA', '#FFFFFF'],
    page: { id: 'sage-editorial', label: 'Sage Editorial', color: '#C2CFBC', fg: '#111111', muted: '#545D50', surface: '#FFFFFF', line: '#E3E8DF' }
  },
  {
    id: 'silver', label: 'Silver Minimal', accent: '#3A3D44', accentFg: '#FFFFFF',
    swatches: ['#121316', '#50545C', '#3A3D44', '#E3E5EA', '#F5F6F8'],
    page: { id: 'silver-minimal', label: 'Silver Minimal', color: '#D9DBE0', fg: '#121316', muted: '#50545C', surface: '#F5F6F8', line: '#D2D5DB' }
  },
  {
    id: 'caramel', label: 'Caramel Beauty', accent: '#B98A5A', accentFg: '#F3E3CD',
    swatches: ['#3B2618', '#6E4F3A', '#B98A5A', '#F3E6D8', '#F7EEE4'],
    page: { id: 'caramel-beauty', label: 'Caramel Beauty', color: '#E9D8C4', fg: '#3B2618', muted: '#6E4F3A', surface: '#F7EEE4', line: '#E4D2BF' }
  }
];

export const visualPaletteById = Object.fromEntries(visualPalettes.map((palette) => [palette.id, palette]));
