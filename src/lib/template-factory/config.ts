/**
 * Template Factory — TemplateConfig: tipos, defaults canónicos, normalize/validate
 * PASS C · generator-v1
 *
 * Espejo tipado de la fundación S2 del renderer compartido
 * (`public/template-builder.html`): DEFAULT_TEMPLATE_CONFIG,
 * normalizeTemplateConfig() y validateTemplateConfig().
 *
 * Por qué existe este espejo: el renderer vive en un HTML standalone cargado en
 * iframe, así que su JS no es importable desde el bundle de React. En lugar de
 * duplicar reglas "a ojo", el pipeline de QA ejecuta un chequeo de paridad
 * (`config-parity`) que compara este default contra el del renderer en vivo y
 * marca FAIL si divergen. El generador siempre parte de estos defaults.
 */

import type { SemanticPaletteTokens } from "./palettes";
import type { ActionTypeId } from "./registries";

export const SCHEMA_VERSION = 1;

export interface TemplateConfigLink {
  id: string;
  text: string;
  icon: string;
  url: string;
  fullWidth: boolean;
  /** S9: decide cómo el renderer construye el href final. */
  actionType?: ActionTypeId;
  waMessage?: string;
}

export interface TemplateConfigSocialItem {
  id: string;
  platform: string;
  label: string;
  url: string;
  iconId: string;
  enabled: boolean;
}

export interface TemplateConfigBanner {
  enabled: boolean;
  heightPreset: "compact" | "medium" | "large";
  positionY: number;
  imageOpacity: number;
  fusionPreset: "none" | "soft" | "medium" | "deep";
  fusionStrength: number;
}

export interface TemplateConfig {
  schemaVersion: number;
  /** Palette preset selected by the user or generator. */
  paletteId?: string;
  /** Resolved semantic tokens after applying the preset and user overrides. */
  paletteTokens?: SemanticPaletteTokens;
  /** Per-token edits made after a preset was applied. */
  paletteOverrides?: Partial<SemanticPaletteTokens>;
  identity: {
    logoText: string;
    subtitleText: string;
    titleText: string;
    profileImg: string;
    bannerImg: string;
  };
  socials: {
    enabled: boolean;
    displayMode: string;
    items: TemplateConfigSocialItem[];
  };
  content: {
    footerText: string;
  };
  links: TemplateConfigLink[];
  appearance: {
    bgImage: string;
    bgOverlay: number;
    bgStart: string;
    bgMid: string;
    bgEnd: string;
    bgAngle: number;
    btnBgStart: string;
    btnBgEnd: string;
    btnBorderColor: string;
    accentBgStart: string;
    accentBgEnd: string;
    accentIconColor: string;
    btnTextColor: string;
    fontLogo: string;
    fontHeading: string;
    fontSubtitle: string;
    fontBody: string;
    themeId: string;
    btnPresetId: string;
    textPrimary: string;
    textSubtitle: string;
    profileBorderColor: string;
    profileRadius: string;
    btnRadius: string;
    banner: TemplateConfigBanner;
  };
  layout: {
    gridCols: number;
    profileBorder: number;
    profileSize: number;
    logoSize: number;
    titleSize: number;
    devicePreview: string;
  };
}

/**
 * Defaults canónicos. Copia literal de DEFAULT_TEMPLATE_CONFIG en el renderer.
 * El generador SIEMPRE construye a partir de aquí (nunca desde un objeto vacío),
 * de modo que cualquier campo que el generador no toque conserve el valor que el
 * editor humano consideraría por defecto.
 */
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  schemaVersion: SCHEMA_VERSION,
  identity: {
    logoText: "Eudora",
    subtitleText: "CONSULTORA",
    titleText: "VANESA ALVES",
    profileImg:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop",
    bannerImg: "",
  },
  socials: {
    enabled: true,
    displayMode: "icons",
    items: [],
  },
  content: {
    footerText: "Clique para interagir",
  },
  links: [
    { id: "b1", text: "Facebook", icon: "fa-brands fa-facebook-f", url: "#", fullWidth: true },
    { id: "b2", text: "Instagram", icon: "fa-brands fa-instagram", url: "#", fullWidth: false },
    { id: "b3", text: "E-mail", icon: "fa-regular fa-envelope", url: "mailto:ejemplo@correo.com", fullWidth: false },
    { id: "b4", text: "Whatsapp", icon: "fa-brands fa-whatsapp", url: "#", fullWidth: false },
    { id: "b5", text: "Localiza??o", icon: "fa-solid fa-location-dot", url: "#", fullWidth: false },
  ],
  appearance: {
    bgImage: "",
    bgOverlay: 0,
    bgStart: "#95547B",
    bgMid: "#B46A94",
    bgEnd: "#8C476E",
    bgAngle: 180,
    btnBgStart: "#ffffff",
    btnBgEnd: "#ffffff",
    btnBorderColor: "#ffffff",
    accentBgStart: "#f5d1e6",
    accentBgEnd: "#e0a3c7",
    accentIconColor: "#5c2d47",
    btnTextColor: "#ffffff",
    fontLogo: "Cinzel",
    fontHeading: "Cinzel",
    fontSubtitle: "Oswald",
    fontBody: "Oswald",
    themeId: "custom",
    btnPresetId: "glass",
    textPrimary: "#FFFFFF",
    textSubtitle: "#2C2C2C",
    profileBorderColor: "#5c2d47",
    profileRadius: "50%",
    btnRadius: "9999px",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 100,
      fusionPreset: "soft",
      fusionStrength: 60,
    },
  },
  layout: {
    gridCols: 2,
    profileBorder: 4,
    profileSize: 170,
    logoSize: 3.2,
    titleSize: 2.2,
    devicePreview: "mobile",
  },
};

/** Clon profundo vía JSON: falla ruidosamente si algo no es serializable. */
export function cloneDefaults(): TemplateConfig {
  return JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG)) as TemplateConfig;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Espejo de `window.validateTemplateConfig`, más las comprobaciones extra que
 * el generador necesita para no ingresar basura a la biblioteca privada.
 *
 * Las reglas marcadas RENDERER son idénticas al renderer; las marcadas
 * GENERATOR son adicionales y más estrictas (el renderer es tolerante por
 * diseño, el generador no debe apoyarse en esa tolerancia).
 */
export function validateTemplateConfig(config: unknown): ValidationResult {
  const errors: string[] = [];

  // RENDERER: objeto y schemaVersion
  if (!config || typeof config !== "object") {
    return { valid: false, errors: ["Config is null or not an object"] };
  }
  const cfg = config as Partial<TemplateConfig>;
  if (cfg.schemaVersion !== SCHEMA_VERSION) {
    return { valid: false, errors: ["Unsupported schemaVersion"] };
  }

  // RENDERER: links debe ser array y cada link necesita id
  if (cfg.links !== undefined && !Array.isArray(cfg.links)) {
    errors.push("links must be an array");
  } else if (Array.isArray(cfg.links)) {
    const seen = new Set<string>();
    cfg.links.forEach((link, index) => {
      if (!link?.id) {
        errors.push(`Link at index ${index} is missing an id`);
        return;
      }
      // GENERATOR: ids duplicados rompen el reorder por id del editor
      if (seen.has(link.id)) errors.push(`Duplicate link id: ${link.id}`);
      seen.add(link.id);
      if (!link.text || typeof link.text !== "string") {
        errors.push(`Link ${link.id} has no text`);
      }
      if (typeof link.icon !== "string" || link.icon.trim() === "") {
        errors.push(`Link ${link.id} has no icon`);
      }
      if (typeof link.fullWidth !== "boolean") {
        errors.push(`Link ${link.id}.fullWidth must be boolean`);
      }
      if (typeof link.url !== "string") {
        errors.push(`Link ${link.id}.url must be a string`);
      } else if (isUnsafeUrl(link.url)) {
        errors.push(`Link ${link.id} has unsafe url protocol`);
      }
    });
  }

  // RENDERER: gridCols numérico
  if (cfg.layout?.gridCols !== undefined && typeof cfg.layout.gridCols !== "number") {
    errors.push("gridCols must be a number");
  }

  // GENERATOR: socials bien formados
  if (cfg.socials) {
    if (!Array.isArray(cfg.socials.items)) {
      errors.push("socials.items must be an array");
    } else {
      const seenSocial = new Set<string>();
      cfg.socials.items.forEach((item, index) => {
        if (!item?.id) errors.push(`Social at index ${index} is missing an id`);
        else if (seenSocial.has(item.id)) errors.push(`Duplicate social id: ${item.id}`);
        else seenSocial.add(item.id);
        if (item?.url && isUnsafeUrl(item.url)) {
          errors.push(`Social ${item.id} has unsafe url protocol`);
        }
      });
    }
  }

  // GENERATOR: no debe haber valores no serializables ni transitorios
  const nonSerializable = findNonSerializable(config);
  if (nonSerializable.length > 0) {
    errors.push(`Non-serializable values at: ${nonSerializable.join(", ")}`);
  }

  // GENERATOR: blob:/object URLs son locales a una sesión del navegador
  const identity = cfg.identity;
  (
    [
      ["identity.profileImg", identity?.profileImg],
      ["identity.bannerImg", identity?.bannerImg],
      ["appearance.bgImage", cfg.appearance?.bgImage],
    ] as const
  ).forEach(([path, value]) => {
    if (typeof value === "string" && value.startsWith("blob:")) {
      errors.push(`${path} contains a session-local blob URL`);
    }
  });

  return { valid: errors.length === 0, errors };
}

const UNSAFE_PROTOCOLS = ["javascript:", "data:", "file:", "vbscript:"];

export function isUnsafeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return UNSAFE_PROTOCOLS.some((protocol) => lower.startsWith(protocol));
}

/**
 * Devuelve las rutas de cualquier valor que JSON no pueda representar
 * (funciones, undefined, símbolos, Blob/File/DOM). Búsqueda estructural, no
 * por instanceof, para que funcione igual en Node y en el navegador.
 */
export function findNonSerializable(value: unknown, path = "root"): string[] {
  const found: string[] = [];

  const walk = (node: unknown, currentPath: string, depth: number) => {
    if (depth > 20) {
      found.push(`${currentPath} (profundidad excesiva)`);
      return;
    }
    if (node === null) return;

    const type = typeof node;
    if (type === "function" || type === "symbol" || type === "undefined" || type === "bigint") {
      found.push(`${currentPath} (${type})`);
      return;
    }
    if (type !== "object") return;

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${currentPath}[${index}]`, depth + 1));
      return;
    }

    const proto = Object.getPrototypeOf(node);
    if (proto !== Object.prototype && proto !== null) {
      found.push(`${currentPath} (instancia de clase no plana)`);
      return;
    }

    Object.entries(node as Record<string, unknown>).forEach(([key, item]) => {
      walk(item, `${currentPath}.${key}`, depth + 1);
    });
  };

  walk(value, path, 0);
  return found;
}

/**
 * Espejo de `window.normalizeTemplateConfig`: merge profundo sobre los defaults
 * y asignación de ids a links que no lo traigan. Mismo comportamiento, misma
 * tolerancia, para que un config normalizado por el generador sea idéntico al
 * que produciría el editor al cargarlo.
 */
export function normalizeTemplateConfig(config: unknown): TemplateConfig {
  const target = cloneDefaults();
  if (!config || typeof config !== "object") return target;

  const source = config as Record<string, unknown>;

  // Retrocompatibilidad: colores de botón sin preset => modo legacy/custom
  const appearance = source["appearance"] as Record<string, unknown> | undefined;
  if (appearance?.["btnBgStart"] && !appearance["btnPresetId"]) {
    target.appearance.btnPresetId = "legacy";
  }

  merge(target as unknown as Record<string, unknown>, source);

  if (!target.socials || !Array.isArray(target.socials.items)) {
    target.socials = { enabled: true, displayMode: "icons", items: [] };
  }

  return target;
}

function merge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const value = source[key];

    if (Array.isArray(value)) {
      // Los arrays se reemplazan, no se fusionan por índice.
      target[key] = value.map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const record = { ...(item as Record<string, unknown>) };
          if (!record["id"]) record["id"] = `id_${fallbackId()}`;
          if (key === "links" && typeof record["waMessage"] === "undefined") {
            record["waMessage"] = "";
          }
          return record;
        }
        return item;
      });
      continue;
    }

    if (value && typeof value === "object") {
      const existing = target[key];
      const nested =
        existing && typeof existing === "object" && !Array.isArray(existing)
          ? (existing as Record<string, unknown>)
          : {};
      target[key] = nested;
      merge(nested, value as Record<string, unknown>);
      continue;
    }

    target[key] = value;
  }
}

/**
 * Contador para ids de fallback. El renderer usa Math.random() aquí, pero el
 * generador nunca debería llegar a este camino: siempre emite ids explícitos.
 * Se mantiene determinista para no romper la reproducibilidad si ocurriera.
 */
let fallbackCounter = 0;
function fallbackId(): string {
  fallbackCounter += 1;
  return `norm${fallbackCounter.toString(36)}`;
}

/** Reinicia el contador de ids de fallback (usado por los tests). */
export function resetFallbackIdCounter(): void {
  fallbackCounter = 0;
}

/**
 * Round-trip de serialización: prueba que el config sobrevive
 * stringify → parse → normalize sin cambiar.
 */
export function roundTripConfig(config: TemplateConfig): {
  ok: boolean;
  differences: string[];
  result: TemplateConfig;
} {
  const serialized = JSON.stringify(config);
  const parsed = JSON.parse(serialized) as TemplateConfig;
  const normalized = normalizeTemplateConfig(parsed);
  const differences = diffConfigs(config, normalized);
  return { ok: differences.length === 0, differences, result: normalized };
}

/** Diff recursivo con rutas legibles, para reportar pérdidas de round-trip. */
export function diffConfigs(a: unknown, b: unknown, path = ""): string[] {
  const differences: string[] = [];

  const compare = (left: unknown, right: unknown, currentPath: string) => {
    if (left === right) return;

    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        differences.push(`${currentPath}: longitud ${left.length} vs ${right.length}`);
        return;
      }
      left.forEach((item, index) => compare(item, right[index], `${currentPath}[${index}]`));
      return;
    }

    const leftIsObject = left !== null && typeof left === "object";
    const rightIsObject = right !== null && typeof right === "object";

    if (leftIsObject && rightIsObject) {
      const keys = new Set([
        ...Object.keys(left as Record<string, unknown>),
        ...Object.keys(right as Record<string, unknown>),
      ]);
      keys.forEach((key) => {
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        const leftHas = key in (left as Record<string, unknown>);
        const rightHas = key in (right as Record<string, unknown>);
        if (!leftHas) differences.push(`${nextPath}: ausente en el primero`);
        else if (!rightHas) differences.push(`${nextPath}: ausente en el segundo`);
        else {
          compare(
            (left as Record<string, unknown>)[key],
            (right as Record<string, unknown>)[key],
            nextPath,
          );
        }
      });
      return;
    }

    differences.push(
      `${currentPath}: ${JSON.stringify(left)} vs ${JSON.stringify(right)}`,
    );
  };

  compare(a, b, path);
  return differences;
}
