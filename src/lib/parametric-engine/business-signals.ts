/**
 * V1.5 — BusinessSignalsV1.
 *
 * Orthogonal commercial signals instead of hundreds of profession branches.
 * Fully OPTIONAL: the V1 pipeline works without it. Signals may be supplied
 * by future onboarding/AI, or inferred deterministically from the intent.
 *
 * Pure data + pure functions. No AI, no network, no randomness.
 */

import type {
  BusinessCategory,
  NormalizedIntent,
  PrimaryGoal,
  ValidationIssue,
} from "./types";
import { EngineError } from "./types";

export const BUSINESS_ARCHETYPES = [
  "home_service",
  "appointment_service",
  "professional_service",
  "custom_craft",
  "portfolio_service",
  "hospitality",
  "food_service",
  "retail",
  "creator",
  "wellness",
  "education",
  "real_estate",
  "events",
  "local_business",
  "digital_service",
  "generic",
] as const;
export type BusinessArchetype = (typeof BUSINESS_ARCHETYPES)[number];

export const DELIVERY_MODES = [
  "on_site",
  "customer_location",
  "business_location",
  "remote",
  "digital",
  "mixed",
] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const CONVERSION_MODES = [
  "contact",
  "quote",
  "booking",
  "purchase",
  "visit",
  "portfolio_then_contact",
  "social_follow",
] as const;
export type ConversionMode = (typeof CONVERSION_MODES)[number];

export type SignalLevel = "low" | "normal" | "high";
export type Requirement = "low" | "medium" | "high";
export type Locality = "none" | "local" | "service_area" | "multi_location";
export type ProofPriority =
  | "none"
  | "portfolio"
  | "reviews"
  | "before_after"
  | "certifications"
  | "results"
  | "mixed";
export type PriceModel = "none" | "fixed" | "starting_at" | "range" | "quote";

export interface BusinessSignalsV1 {
  archetype: BusinessArchetype;
  delivery_mode: DeliveryMode;
  conversion_mode: ConversionMode;
  urgency: SignalLevel;
  trust_requirement: Requirement;
  visual_dependency: Requirement;
  locality: Locality;
  proof_priority: ProofPriority;
  price_model: PriceModel;
}

export const GENERIC_SIGNALS: BusinessSignalsV1 = {
  archetype: "generic",
  delivery_mode: "mixed",
  conversion_mode: "contact",
  urgency: "normal",
  trust_requirement: "medium",
  visual_dependency: "medium",
  locality: "local",
  proof_priority: "none",
  price_model: "none",
};

/* ------------------------------------------------------- goal stack (19) */

export interface GoalStackV1 {
  primary: PrimaryGoal;
  secondary: PrimaryGoal | null;
  tertiary: PrimaryGoal | null;
}

export function normalizeGoalStack(
  primary: PrimaryGoal,
  stack?: Partial<GoalStackV1>,
): GoalStackV1 {
  return {
    primary,
    secondary: stack?.secondary && stack.secondary !== primary ? stack.secondary : null,
    tertiary:
      stack?.tertiary && stack.tertiary !== primary && stack.tertiary !== stack?.secondary
        ? stack.tertiary
        : null,
  };
}

/* --------------------------------------------------- deterministic infer */

/**
 * Keyword -> archetype. Intentionally SMALL and orthogonal: coverage comes
 * from archetypes, not from one entry per profession.
 */
const KEYWORDS: { archetype: BusinessArchetype; words: string[] }[] = [
  {
    archetype: "home_service",
    words: [
      "gasfiter", "fontanero", "plomero", "plumber", "electricista", "electrician",
      "cerrajero", "locksmith", "limpieza", "cleaning", "aseo", "pintor", "painter",
      "techo", "roof", "mudanza", "moving", "climatizacion", "hvac", "reparacion",
      "repair", "mantencion", "mantenimiento", "jardin", "jardinero", "gardener",
      "landscap", "fumigacion", "pest",
    ],
  },
  {
    archetype: "custom_craft",
    words: [
      "herrero", "blacksmith", "carpinter", "carpenter", "mueble", "furniture",
      "soldador", "welding", "artesan", "craft", "ceramic", "joyer", "jewel",
      "sastre", "tailor", "tapicer", "upholster", "vidrier", "forja",
    ],
  },
  {
    archetype: "appointment_service",
    words: [
      "peluquer", "barber", "barbero", "salon", "estetica", "estética", "manicur",
      "uñas", "nails", "spa", "masaj", "massage", "dentist", "odontolog", "medic",
      "doctor", "kinesiolog", "veterinar", "pet groom", "peluquería canina", "tatua",
      "tattoo", "depilacion", "clinic", "consulta",
    ],
  },
  {
    archetype: "professional_service",
    words: [
      "abogad", "lawyer", "legal", "contador", "accountant", "contabilidad",
      "asesor", "consultor", "consult", "psicolog", "psycholog", "coach ejecutivo",
      "notari", "arquitect", "ingenier", "engineer", "financ", "seguro", "insurance",
      "tax",
    ],
  },
  {
    archetype: "portfolio_service",
    words: [
      "fotograf", "photograph", "videograf", "filmmaker", "diseñador", "disenador",
      "designer", "ilustrador", "illustrator", "editor", "motion", "portfolio",
      "director de arte", "ux", "ui",
    ],
  },
  {
    archetype: "hospitality",
    words: ["hotel", "hostal", "hostel", "cabaña", "cabana", "lodge", "airbnb", "turismo", "tour"],
  },
  {
    archetype: "food_service",
    words: [
      "restaurant", "restaurante", "cafe", "café", "cafeter", "bar", "pasteler",
      "panader", "bakery", "food", "comida", "cocina", "catering", "pizzer", "sushi",
      "heladeria",
    ],
  },
  {
    archetype: "retail",
    words: [
      "tienda", "store", "shop", "boutique", "ferreter", "almacen", "minimarket",
      "retail", "venta", "distribuidor", "emprendimiento",
    ],
  },
  {
    archetype: "creator",
    words: [
      "creador", "creator", "influencer", "streamer", "youtuber", "podcast",
      "contenido", "content", "musico", "músico", "artist", "dj",
    ],
  },
  {
    archetype: "wellness",
    words: [
      "fitness", "entrenador", "trainer", "gym", "gimnasio", "yoga", "pilates",
      "nutricion", "nutrition", "wellness", "bienestar", "terapia", "holistic",
    ],
  },
  {
    archetype: "education",
    words: [
      "profesor", "teacher", "tutor", "clases", "academia", "curso", "course",
      "escuela", "school", "capacitacion", "training", "idiomas",
    ],
  },
  {
    archetype: "real_estate",
    words: ["inmobiliar", "corredor de propiedades", "real estate", "propiedades", "realtor", "broker"],
  },
  {
    archetype: "events",
    words: ["evento", "event", "wedding", "matrimonio", "produccion de eventos", "banquet", "party", "planner"],
  },
  {
    archetype: "digital_service",
    words: ["marketing", "agencia", "agency", "software", "desarrollo web", "developer", "saas", "seo", "digital"],
  },
  {
    archetype: "local_business",
    words: ["barrio", "local", "vecindario", "kiosco", "lavanderia", "taller", "automotriz", "auto repair", "mecanic"],
  },
];

const CATEGORY_ARCHETYPE: Record<BusinessCategory, BusinessArchetype> = {
  beauty: "appointment_service",
  professional: "professional_service",
  creator: "creator",
  food: "food_service",
  fitness: "wellness",
  local: "local_business",
  freelancer: "digital_service",
  other: "generic",
};

const ARCHETYPE_DEFAULTS: Record<BusinessArchetype, Omit<BusinessSignalsV1, "archetype">> = {
  home_service: {
    delivery_mode: "customer_location",
    conversion_mode: "quote",
    urgency: "high",
    trust_requirement: "high",
    visual_dependency: "medium",
    locality: "service_area",
    proof_priority: "reviews",
    price_model: "quote",
  },
  appointment_service: {
    delivery_mode: "business_location",
    conversion_mode: "booking",
    urgency: "normal",
    trust_requirement: "medium",
    visual_dependency: "high",
    locality: "local",
    proof_priority: "before_after",
    price_model: "starting_at",
  },
  professional_service: {
    delivery_mode: "mixed",
    conversion_mode: "contact",
    urgency: "normal",
    trust_requirement: "high",
    visual_dependency: "low",
    locality: "local",
    proof_priority: "certifications",
    price_model: "quote",
  },
  custom_craft: {
    delivery_mode: "on_site",
    conversion_mode: "quote",
    urgency: "low",
    trust_requirement: "medium",
    visual_dependency: "high",
    locality: "service_area",
    proof_priority: "portfolio",
    price_model: "quote",
  },
  portfolio_service: {
    delivery_mode: "mixed",
    conversion_mode: "portfolio_then_contact",
    urgency: "low",
    trust_requirement: "medium",
    visual_dependency: "high",
    locality: "none",
    proof_priority: "portfolio",
    price_model: "starting_at",
  },
  hospitality: {
    delivery_mode: "business_location",
    conversion_mode: "booking",
    urgency: "normal",
    trust_requirement: "medium",
    visual_dependency: "high",
    locality: "local",
    proof_priority: "reviews",
    price_model: "range",
  },
  food_service: {
    delivery_mode: "business_location",
    conversion_mode: "visit",
    urgency: "normal",
    trust_requirement: "medium",
    visual_dependency: "high",
    locality: "local",
    proof_priority: "reviews",
    price_model: "range",
  },
  retail: {
    delivery_mode: "business_location",
    conversion_mode: "purchase",
    urgency: "normal",
    trust_requirement: "medium",
    visual_dependency: "high",
    locality: "local",
    proof_priority: "reviews",
    price_model: "fixed",
  },
  creator: {
    delivery_mode: "digital",
    conversion_mode: "social_follow",
    urgency: "low",
    trust_requirement: "low",
    visual_dependency: "high",
    locality: "none",
    proof_priority: "portfolio",
    price_model: "none",
  },
  wellness: {
    delivery_mode: "business_location",
    conversion_mode: "booking",
    urgency: "normal",
    trust_requirement: "medium",
    visual_dependency: "medium",
    locality: "local",
    proof_priority: "results",
    price_model: "starting_at",
  },
  education: {
    delivery_mode: "mixed",
    conversion_mode: "contact",
    urgency: "low",
    trust_requirement: "high",
    visual_dependency: "low",
    locality: "none",
    proof_priority: "results",
    price_model: "starting_at",
  },
  real_estate: {
    delivery_mode: "customer_location",
    conversion_mode: "contact",
    urgency: "normal",
    trust_requirement: "high",
    visual_dependency: "high",
    locality: "multi_location",
    proof_priority: "results",
    price_model: "range",
  },
  events: {
    delivery_mode: "customer_location",
    conversion_mode: "quote",
    urgency: "normal",
    trust_requirement: "medium",
    visual_dependency: "high",
    locality: "service_area",
    proof_priority: "portfolio",
    price_model: "quote",
  },
  local_business: {
    delivery_mode: "business_location",
    conversion_mode: "visit",
    urgency: "normal",
    trust_requirement: "medium",
    visual_dependency: "low",
    locality: "local",
    proof_priority: "reviews",
    price_model: "fixed",
  },
  digital_service: {
    delivery_mode: "remote",
    conversion_mode: "contact",
    urgency: "low",
    trust_requirement: "medium",
    visual_dependency: "medium",
    locality: "none",
    proof_priority: "portfolio",
    price_model: "quote",
  },
  generic: {
    delivery_mode: GENERIC_SIGNALS.delivery_mode,
    conversion_mode: GENERIC_SIGNALS.conversion_mode,
    urgency: GENERIC_SIGNALS.urgency,
    trust_requirement: GENERIC_SIGNALS.trust_requirement,
    visual_dependency: GENERIC_SIGNALS.visual_dependency,
    locality: GENERIC_SIGNALS.locality,
    proof_priority: GENERIC_SIGNALS.proof_priority,
    price_model: GENERIC_SIGNALS.price_model,
  },
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * V1.5.1 — specific-before-generic matching.
 *
 * All keywords are flattened once and sorted by descending phrase length, so
 * "auto repair" always beats the generic token "repair" and "real estate"
 * beats "estate". Ties keep registry order, so the result stays deterministic.
 */
const FLAT_KEYWORDS: { word: string; archetype: BusinessArchetype; rank: number }[] = KEYWORDS
  .flatMap((entry, group) =>
    entry.words.map((word, index) => ({
      word: normalizeText(word),
      archetype: entry.archetype,
      rank: group * 1000 + index,
    })),
  )
  .sort((a, b) => b.word.length - a.word.length || a.rank - b.rank);

/** Deterministic keyword + category classification. Never AI inference. */
export function inferArchetype(intent: NormalizedIntent): BusinessArchetype {
  const haystack = normalizeText(
    [intent.identity.profession, intent.business_label ?? "", intent.identity.bio].join(" "),
  );
  for (const entry of FLAT_KEYWORDS) {
    if (haystack.includes(entry.word)) return entry.archetype;
  }
  return CATEGORY_ARCHETYPE[intent.business_category];
}

const GOAL_CONVERSION: Partial<Record<PrimaryGoal, ConversionMode>> = {
  booking: "booking",
  sell: "purchase",
  social: "social_follow",
  portfolio: "portfolio_then_contact",
  leads: "contact",
};

/** Allowed runtime values for every BusinessSignalsV1 field. */
export const BUSINESS_SIGNAL_ENUMS: Record<keyof BusinessSignalsV1, readonly string[]> = {
  archetype: BUSINESS_ARCHETYPES,
  delivery_mode: DELIVERY_MODES,
  conversion_mode: CONVERSION_MODES,
  urgency: ["low", "normal", "high"],
  trust_requirement: ["low", "medium", "high"],
  visual_dependency: ["low", "medium", "high"],
  locality: ["none", "local", "service_area", "multi_location"],
  proof_priority: [
    "none",
    "portfolio",
    "reviews",
    "before_after",
    "certifications",
    "results",
    "mixed",
  ],
  price_model: ["none", "fixed", "starting_at", "range", "quote"],
};

/** Runtime enum audit for a caller-supplied partial signal patch. */
export function businessSignalIssues(
  explicit: unknown,
  base = "business",
): ValidationIssue[] {
  if (explicit === undefined || explicit === null) return [];
  if (typeof explicit !== "object" || Array.isArray(explicit)) {
    return [{ path: base, code: "not_an_object", message: `${base} must be an object.` }];
  }
  const issues: ValidationIssue[] = [];
  for (const [key, value] of Object.entries(explicit as Record<string, unknown>)) {
    if (value === undefined) continue;
    const allowed = BUSINESS_SIGNAL_ENUMS[key as keyof BusinessSignalsV1];
    if (!allowed) {
      issues.push({
        path: `${base}.${key}`,
        code: "unknown_key",
        message: `${key} is not a business signal.`,
      });
      continue;
    }
    if (typeof value !== "string" || !allowed.includes(value)) {
      issues.push({
        path: `${base}.${key}`,
        code: "enum",
        message: `${key} must be one of: ${allowed.join(", ")}.`,
      });
    }
  }
  return issues;
}

/**
 * Resolve full signals from intent + optional explicit partial signals.
 * Explicit values always win, but only after runtime enum validation:
 * an invalid value raises a controlled EngineError, never a TypeError.
 */
export function resolveBusinessSignals(
  intent: NormalizedIntent,
  explicit?: Partial<BusinessSignalsV1>,
): BusinessSignalsV1 {
  const issues = businessSignalIssues(explicit);
  if (issues.length > 0) {
    throw new EngineError("INVALID_CONTEXT", "Invalid business signals supplied.", issues);
  }
  const archetype = explicit?.archetype ?? inferArchetype(intent);
  const defaults = ARCHETYPE_DEFAULTS[archetype];
  const goalConversion = GOAL_CONVERSION[intent.primary_goal];
  const base: BusinessSignalsV1 = {
    archetype,
    ...defaults,
    conversion_mode:
      intent.primary_goal === "whatsapp"
        ? defaults.conversion_mode === "quote"
          ? "quote"
          : "contact"
        : (goalConversion ?? defaults.conversion_mode),
  };
  return { ...base, ...(explicit ?? {}) };
}

export const ARCHETYPE_SIGNAL_DEFAULTS = ARCHETYPE_DEFAULTS;
