import { createServerFn } from "@tanstack/react-start";
import type { PublicEntryRouteDecision } from "./publicEntryRouting";

/**
 * PHASE 3C — SERVER-ONLY boundary for the canonical public resolution.
 *
 * Why a server function instead of reading env inside the route loader:
 * route `loader`/`loaderDeps` run in the BROWSER too (client-side navigation),
 * so a `process.env` read there would be invisible to the client and the flag
 * would silently degrade. `createServerFn` keeps the whole decision — flag,
 * allowlist, resolver and Supabase port — strictly server-side: in the client
 * bundle TanStack replaces this `handler` with an RPC stub, so neither the
 * allowlist nor the variable NAMES reach the browser.
 *
 * Environment (Vercel → Production scope), deliberately WITHOUT the `VITE_`
 * prefix so Vite never inlines them into client assets:
 *   CANONICAL_PUBLIC_RESOLUTION_ENABLED   absent/false → OFF
 *   CANONICAL_PUBLIC_RESOLUTION_ALLOWLIST comma-separated identities (empty → nobody)
 */

export interface CanonicalPublicEntryIdentifier {
  kind: "legacy-profile-slug" | "legacy-profile-public-id";
  value: string;
}

export interface CanonicalPublicEntryInput {
  identifier: CanonicalPublicEntryIdentifier;
  /** Identities of THIS visit (profile public id and/or slug), already resolved. */
  identifiers: string[];
  /** Candidate tracking params; re-sanitised server-side before any redirect. */
  search?: Record<string, string>;
}

export type CanonicalPublicEntryResult =
  | { outcome: "decision"; decision: PublicEntryRouteDecision }
  | { outcome: "infrastructure-error"; message: string };

/** Thrown only when an allowlisted identity hits a real infrastructure error. */
export class CanonicalPublicEntryInfrastructureError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateInput(raw: unknown): CanonicalPublicEntryInput {
  if (!isRecord(raw)) throw new Error("Solicitud de resolución canónica inválida.");
  const identifier = raw["identifier"];
  if (!isRecord(identifier)) throw new Error("Identificador de entrada inválido.");
  const kind = identifier["kind"];
  const value = identifier["value"];
  if (kind !== "legacy-profile-slug" && kind !== "legacy-profile-public-id") {
    throw new Error("Tipo de identificador de entrada inválido.");
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Identificador de entrada vacío.");
  }

  const identifiers = Array.isArray(raw["identifiers"])
    ? raw["identifiers"]
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  const search = isRecord(raw["search"])
    ? Object.fromEntries(
        Object.entries(raw["search"])
          .filter(([, entry]) => typeof entry === "string")
          .slice(0, 20),
      )
    : undefined;

  return { identifier: { kind, value: value.trim() }, identifiers, search };
}

export const resolveCanonicalPublicEntryFn = createServerFn({ method: "POST" })
  .validator(validateInput)
  .handler(async ({ data }): Promise<CanonicalPublicEntryResult> => {
    const env = typeof process === "undefined" ? undefined : process.env;

    // Everything env-related stays INSIDE the handler: this body is stripped
    // from the client bundle, so the variable names never ship to the browser.
    const { isCanonicalPublicResolutionEnabled } = await import("./canonicalPublicResolutionGate");
    const enabled = isCanonicalPublicResolutionEnabled({
      flagValue: env?.["CANONICAL_PUBLIC_RESOLUTION_ENABLED"],
      allowlistValue: env?.["CANONICAL_PUBLIC_RESOLUTION_ALLOWLIST"],
      identifiers: data.identifiers,
    });

    const { decidePublicEntryRoute, pickTrackingSearch } = await import("./publicEntryRouting");

    if (!enabled) {
      // Flag OFF (default) or identity not allowlisted: constant answer. The
      // port factory below is a tripwire — if it were ever built, it would
      // throw, proving there is no extra query and today's behaviour is intact.
      return {
        outcome: "decision",
        decision: decidePublicEntryRoute({
          enabled: false,
          identifier: data.identifier,
          createPort: () => {
            throw new Error("Canonical public page port must not be built while disabled.");
          },
        }),
      };
    }

    try {
      const { getCanonicalPublicPagePort } = await import("./canonicalPublicPagePort.server");
      const decision = await decidePublicEntryRoute({
        enabled: true,
        identifier: data.identifier,
        createPort: getCanonicalPublicPagePort,
        // Never trust the client payload: only whitelisted tracking keys pass.
        search: pickTrackingSearch(data.search),
      });
      return { outcome: "decision", decision };
    } catch (error) {
      // Explicit, never a silent fallback to a possibly wrong public landing.
      return {
        outcome: "infrastructure-error",
        message: error instanceof Error ? error.message : "Canonical public resolution failed.",
      };
    }
  });

/**
 * Client-safe wrapper used by the public routes. A transport/serverless failure
 * (the RPC itself failing) falls back to the CURRENT behaviour — `render-legacy`
 * — so the legacy flow continues and the visitor never sees a blank page. An
 * infrastructure error reported by the server, which can only happen for an
 * allowlisted identity, is rethrown: those profiles must fail loudly.
 */
export async function requestCanonicalPublicEntry(
  data: CanonicalPublicEntryInput,
): Promise<PublicEntryRouteDecision> {
  let result: CanonicalPublicEntryResult;
  try {
    result = await resolveCanonicalPublicEntryFn({ data });
  } catch {
    return { kind: "render-legacy" };
  }
  if (result.outcome === "infrastructure-error") {
    throw new CanonicalPublicEntryInfrastructureError(result.message);
  }
  return result.decision;
}
