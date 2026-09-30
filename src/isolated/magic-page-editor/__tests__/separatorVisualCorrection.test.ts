import { describe, expect, it } from 'vitest';
import { resolveSeparatorStyle } from '../components/blocks/SeparatorBlock';

describe('separator visual correction', () => {
  it('defaults new separators to a minimal line', () => {
    expect(resolveSeparatorStyle({})).toBe('minimal');
  });

  it('preserves legacy spacing-only separators', () => {
    expect(resolveSeparatorStyle({ lineStyle: 'none' })).toBe('spacing-only');
  });

  it('accepts all premium visual presets without changing the block contract', () => {
    for (const style of ['minimal', 'editorial', 'luxury', 'double', 'dot-center', 'fade', 'organic', 'spacing-only']) {
      expect(resolveSeparatorStyle({ separatorStyle: style })).toBe(style);
    }
  });
});
