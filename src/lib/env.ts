export function getEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is missing or empty.`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return getEnv("VITE_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return getEnv("VITE_SUPABASE_ANON_KEY");
  },
  get appUrl() {
    return getEnv("VITE_APP_URL");
  },
};

/**
 * Onboarding V2 remains an internal QA surface until a separately authorized
 * release. The flag is intentionally opt-in: an absent or malformed value is
 * disabled in every environment.
 */
export function isOnboardingV2Enabled(
  environment: { readonly VITE_ENABLE_ONBOARDING_V2?: unknown } = import.meta.env,
): boolean {
  return environment["VITE_ENABLE_ONBOARDING_V2"] === "true";
}

export function requireOnboardingV2Enabled(): void {
  if (!isOnboardingV2Enabled()) {
    throw new Error("Onboarding V2 is disabled.");
  }
}
