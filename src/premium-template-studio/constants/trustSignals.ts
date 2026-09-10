/**
 * CRIPQER — TRUST ("Confianza") SIGNAL CATALOG
 *
 * Canonical, pure definition of the trust signals a business may show. This is
 * the single source of truth for the Inspector picker, the renderer, and
 * validation. It contains no React and no network/DB calls.
 *
 * Policy invariants:
 *   - Maximum FOUR active signals (enforced in the UI and defensively in the
 *     renderer).
 *   - `verified_profile` is SYSTEM_ONLY: there is no user-facing verification
 *     authority, so it must never be self-enableable or emitted as a factual
 *     default.
 *   - Required inputs must hold a valid value before a signal may produce a
 *     public claim.
 */

import type { TrustBadge, TrustSignalType } from "../types";

export const MAX_TRUST_SIGNALS = 4;

export type TrustInputKind = "none" | "hours" | "rating" | "years" | "count" | "text";

export interface TrustSignalDefinition {
  readonly type: TrustSignalType;
  /** Spanish label shown in the picker. */
  readonly label: string;
  /** Lucide icon name used when rendering the signal chip. */
  readonly icon: string;
  /** Which value input (if any) the signal requires. */
  readonly input: TrustInputKind;
  /** SYSTEM_ONLY signals cannot be self-enabled by the user. */
  readonly systemOnly?: boolean;
}

/** Catalog order is the picker/display order (approx. 10 options). */
export const TRUST_SIGNAL_DEFINITIONS: readonly TrustSignalDefinition[] = [
  { type: "availability_24h", label: "Atención 24 h", icon: "Clock", input: "none" },
  { type: "response_time", label: "Respuesta rápida", icon: "MessageCircle", input: "hours" },
  { type: "rating", label: "Valoración", icon: "Star", input: "rating" },
  { type: "experience", label: "Años de experiencia", icon: "Calendar", input: "years" },
  { type: "customers_served", label: "Clientes atendidos", icon: "Sparkles", input: "count" },
  { type: "certification", label: "Certificación", icon: "ShieldCheck", input: "text" },
  { type: "award", label: "Premio o reconocimiento", icon: "Star", input: "text" },
  { type: "guarantee", label: "Garantía", icon: "ShieldCheck", input: "text" },
  { type: "local_business", label: "Negocio local", icon: "MapPin", input: "none" },
  {
    type: "verified_profile",
    label: "Perfil verificado",
    icon: "BadgeCheck",
    input: "none",
    systemOnly: true,
  },
];

const SIGNAL_MAP: ReadonlyMap<TrustSignalType, TrustSignalDefinition> = new Map(
  TRUST_SIGNAL_DEFINITIONS.map((d) => [d.type, d]),
);

export function getTrustSignalDefinition(type: TrustSignalType): TrustSignalDefinition | undefined {
  return SIGNAL_MAP.get(type);
}

/** Signals the user may pick from (excludes SYSTEM_ONLY). */
export const USER_SELECTABLE_SIGNALS: readonly TrustSignalDefinition[] =
  TRUST_SIGNAL_DEFINITIONS.filter((d) => !d.systemOnly);

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * A signal is "valid" (eligible to render as a public claim) when it has a
 * recognized type and, if its type requires an input, that input is present
 * and within range. SYSTEM_ONLY signals are never considered valid without an
 * external verification authority.
 */
export function isTrustSignalValid(signal: TrustBadge): boolean {
  if (!signal.type) {
    // Legacy label-only badge: valid only if it carries a non-empty label.
    return typeof signal.label === "string" && signal.label.trim().length > 0;
  }
  const def = SIGNAL_MAP.get(signal.type);
  if (!def) return false;
  if (def.systemOnly) return false;
  switch (def.input) {
    case "none":
      return true;
    case "hours": {
      const v = signal.value;
      return isFiniteNumber(v) && v >= 1 && v <= 72;
    }
    case "rating": {
      const v = signal.value;
      if (!isFiniteNumber(v) || v < 1 || v > 5) return false;
      if (signal.reviewCount !== undefined) {
        return isFiniteNumber(signal.reviewCount) && signal.reviewCount >= 0;
      }
      return true;
    }
    case "years": {
      const v = signal.value;
      return isFiniteNumber(v) && v >= 1 && v <= 80;
    }
    case "count": {
      const v = signal.value;
      return isFiniteNumber(v) && v >= 1;
    }
    case "text": {
      const v = signal.value;
      return typeof v === "string" && v.trim().length > 0;
    }
  }
}

/**
 * Normalize + defensively cap the active signals for rendering. Never mutates
 * or destructively rewrites historical data — it only selects what to render.
 * Invalid / SYSTEM_ONLY / unknown signals are dropped from the rendered list.
 */
export function normalizeTrustSignals(
  signals: TrustBadge[] | undefined | null,
): TrustBadge[] {
  if (!signals) return [];
  const valid = signals.filter(isTrustSignalValid);
  return valid.slice(0, MAX_TRUST_SIGNALS);
}

/* ------------------------------------------------------------------ */
/* Display labels                                                      */
/* ------------------------------------------------------------------ */

function formatText(value: string | undefined, max = 60): string {
  const t = (value ?? "").trim();
  return t.slice(0, max);
}

/** Compute the Spanish display label for a signal (or fall back to legacy label). */
export function trustSignalLabel(signal: TrustBadge): string {
  if (!signal.type) return signal.label ?? "";
  const def = SIGNAL_MAP.get(signal.type);
  if (!def) return signal.label ?? "";
  switch (signal.type) {
    case "availability_24h":
      return def.label;
    case "response_time":
      return `Responde en ${signal.value} h`;
    case "rating": {
      const v = signal.value;
      const base = `★ ${v}`;
      return signal.reviewCount !== undefined && signal.reviewCount > 0
        ? `${base} · ${signal.reviewCount} reseñas`
        : base;
    }
    case "experience":
      return `${signal.value} años de experiencia`;
    case "customers_served":
      return `+${signal.value} clientes`;
    case "certification":
    case "award":
    case "guarantee":
      return formatText(typeof signal.value === "string" ? signal.value : "");
    case "local_business":
      return def.label;
    case "verified_profile":
      return def.label;
  }
}

/** Default value for a signal type when first added. */
export function defaultTrustSignalValue(type: TrustSignalType): number | string | undefined {
  const def = SIGNAL_MAP.get(type);
  if (!def) return undefined;
  switch (def.input) {
    case "hours":
      return 2;
    case "rating":
      return 4.8;
    case "years":
      return 5;
    case "count":
      return 100;
    case "text":
      return "";
    case "none":
      return undefined;
  }
}
