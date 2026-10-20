/**
 * CONV-03 · the provider rollback switch.
 *
 * The flag is not a toggle between two equal brains: it selects which ONE answers
 * a normal visitor turn. The only value that may degrade the product is the exact
 * string "local"; everything else — the canonical word, an empty value, a typo,
 * a missing variable — must land on the Conversion Advisor. A malformed switch
 * that silently resurrected the prototype would be a product regression that no
 * test of the happy path would ever catch, so the malformed cases are the point.
 */
import { describe, expect, it } from 'vitest';

import {
  LANDING_ASSISTANT_PROVIDER_KEY,
  resolveLandingAssistantProvider,
} from '../providerSelection';

describe('CONV-03 · VITE_LANDING_ASSISTANT_PROVIDER', () => {
  it('names the exact variable the environment documents', () => {
    expect(LANDING_ASSISTANT_PROVIDER_KEY).toBe('VITE_LANDING_ASSISTANT_PROVIDER');
  });

  it('selects the advisor when the flag is absent', () => {
    expect(resolveLandingAssistantProvider({})).toBe('advisor');
  });

  it('selects the advisor for the canonical value', () => {
    expect(
      resolveLandingAssistantProvider({ VITE_LANDING_ASSISTANT_PROVIDER: 'advisor' }),
    ).toBe('advisor');
  });

  it('selects the local prototype only for the exact rollback word', () => {
    expect(
      resolveLandingAssistantProvider({ VITE_LANDING_ASSISTANT_PROVIDER: 'local' }),
    ).toBe('local');
  });

  it.each([
    ['empty string', ''],
    ['whitespace', ' '],
    ['padded rollback word', ' local '],
    ['upper case', 'LOCAL'],
    ['title case', 'Local'],
    ['a truthy-looking value', 'true'],
    ['a typo', 'locl'],
    ['an unrelated word', 'remote'],
  ])('fails safe to the advisor for %s', (_label, value) => {
    expect(
      resolveLandingAssistantProvider({ VITE_LANDING_ASSISTANT_PROVIDER: value }),
    ).toBe('advisor');
  });

  it('fails safe for non-string values instead of throwing', () => {
    expect(
      resolveLandingAssistantProvider({ VITE_LANDING_ASSISTANT_PROVIDER: null }),
    ).toBe('advisor');
    expect(
      resolveLandingAssistantProvider({ VITE_LANDING_ASSISTANT_PROVIDER: 1 }),
    ).toBe('advisor');
    expect(
      resolveLandingAssistantProvider({ VITE_LANDING_ASSISTANT_PROVIDER: true }),
    ).toBe('advisor');
  });

  it('is a pure decision: the same environment always gives the same brain', () => {
    const environment = { VITE_LANDING_ASSISTANT_PROVIDER: 'advisor' };
    const decisions = Array.from({ length: 5 }, () =>
      resolveLandingAssistantProvider(environment),
    );
    expect(new Set(decisions)).toEqual(new Set(['advisor']));
  });
});
