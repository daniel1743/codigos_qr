/**
 * Landing Launch Lite V1 - typed activation flag.
 *
 * The public landing ships a *demonstrative* gallery: the sample designs stay
 * visible, but selecting one as a usable template is frozen until the premium
 * templates are certified in Magic Template Studio.
 *
 * The flag is intentionally fail-closed: only the exact string "false"
 * re-enables template selection, so an absent or malformed value keeps the
 * launch-safe behaviour in every environment.
 */
export const LANDING_TEMPLATE_SELECTION_FROZEN_KEY = "VITE_LANDING_TEMPLATE_SELECTION_FROZEN";

/** The only shape this module reads out of the Vite environment. */
type SelectionFlagEnvironment = {
  readonly VITE_LANDING_TEMPLATE_SELECTION_FROZEN?: unknown;
};

/**
 * `import.meta.env` is Vite's `ImportMetaEnv`, which declares no key in common
 * with the narrow shape read here, so it is narrowed explicitly instead of
 * widening the app's global env type (that file is shared).
 */
function viteEnvironment(): SelectionFlagEnvironment {
  return import.meta.env as unknown as SelectionFlagEnvironment;
}

export function isTemplateSelectionFrozen(
  environment: SelectionFlagEnvironment = viteEnvironment(),
): boolean {
  const value = environment[LANDING_TEMPLATE_SELECTION_FROZEN_KEY];
  if (value === undefined || value === null || value === "") return true;
  return value !== "false";
}
