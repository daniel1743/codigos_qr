/**
 * CRIPQER Conversion Advisor — CA-9A · phase 1, the capability truth inventory.
 *
 * DERIVED, NOT TRANSCRIBED. The four lists below are computed from the real
 * `CAPABILITY_CATALOG` and `ACTION_REGISTRY` at load time. A hand-copied
 * inventory would be a second source of truth that drifts the moment the
 * catalog changes; this one cannot, and a test pins the derivation so a
 * reclassification (say `dominio_personalizado` going live) shows up as a
 * changed list rather than as a stale report.
 *
 * The brief's rule for this phase: "La evaluación debe penalizar cualquier
 * función inventada aunque la respuesta suene comercialmente atractiva." That is
 * why the inventory is expressed as the CLOSED SET the scorer checks against —
 * `SUPPORTED_CAPABILITY_IDS` — plus a curated lexicon of feature names that are
 * known NOT to exist, so a reply that sells one of them is caught lexically even
 * though the catalog cannot enumerate every phrasing.
 */

import {
  CAPABILITY_CATALOG,
  CATALOG_VERIFIED_ON,
  FORBIDDEN_CLAIM_PATTERNS,
  type CapabilityRecord,
} from "../capabilities/catalog";
import { ACTION_REGISTRY, type ActionId } from "../actions/registry";

/* ============================ the four lists ============================ */

const byStatus = (statuses: readonly CapabilityRecord["status"][]): readonly string[] =>
  CAPABILITY_CATALOG.filter((record) => statuses.includes(record.status))
    .map((record) => record.capability_id)
    .sort();

/**
 * Sellable and verified today: the advisor may recommend these outright.
 * (`STATUS_POLICY` maps AVAILABLE_VERIFIED → RECOMMEND.)
 */
export const SUPPORTED_CAPABILITIES: readonly string[] = byStatus(["AVAILABLE_VERIFIED"]);

/**
 * Sellable but with a documented limit the reply must state. The advisor may
 * mention these only alongside their limitation (`EXPLAIN_LIMITS`), and the
 * two entries here are exactly the two the report must name: `plan_premium`
 * (no price may be cited from this base) and `crear_pagina` (the guest editor's
 * integration is unverified).
 */
export const CONDITIONALLY_SUPPORTED: readonly string[] = byStatus(["PARTIAL"]);

/**
 * Must NOT be presented as available. `dominio_personalizado` is PLANNED (a
 * button with no implementation); `bloques_no_disponibles` is the catalog's own
 * "these do not exist" entry.
 */
export const UNSUPPORTED_CAPABILITIES: readonly string[] = byStatus([
  "PLANNED",
  "NOT_AVAILABLE",
  "IN_TESTING",
  "UNKNOWN",
]);

/** The closed set the scorer checks cited ids against. */
export const ALL_CAPABILITY_IDS: readonly string[] = CAPABILITY_CATALOG.map(
  (record) => record.capability_id,
).sort();

/** Ids a reply may NOT cite as if they worked. */
export const UNSUPPORTED_CAPABILITY_IDS: readonly string[] = [
  ...UNSUPPORTED_CAPABILITIES,
  ...CONDITIONALLY_SUPPORTED,
];

/* ============================ the action truth ========================== */

export const AVAILABLE_ACTIONS: readonly ActionId[] = (
  Object.keys(ACTION_REGISTRY) as ActionId[]
)
  .filter((id) => ACTION_REGISTRY[id].availability === "AVAILABLE")
  .sort();

export const CONDITIONAL_ACTIONS: readonly ActionId[] = (
  Object.keys(ACTION_REGISTRY) as ActionId[]
)
  .filter((id) => ACTION_REGISTRY[id].availability === "CONDITIONAL")
  .sort();

export const NOT_IMPLEMENTED_ACTIONS: readonly ActionId[] = (
  Object.keys(ACTION_REGISTRY) as ActionId[]
)
  .filter((id) => ACTION_REGISTRY[id].availability === "NOT_IMPLEMENTED")
  .sort();

/* ========================== the forbidden claims ======================== */

/**
 * The patterns CA-4 screens every reply against, described in words so the
 * report can name them and the detector can be tested by example. The patterns
 * themselves are the authority — this is a readable index over them.
 */
export const FORBIDDEN_CLAIMS: readonly string[] = [
  "any explicit money amount (a price, a plan cost, a fee)",
  "a trial or free-period length in days, months or years",
  '"unlimited" / "sin límite" as an absolute',
  '"para siempre" / "de por vida" as a promise',
  "roadmap language sold as product (próximamente, estamos trabajando en…)",
  "discounts, promotions or launch offers",
  "a guarantee or assurance of an outcome (ventas, clientes, resultados)",
];

/**
 * Feature names the product does NOT have, drawn from the catalog's own
 * `bloques_no_disponibles` and `dominio_personalizado` records. A reply that
 * names one of these as if it worked is an invented capability, caught here
 * because the catalog cannot enumerate every paraphrase a model might produce.
 */
export const UNSUPPORTED_FEATURE_TERMS: readonly string[] = [
  "galeria de fotos",
  "galeria de imagenes",
  "subir videos",
  "subir video",
  "bloque de video",
  "portafolio en grilla",
  "antes y despues",
  "testimonios",
  "prueba social",
  "preguntas frecuentes",
  "faq",
  "horarios de atencion",
  "ubicacion en el mapa",
  "mapa de ubicacion",
  "lista de precios",
  "insignias de confianza",
  "reserva nativa",
  "reservas nativas",
  "formulario de cotizacion",
  "formulario de contacto",
  "cta fijo",
  "contacto flotante",
  "carrito de compras",
  "pago en linea",
  "vender en linea",
  "cobrar con tarjeta",
  "conectar tu dominio",
  "dominio propio",
  "tu propio dominio",
];

/**
 * Phrases that assert an action was performed. CA-4's identity prompt forbids
 * "dices que generaste o creaste algo", and CA-5 is the only thing that may act,
 * so any of these in a reply is a `CLAIMED_EXECUTED_ACTION`.
 */
export const EXECUTION_CLAIM_TERMS: readonly string[] = [
  "ya cree",
  "ya creé",
  "he creado",
  "ya genere",
  "ya generé",
  "he generado",
  "ya publique",
  "ya publiqué",
  "he publicado",
  "ya active",
  "ya activé",
  "he activado",
  "ya configure",
  "ya configuré",
  "he configurado",
  "quedo listo",
  "quedó listo",
  "ya esta en linea",
  "ya está en línea",
  "lo deje publicado",
  "lo dejé publicado",
  "ya subi",
  "ya subí",
  "ya conecte",
  "ya conecté",
];

/* ============================== the snapshot ============================ */

export interface CapabilityTruth {
  readonly catalog_verified_on: string;
  readonly supported: readonly string[];
  readonly conditionally_supported: readonly string[];
  readonly unsupported: readonly string[];
  readonly all_ids: readonly string[];
  readonly available_actions: readonly ActionId[];
  readonly conditional_actions: readonly ActionId[];
  readonly not_implemented_actions: readonly ActionId[];
  readonly forbidden_claims: readonly string[];
  readonly unsupported_feature_terms: readonly string[];
  readonly execution_claim_terms: readonly string[];
}

/** The whole inventory as one value, for the report and for the tests. */
export const CAPABILITY_TRUTH: CapabilityTruth = {
  catalog_verified_on: CATALOG_VERIFIED_ON,
  supported: SUPPORTED_CAPABILITIES,
  conditionally_supported: CONDITIONALLY_SUPPORTED,
  unsupported: UNSUPPORTED_CAPABILITIES,
  all_ids: ALL_CAPABILITY_IDS,
  available_actions: AVAILABLE_ACTIONS,
  conditional_actions: CONDITIONAL_ACTIONS,
  not_implemented_actions: NOT_IMPLEMENTED_ACTIONS,
  forbidden_claims: FORBIDDEN_CLAIMS,
  unsupported_feature_terms: UNSUPPORTED_FEATURE_TERMS,
  execution_claim_terms: EXECUTION_CLAIM_TERMS,
};

/** The number of deterministic claim patterns CA-4 screens with, for the report. */
export const FORBIDDEN_CLAIM_PATTERN_COUNT = FORBIDDEN_CLAIM_PATTERNS.length;
