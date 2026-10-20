/*
 * CONV-03 · which brain answers a normal visitor turn.
 *
 * The flag is a ROLLBACK SWITCH, not a feature toggle. There is exactly one
 * value that selects the prototype rule set — the exact string "local" — and
 * everything else, including a typo, an empty value or a missing variable,
 * resolves to the Conversion Advisor. A malformed switch must never silently
 * downgrade the product to the old brain.
 *
 * The decision is resolved ONCE per session, when the AssistantService is
 * constructed. A turn cannot see two providers, and the local brain cannot wake
 * up after an Advisor failure: the facade's fallback is a safe sentence, not a
 * second provider.
 */

export const LANDING_ASSISTANT_PROVIDER_KEY = 'VITE_LANDING_ASSISTANT_PROVIDER';

export type LandingAssistantProviderKind = 'advisor' | 'local';

/** The only shape this module reads out of the Vite environment. */
type ProviderFlagEnvironment = {
  readonly VITE_LANDING_ASSISTANT_PROVIDER?: unknown;
};

function viteEnvironment(): ProviderFlagEnvironment {
  // `import.meta.env` is Vite's `ImportMetaEnv`, which declares no key in common
  // with the narrow shape read here, so it is narrowed explicitly instead of
  // widening the app's global env type.
  return import.meta.env as unknown as ProviderFlagEnvironment;
}

export function resolveLandingAssistantProvider(
  environment: ProviderFlagEnvironment = viteEnvironment(),
): LandingAssistantProviderKind {
  const value = environment[LANDING_ASSISTANT_PROVIDER_KEY];
  // Only the exact rollback word selects the prototype. Everything else — the
  // canonical "advisor", an absent flag, or garbage — stays on the Advisor.
  return value === 'local' ? 'local' : 'advisor';
}
