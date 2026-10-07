import { describe, expect, it } from 'vitest';
import {
  PAGE_COLOR_SWATCH_LIMIT,
  extractPageColorSwatches,
} from '../data/pageColorSwatches';
import type { ThemeTokens } from '../types/editor';

const baseTokens = {
  accent: '#111111',
  accentFg: '#222222',
  swatches: ['#333333', '#444444', '#555555', '#666666', '#777777'],
  page: {
    color: '#888888',
    fg: '#999999',
    muted: '#AAAAAA',
    surface: '#BBBBBB',
    line: '#CCCCCC',
  },
} as unknown as ThemeTokens;

describe('Magic page color swatches', () => {
  it('returns at most six colors', () => {
    expect(extractPageColorSwatches(baseTokens, {})).toHaveLength(PAGE_COLOR_SWATCH_LIMIT);
    expect(extractPageColorSwatches(baseTokens, {})).toEqual([
      '#111111',
      '#222222',
      '#888888',
      '#999999',
      '#AAAAAA',
      '#BBBBBB',
    ]);
  });

  it('normalizes equivalent HEX values and removes duplicates', () => {
    const result = extractPageColorSwatches(baseTokens, {
      accent: '#abc',
      accentFg: '#AABBCC',
      mutedColor: '#ABC',
      surfaceColor: '#111111',
    });

    expect(result).toContain('#AABBCC');
    expect(result.filter((color) => color === '#AABBCC')).toHaveLength(1);
    expect(result).not.toContain('#ABC');
  });

  it('ignores empty and non-HEX values', () => {
    const result = extractPageColorSwatches(baseTokens, {
      accent: '',
      accentFg: 'blue',
      mutedColor: 'color-mix(in srgb, #111111 50%, transparent)',
      surfaceColor: '#123456',
    });

    expect(result).not.toContain('');
    expect(result).not.toContain('BLUE');
    expect(result).not.toContain('color-mix(in srgb, #111111 50%, transparent)');
    expect(result[0]).toBe('#123456');
  });
});
