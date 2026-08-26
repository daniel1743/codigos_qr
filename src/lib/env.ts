export function getEnv(name: string): string {
  const value =
    (typeof process !== "undefined" ? process.env[name] : undefined) ||
    import.meta.env?.[name];
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
