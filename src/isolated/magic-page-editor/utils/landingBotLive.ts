/**
 * DEV-ONLY bridge for the landing bot preview.
 *
 * The editor canvas always renders the assistant in "preview" mode (it never
 * talks to the backend) so editing stays offline and free. While developing on
 * localhost we still want to test the real assistant, so the production editor
 * host hands the current page `public_id` to this module and the canvas flips
 * its preview into "live" mode.
 *
 * Enabled ONLY when running a development build AND
 * `VITE_LANDING_BOT_LIVE_PREVIEW === "true"`. Production builds always resolve
 * to an empty id, so nothing changes in production.
 */
const ENV_KEY = "VITE_LANDING_BOT_LIVE_PREVIEW";

function runtimeEnv(): Record<string, unknown> {
  return (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};
}

export function landingBotLivePreviewEnabled(): boolean {
  const env = runtimeEnv();
  return env["DEV"] === true && env[ENV_KEY] === "true";
}

let previewPublicId = "";

/** Registered by the editor host; ignored unless the dev flag is enabled. */
export function setLandingBotPreviewPublicId(id: string | null | undefined): void {
  previewPublicId = landingBotLivePreviewEnabled() ? (id ?? "").trim() : "";
}

/** Empty string means "render the offline preview" (the production default). */
export function getLandingBotPreviewPublicId(): string {
  return previewPublicId;
}
