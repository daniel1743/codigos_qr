import type { CardPaletteValues, PalettePreset } from '../types/editor';

/**
 * Shared Magic landing palettes. They are optional PageDoc props, so legacy
 * pages keep their theme.
 *
 * V2 — expanded visual vocabulary for a 20+ template gallery. The six original
 * ids (cream, caramel, black, teal, sage, silver) remain valid for backward
 * compatibility: existing saved pages resolve against the same ids and never
 * silently remap to a different look.
 *
 * `cream` was redesigned to read clearly distinct from `caramel` (cream is a
 * warm ivory editorial neutral with a muted olive accent; caramel stays a
 * deeper bronze skin-tone with a stronger cocoa accent and darker page bg).
 */
export const visualPalettes: PalettePreset[] = [
  {
    id: 'cream', label: 'Warm Cream', accent: '#8A7A5B', accentFg: '#FBF6EE',
    swatches: ['#3A3329', '#8A7A5B', '#C9B99C', '#F4EDE2', '#FBF8F1'],
    page: { id: 'warm-cream', label: 'Warm Cream', color: '#FBF8F1', fg: '#3A3329', muted: '#8A7A5B', surface: '#FFFFFF', line: '#E6DECE' }
  },
  {
    id: 'black', label: 'Luxury Black', accent: '#D4AF6A', accentFg: '#0B0A09',
    swatches: ['#0E0D0C', '#2B221B', '#D4AF6A', '#BFAE96', '#F4EBDD'],
    page: { id: 'luxury-black', label: 'Luxury Black', color: '#0E0D0C', fg: '#E9DCC6', muted: '#BFAE96', surface: '#161412', line: '#3A2F24' }
  },
  {
    id: 'teal', label: 'Deep Teal', accent: '#E4D2B5', accentFg: '#1F4E57',
    swatches: ['#1F4E57', '#2B6570', '#E4D2B5', '#C9DAD9', '#F7F0E6'],
    page: { id: 'deep-teal', label: 'Deep Teal', color: '#1F4E57', fg: '#F7F0E6', muted: '#C9DAD9', surface: '#2B6570', line: '#2E626C' }
  },
  {
    id: 'sage', label: 'Sage Editorial', accent: '#6B7A4E', accentFg: '#FFFFFF',
    swatches: ['#111111', '#545D50', '#6B7A4E', '#EEF2EA', '#FFFFFF'],
    page: { id: 'sage-editorial', label: 'Sage Editorial', color: '#545D50', fg: '#FFFFFF', muted: '#EEF2EA', surface: '#6B7A4E', line: '#8F9B85' }
  },
  {
    id: 'silver', label: 'Silver Minimal', accent: '#3A3D44', accentFg: '#FFFFFF',
    swatches: ['#121316', '#50545C', '#3A3D44', '#E3E5EA', '#F5F6F8'],
    page: { id: 'silver-minimal', label: 'Silver Minimal', color: '#F5F6F8', fg: '#121316', muted: '#50545C', surface: '#E3E5EA', line: '#D2D5DB' }
  },
  {
    id: 'caramel', label: 'Caramel Beauty', accent: '#B98A5A', accentFg: '#F3E3CD',
    swatches: ['#3B2618', '#6E4F3A', '#B98A5A', '#F3E6D8', '#F7EEE4'],
    page: { id: 'caramel-beauty', label: 'Caramel Beauty', color: '#6E4F3A', fg: '#F7EEE4', muted: '#F3E6D8', surface: '#B98A5A', line: '#966E53' }
  },
  {
    id: 'red-energy', label: 'Red Energy', accent: '#FFFFFF', accentFg: '#E2312F',
    swatches: ['#7A0F12', '#C02026', '#E2312F', '#F9E3E1', '#FFFFFF'],
    page: { id: 'red-energy', label: 'Red Energy', color: '#C02026', fg: '#FFFFFF', muted: '#F9E3E1', surface: '#E2312F', line: '#E2312F' }
  },
  {
    id: 'amber-sunny', label: 'Amber Sunny', accent: '#E8A012', accentFg: '#2A1A00',
    swatches: ['#3A2A00', '#9A6B00', '#E8A012', '#FFE7B3', '#FFFBEF'],
    page: { id: 'amber-sunny', label: 'Amber Sunny', color: '#FFFBEF', fg: '#3A2A00', muted: '#9A6B00', surface: '#FFE7B3', line: '#F2E3C0' }
  },
  {
    id: 'lavender-soft', label: 'Lavender Soft', accent: '#8B6CC4', accentFg: '#FFFFFF',
    swatches: ['#32243F', '#6A4B8E', '#8B6CC4', '#EFE7F8', '#FBF8FE'],
    page: { id: 'lavender-soft', label: 'Lavender Soft', color: '#FBF8FE', fg: '#32243F', muted: '#6A4B8E', surface: '#EFE7F8', line: '#E9DFF3' }
  },
  {
    id: 'purple-editorial', label: 'Purple Editorial', accent: '#C9B8EE', accentFg: '#1B1233',
    swatches: ['#1B1233', '#3C256E', '#5B3FA6', '#C9B8EE', '#F3EEFB'],
    page: { id: 'purple-editorial', label: 'Purple Editorial', color: '#1B1233', fg: '#F3EEFB', muted: '#C9B8EE', surface: '#3C256E', line: '#5B3FA6' }
  },
  {
    id: 'cyan-electric', label: 'Cyan Electric', accent: '#0EA5C4', accentFg: '#FFFFFF',
    swatches: ['#0A2A33', '#0B7A94', '#0EA5C4', '#D2F0F6', '#F5FCFD'],
    page: { id: 'cyan-electric', label: 'Cyan Electric', color: '#0A2A33', fg: '#F5FCFD', muted: '#D2F0F6', surface: '#0B7A94', line: '#14414D' }
  },
  {
    id: 'mono-editorial', label: 'Mono Editorial', accent: '#111111', accentFg: '#FFFFFF',
    swatches: ['#000000', '#222222', '#111111', '#E8E8E8', '#FFFFFF'],
    page: { id: 'mono-editorial', label: 'Mono Editorial', color: '#FFFFFF', fg: '#111111', muted: '#5A5A5A', surface: '#F4F4F4', line: '#E8E8E8' }
  },
  {
    id: 'ice-blue', label: 'Ice Blue', accent: '#3B82C4', accentFg: '#FFFFFF',
    swatches: ['#0E2A44', '#1F5A8A', '#3B82C4', '#DDEBF7', '#F7FBFE'],
    page: { id: 'ice-blue', label: 'Ice Blue', color: '#F7FBFE', fg: '#0E2A44', muted: '#3B82C4', surface: '#DDEBF7', line: '#D6E6F2' }
  },
  {
    id: 'emerald-deep', label: 'Emerald Deep', accent: '#EDF7F1', accentFg: '#0E6A52',
    swatches: ['#0A2720', '#0E4A3A', '#0E6A52', '#C7E6D8', '#F2FAF6'],
    page: { id: 'emerald-deep', label: 'Emerald Deep', color: '#0A2720', fg: '#F2FAF6', muted: '#C7E6D8', surface: '#0E4A3A', line: '#0E6A52' }
  },
  {
    id: 'terracotta', label: 'Terracotta Earth', accent: '#B8552F', accentFg: '#FBF3EB',
    swatches: ['#3A1E12', '#7A3A22', '#B8552F', '#EFC5AD', '#FBF3EB'],
    page: { id: 'terracotta', label: 'Terracotta Earth', color: '#FBF3EB', fg: '#3A1E12', muted: '#B8552F', surface: '#EFC5AD', line: '#EBCEBE' }
  },
  {
    id: 'neon-dark', label: 'Neon Dark', accent: '#22E5B2', accentFg: '#04100C',
    swatches: ['#060B12', '#0E1824', '#22E5B2', '#9BF0D8', '#16425A'],
    page: { id: 'neon-dark', label: 'Neon Dark', color: '#060B12', fg: '#D8E6F0', muted: '#8FA8BC', surface: '#0E1824', line: '#1E3246' }
  }
];

export const visualPaletteById = Object.fromEntries(visualPalettes.map((palette) => [palette.id, palette]));

/** Card-scoped tokens for every named visual direction. */
export const cardPaletteTokens: Record<string, CardPaletteValues> = {
  cream: {
    cardBg: '#FFFFFF', cardSurface: '#F4EDE2', cardText: '#3A3329', cardMuted: '#8A7A5B',
    cardLine: '#E6DECE', cardAccent: '#8A7A5B', cardAccentFg: '#FBF6EE', cardIconBg: '#F4EDE2', cardIconColor: '#6D5F45'
  },
  black: {
    cardBg: '#161412', cardSurface: '#1F1A15', cardText: '#F4EBDD', cardMuted: '#BFAE96',
    cardLine: '#3A2F24', cardAccent: '#D4AF6A', cardAccentFg: '#0B0A09', cardIconBg: '#1F1A15', cardIconColor: '#D4AF6A'
  },
  teal: {
    cardBg: '#2B6570', cardSurface: '#F7F0E6', cardText: '#1F4E57', cardMuted: '#5B777A',
    cardLine: '#2E626C', cardAccent: '#E4D2B5', cardAccentFg: '#1F4E57', cardIconBg: '#F7F0E6', cardIconColor: '#1F4E57'
  },
  sage: {
    cardBg: '#FFFFFF', cardSurface: '#EEF2EA', cardText: '#111111', cardMuted: '#545D50',
    cardLine: '#E3E8DF', cardAccent: '#6B7A4E', cardAccentFg: '#FFFFFF', cardIconBg: '#EEF2EA', cardIconColor: '#3F4A2E'
  },
  silver: {
    cardBg: '#F5F6F8', cardSurface: '#E3E5EA', cardText: '#121316', cardMuted: '#50545C',
    cardLine: '#D2D5DB', cardAccent: '#3A3D44', cardAccentFg: '#FFFFFF', cardIconBg: '#2A2C31', cardIconColor: '#FFFFFF'
  },
  caramel: {
    cardBg: '#F7EEE4', cardSurface: '#F3E6D8', cardText: '#3B2618', cardMuted: '#6E4F3A',
    cardLine: '#E4D2BF', cardAccent: '#B98A5A', cardAccentFg: '#F3E3CD', cardIconBg: '#F3E6D8', cardIconColor: '#7E5332'
  },
  'red-energy': {
    cardBg: '#FFFFFF', cardSurface: '#F9E3E1', cardText: '#3A1214', cardMuted: '#8A3B3C',
    cardLine: '#F0D4D1', cardAccent: '#E2312F', cardAccentFg: '#FFFFFF', cardIconBg: '#F9E3E1', cardIconColor: '#C02026'
  },
  'amber-sunny': {
    cardBg: '#FFFFFF', cardSurface: '#FFE7B3', cardText: '#3A2A00', cardMuted: '#8A6410',
    cardLine: '#F2E3C0', cardAccent: '#E8A012', cardAccentFg: '#2A1A00', cardIconBg: '#FFE7B3', cardIconColor: '#9A6B00'
  },
  'lavender-soft': {
    cardBg: '#FFFFFF', cardSurface: '#EFE7F8', cardText: '#32243F', cardMuted: '#6A4B8E',
    cardLine: '#E9DFF3', cardAccent: '#8B6CC4', cardAccentFg: '#FFFFFF', cardIconBg: '#EFE7F8', cardIconColor: '#6A4B8E'
  },
  'purple-editorial': {
    cardBg: '#FFFFFF', cardSurface: '#C9B8EE', cardText: '#1B1233', cardMuted: '#5B4A7A',
    cardLine: '#DDD1F0', cardAccent: '#5B3FA6', cardAccentFg: '#F4EFFC', cardIconBg: '#C9B8EE', cardIconColor: '#3C256E'
  },
  'cyan-electric': {
    cardBg: '#FFFFFF', cardSurface: '#D2F0F6', cardText: '#0A2A33', cardMuted: '#0B6A80',
    cardLine: '#CBEAF1', cardAccent: '#0EA5C4', cardAccentFg: '#FFFFFF', cardIconBg: '#D2F0F6', cardIconColor: '#0B7A94'
  },
  'mono-editorial': {
    cardBg: '#FFFFFF', cardSurface: '#F4F4F4', cardText: '#111111', cardMuted: '#5A5A5A',
    cardLine: '#101010', cardAccent: '#111111', cardAccentFg: '#FFFFFF', cardIconBg: '#F4F4F4', cardIconColor: '#111111'
  },
  'ice-blue': {
    cardBg: '#FFFFFF', cardSurface: '#DDEBF7', cardText: '#0E2A44', cardMuted: '#3A6B96',
    cardLine: '#D6E6F2', cardAccent: '#3B82C4', cardAccentFg: '#FFFFFF', cardIconBg: '#DDEBF7', cardIconColor: '#1F5A8A'
  },
  'emerald-deep': {
    cardBg: '#FFFFFF', cardSurface: '#C7E6D8', cardText: '#0A2720', cardMuted: '#2E6B58',
    cardLine: '#D4E9DF', cardAccent: '#0E6A52', cardAccentFg: '#EDF7F1', cardIconBg: '#C7E6D8', cardIconColor: '#0E4A3A'
  },
  terracotta: {
    cardBg: '#FFFFFF', cardSurface: '#EFC5AD', cardText: '#3A1E12', cardMuted: '#8A4A30',
    cardLine: '#EBCEBE', cardAccent: '#B8552F', cardAccentFg: '#FBF3EB', cardIconBg: '#EFC5AD', cardIconColor: '#7A3A22'
  },
  'neon-dark': {
    cardBg: '#0E1824', cardSurface: '#121E2E', cardText: '#D8E6F0', cardMuted: '#8FA8BC',
    cardLine: '#1E3246', cardAccent: '#22E5B2', cardAccentFg: '#04100C', cardIconBg: '#121E2E', cardIconColor: '#22E5B2'
  }
};
