export const SAFE_GENERATION_FAILURE =
  "No pudimos crear tu página todavía. Tus datos siguen aquí. Revisa la información o inténtalo nuevamente.";

/** Converts transport/framework failures into safe user-facing copy. */
export function sanitizeGenerationError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = raw
    .replace(/<!doctype[\s\S]*$/i, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (
    !normalized ||
    /this page didn't load|something went wrong on our end|_serverfn|server function|stack trace|failed to fetch|networkerror/i.test(
      raw,
    ) ||
    /<[a-z!/]/i.test(raw)
  ) {
    return SAFE_GENERATION_FAILURE;
  }
  return normalized.slice(0, 280);
}
