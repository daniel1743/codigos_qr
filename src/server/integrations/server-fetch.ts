import "@tanstack/react-start/server-only";

export type ServerIntegrationSecretName =
  "PEXELS_API_KEY" | "UNSPLASH_ACCESS_KEY" | "DEEPSEEK_API_KEY";

const SERVER_INTEGRATION_ENV_NAMES: Record<ServerIntegrationSecretName, string> = {
  PEXELS_API_KEY: "PEXELS_API_KEY",
  UNSPLASH_ACCESS_KEY: "UNSPLASH_ACCESS_KEY",
  DEEPSEEK_API_KEY: "DEEPSEEK_API_KEY",
};

/** Reads future provider secrets from server env only; never import.meta.env. */
export function getServerIntegrationSecret(name: ServerIntegrationSecretName): string | undefined {
  const envName = SERVER_INTEGRATION_ENV_NAMES[name];
  const value = process.env[envName];
  return value?.trim() || undefined;
}

/** Provider-neutral server fetch seam for future Engine integrations. */
export async function fetchServerIntegration(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, init);
}
