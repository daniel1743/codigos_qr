/**
 * Template Factory — Generador determinista v1
 * PASS C · generator-v1
 *
 * Pipeline: input → receta → variación (seeded) → TemplateConfig → normalize →
 * validate. NO renderiza y NO guarda: eso lo hacen el pipeline de QA y la capa
 * de ingesta, respectivamente. Este módulo es puro y ejecutable en Node.
 *
 * Contrato determinista: mismo `{industry, recipe, buttonCount, seed}` produce
 * el mismo TemplateConfig, byte a byte. El orden de las llamadas al PRNG es
 * parte del contrato; reordenarlas cambia la salida.
 */

import {
  cloneDefaults,
  normalizeTemplateConfig,
  validateTemplateConfig,
  type TemplateConfig,
  type TemplateConfigLink,
  type TemplateConfigSocialItem,
  type ValidationResult,
} from "./config";
import {
  getIndustryDataset,
  isIndustryId,
  type ActionCandidate,
  type ActionRole,
  type IndustryId,
} from "./industries";
import {
  getDefaultRecipe,
  getRecipe,
  getRecipesForIndustry,
  type Recipe,
} from "./recipes";
import {
  paletteToThemeAppearance,
  selectTemplatePalette,
  type SemanticPaletteTokens,
  type TemplatePaletteId,
} from "./palettes";
import {
  ACTION_DEFAULT_ICON,
  BUTTON_PRESET_IDS,
  FONT_HEADING_VALUES,
  FONT_LOGO_VALUES,
  SOCIAL_PLATFORM_LABELS,
  isKnownIcon,
  type ButtonPresetId,
  type SocialPlatformId,
  type ThemeId,
  THEME_APPEARANCE,
} from "./registries";
import { SeededRandom, deriveSeed, stableHash } from "./seed";

export const GENERATOR_VERSION = "generator-v1";

/** Cantidades de botones soportadas. Límite duro del generador v1. */
export const SUPPORTED_BUTTON_COUNTS = [1, 2, 3, 4, 5] as const;
export type ButtonCount = (typeof SUPPORTED_BUTTON_COUNTS)[number];

export interface GenerateTemplateInput {
  industry: IndustryId;
  /** Id de receta, o "auto" para elegir según la industria y el seed. */
  recipe?: string | "auto";
  buttonCount?: ButtonCount;
  theme?: ThemeId | "auto";
  buttonPreset?: ButtonPresetId | "auto";
  /** Semilla de variación. Misma semilla ⇒ misma plantilla. */
  seed: string | number;
  batchId: string;
  /** Índice dentro del batch; entra en el id y en el sub-seed. */
  index?: number;
  metadata?: Record<string, unknown> | undefined;
}

/** Parámetros efectivos tras resolver los "auto". Se persisten como metadata. */
export interface ResolvedGenerationParameters {
  industry: IndustryId;
  recipeId: string;
  buttonCount: ButtonCount;
  themeId: ThemeId;
  buttonPresetId: ButtonPresetId;
  paletteId: TemplatePaletteId;
  paletteTokens: SemanticPaletteTokens;
  seed: string | number;
  seedValue: number;
  batchId: string;
  index: number;
  gridCols: number;
  profileRadius: string;
  btnRadius: string;
  useBanner: boolean;
  socialCount: number;
  avatarAssetId: string;
  bannerAssetId: string | null;
  randomCallsConsumed: number;
}

export interface GeneratedTemplate {
  templateId: string;
  name: string;
  description: string;
  config: TemplateConfig;
  validation: ValidationResult;
  configHash: string;
  metadata: {
    industry: IndustryId;
    uiIndustry: string;
    category: string;
    style: string;
    themeId: ThemeId;
    buttonPresetId: ButtonPresetId;
    paletteId: TemplatePaletteId;
    paletteTokens: SemanticPaletteTokens;
    layout: string;
    buttonCount: ButtonCount;
    batchId: string;
    generatorVersion: string;
    schemaVersion: number;
    generationParameters: ResolvedGenerationParameters;
    assetRefs: string[];
    extra?: Record<string, unknown> | undefined;
  };
}

/**
 * Genera un TemplateConfig válido de forma determinista.
 * Lanza si el input es inconsistente (industria/receta desconocida, conteo
 * fuera de rango). Un config inválido NO lanza: se devuelve con
 * `validation.valid === false` para que la capa de ingesta lo registre como
 * fallo en lugar de guardarlo como éxito.
 */
export function generateTemplate(input: GenerateTemplateInput): GeneratedTemplate {
  if (!isIndustryId(input.industry)) {
    throw new Error(`Industria no soportada: ${input.industry}`);
  }

  const index = input.index ?? 0;
  const dataset = getIndustryDataset(input.industry);

  // Sub-seed por plantilla: el resultado no depende del orden dentro del batch.
  const rng = new SeededRandom(
    deriveSeed(input.seed, `${input.industry}:${input.batchId}:${index}`),
  );

  // 1. Receta ------------------------------------------------------------
  const recipe = resolveRecipe(input, rng);

  // 2. Cantidad de botones ----------------------------------------------
  const buttonCount = resolveButtonCount(input.buttonCount, rng);

  // 3. Tema y preset ----------------------------------------------------
  const themeId = resolveTheme(input.theme, recipe, rng);
  const buttonPresetId = resolveButtonPreset(input.buttonPreset, recipe, rng);

  // 4. Identidad y assets ------------------------------------------------
  const identity = rng.pick(dataset.identities);
  const avatar = rng.pick(dataset.avatars);
  const useBanner = dataset.banners.length > 0 && rng.bool(recipe.bannerProbability);
  const banner = useBanner ? rng.pick(dataset.banners) : null;
  const footerText = rng.pick(dataset.footerTexts);

  // 5. Botones -----------------------------------------------------------
  const selectedActions = selectActions(dataset.actions, recipe.ctaPriority, buttonCount, rng);
  const links = buildLinks(selectedActions, buttonCount, input.batchId, index);

  // 6. Socials -----------------------------------------------------------
  const [socialMin, socialMax] = recipe.socialRange;
  const socialCount = Math.min(rng.int(socialMin, socialMax), dataset.socialPlatforms.length);
  const socials = buildSocials(
    rng.pickMany(dataset.socialPlatforms, socialCount),
    input.batchId,
    index,
  );

  // 7. Layout / forma ----------------------------------------------------
  const gridCols = buttonCount === 1 ? 1 : rng.pick(recipe.gridCols);
  const profileRadius = rng.pick(recipe.profileRadii);
  const btnRadius = rng.pick(recipe.btnRadii);
  const profileSize = rng.int(30, 38) * 5; // 150..190 px, múltiplos de 5
  const profileBorder = rng.int(2, 5);
  const logoSize = Number((rng.int(28, 38) / 10).toFixed(1)); // 2.8..3.8 rem
  const titleSize = Number((rng.int(18, 26) / 10).toFixed(1)); // 1.8..2.6 rem
  const fontLogo = rng.pick(FONT_LOGO_VALUES);
  const fontHeading = rng.pick(FONT_HEADING_VALUES);
  const layoutKind = gridCols === 1 ? "list" : "grid";
  const palette = selectTemplatePalette({
    industry: input.industry,
    style: recipe.style,
    layout: layoutKind,
    modePreference: "auto",
    seed: input.seed,
    batchId: input.batchId,
    index,
  });
  const paletteAppearance = paletteToThemeAppearance(palette);
  const resolvedThemeId = palette.preferredThemeId;

  // 8. Ensamblado sobre defaults canónicos -------------------------------
  const config = cloneDefaults();

  config.identity = {
    logoText: identity.logoText,
    subtitleText: identity.subtitleText,
    titleText: identity.titleText,
    profileImg: avatar.url,
    bannerImg: banner ? banner.url : "",
  };
  config.content.footerText = footerText;
  config.links = links;
  config.socials = { enabled: socials.length > 0, displayMode: "icons", items: socials };

  config.appearance = {
    ...config.appearance,
    ...THEME_APPEARANCE[themeId],
    ...paletteAppearance,
    banner: {
      ...paletteAppearance.banner,
      // Sin imagen de banner, el bloque queda deshabilitado para no dejar una
      // franja de máscara vacía sobre el fondo.
      enabled: Boolean(banner) && paletteAppearance.banner.enabled,
    },
    themeId: resolvedThemeId,
    btnPresetId: buttonPresetId,
    profileRadius,
    btnRadius,
    fontLogo,
    fontHeading,
    fontSubtitle: fontHeading,
    fontBody: fontHeading,
  };

  config.layout = {
    ...config.layout,
    gridCols,
    profileBorder,
    profileSize,
    logoSize,
    titleSize,
    devicePreview: "mobile",
  };

  // 9. Normalizar + validar ---------------------------------------------
  const normalized = normalizeTemplateConfig(config);
  const validation = validateTemplateConfig(normalized);

  const templateId = buildTemplateId(input.industry, index);
  const assetRefs = [avatar.id, ...(banner ? [banner.id] : [])];

  const generationParameters: ResolvedGenerationParameters = {
    industry: input.industry,
    recipeId: recipe.id,
    buttonCount,
    themeId: resolvedThemeId,
    buttonPresetId,
    paletteId: palette.id,
    paletteTokens: palette.tokens,
    seed: input.seed,
    seedValue: rng.seedValue,
    batchId: input.batchId,
    index,
    gridCols,
    profileRadius,
    btnRadius,
    useBanner: Boolean(banner),
    socialCount: socials.length,
    avatarAssetId: avatar.id,
    bannerAssetId: banner ? banner.id : null,
    randomCallsConsumed: rng.consumed,
  };

  return {
    templateId,
    name: buildTemplateName(identity.logoText, identity.subtitleText),
    description: buildDescription(dataset.uiName, buttonCount, recipe),
    config: normalized,
    validation,
    configHash: stableHash(normalized),
    metadata: {
      industry: input.industry,
      uiIndustry: dataset.uiName,
      category: dataset.category,
      style: recipe.style,
      themeId: resolvedThemeId,
      buttonPresetId,
      paletteId: palette.id,
      paletteTokens: palette.tokens,
      layout: layoutKind,
      buttonCount,
      batchId: input.batchId,
      generatorVersion: GENERATOR_VERSION,
      schemaVersion: normalized.schemaVersion,
      generationParameters,
      assetRefs,
      extra: input.metadata,
    },
  };
}

// --- Resolución de parámetros "auto" ------------------------------------

function resolveRecipe(input: GenerateTemplateInput, rng: SeededRandom): Recipe {
  if (!input.recipe || input.recipe === "auto") {
    const candidates = getRecipesForIndustry(input.industry);
    return candidates.length > 1 ? rng.pick(candidates) : getDefaultRecipe(input.industry);
  }
  const recipe = getRecipe(input.recipe);
  if (recipe.industry !== input.industry) {
    throw new Error(
      `La receta ${recipe.id} pertenece a ${recipe.industry}, no a ${input.industry}`,
    );
  }
  return recipe;
}

function resolveButtonCount(requested: ButtonCount | undefined, rng: SeededRandom): ButtonCount {
  if (requested === undefined) return rng.pick(SUPPORTED_BUTTON_COUNTS);
  if (!SUPPORTED_BUTTON_COUNTS.includes(requested)) {
    throw new Error(`buttonCount no soportado: ${requested} (permitido 1..5)`);
  }
  return requested;
}

function resolveTheme(
  requested: ThemeId | "auto" | undefined,
  recipe: Recipe,
  rng: SeededRandom,
): ThemeId {
  if (!requested || requested === "auto") return rng.pick(recipe.themes);
  if (!THEME_APPEARANCE[requested]) throw new Error(`Tema desconocido: ${requested}`);
  return requested;
}

function resolveButtonPreset(
  requested: ButtonPresetId | "auto" | undefined,
  recipe: Recipe,
  rng: SeededRandom,
): ButtonPresetId {
  if (!requested || requested === "auto") return rng.pick(recipe.buttonPresets);
  if (!BUTTON_PRESET_IDS.includes(requested)) {
    throw new Error(`Preset de botón desconocido: ${requested}`);
  }
  return requested;
}

// --- Selección de acciones ---------------------------------------------

/**
 * Elige `count` acciones con roles distintos siguiendo `ctaPriority`.
 * Requisito de PASS C: no duplicar el mismo botón. Si un rol tiene varias
 * candidatas, el seed decide cuál; si se agotan los roles prioritarios, se
 * rellena con acciones sobrantes sin repetir texto.
 */
function selectActions(
  pool: readonly ActionCandidate[],
  priority: readonly ActionRole[],
  count: number,
  rng: SeededRandom,
): ActionCandidate[] {
  const byRole = new Map<ActionRole, ActionCandidate[]>();
  pool.forEach((action) => {
    const list = byRole.get(action.role) ?? [];
    list.push(action);
    byRole.set(action.role, list);
  });

  const chosen: ActionCandidate[] = [];
  const usedTexts = new Set<string>();

  for (const role of priority) {
    if (chosen.length >= count) break;
    const candidates = (byRole.get(role) ?? []).filter((a) => !usedTexts.has(a.text));
    if (candidates.length === 0) continue;
    const picked = candidates.length === 1 ? candidates[0]! : rng.pick(candidates);
    chosen.push(picked);
    usedTexts.add(picked.text);
  }

  // Relleno: acciones restantes en orden del dataset, sin repetir.
  if (chosen.length < count) {
    for (const action of pool) {
      if (chosen.length >= count) break;
      if (usedTexts.has(action.text)) continue;
      chosen.push(action);
      usedTexts.add(action.text);
    }
  }

  if (chosen.length < count) {
    throw new Error(
      `El dataset no tiene suficientes acciones distintas: se pidieron ${count}, hay ${chosen.length}`,
    );
  }

  return chosen;
}

/**
 * Convierte acciones en links del TemplateConfig.
 * `fullWidth` se aplica al CTA primario cuando el conteo produce una fila
 * impar, que es la misma heurística visual que usa un editor humano.
 */
function buildLinks(
  actions: ActionCandidate[],
  buttonCount: number,
  batchId: string,
  index: number,
): TemplateConfigLink[] {
  const oddCount = buttonCount % 2 === 1;

  return actions.map((action, position) => {
    const icon = isKnownIcon(action.icon)
      ? action.icon
      : ACTION_DEFAULT_ICON[action.actionType];

    return {
      id: buildLinkId(batchId, index, position),
      text: action.text,
      icon,
      url: action.target,
      actionType: action.actionType,
      fullWidth: oddCount && position === 0,
    };
  });
}

function buildSocials(
  platforms: SocialPlatformId[],
  batchId: string,
  index: number,
): TemplateConfigSocialItem[] {
  return platforms.map((platform, position) => ({
    id: buildSocialId(batchId, index, position),
    platform,
    label: SOCIAL_PLATFORM_LABELS[platform],
    url: socialDemoUrl(platform),
    iconId: platform,
    enabled: true,
  }));
}

/** Destinos de demostración seguros (nunca javascript:/data:/file:). */
function socialDemoUrl(platform: SocialPlatformId): string {
  switch (platform) {
    case "instagram":
      return "https://instagram.com/demo.cripqer";
    case "facebook":
      return "https://facebook.com/demo.cripqer";
    case "tiktok":
      return "https://tiktok.com/@demo.cripqer";
    case "youtube":
      return "https://youtube.com/@demo.cripqer";
    case "linkedin":
      return "https://linkedin.com/company/demo-cripqer";
    case "twitter":
      return "https://twitter.com/demo_cripqer";
    case "whatsapp":
      return "https://wa.me/56900000000";
    case "telegram":
      return "https://t.me/demo_cripqer";
    case "email":
      return "contacto@example.com";
    case "website":
      return "https://www.example.com";
  }
}

// --- Identificadores ----------------------------------------------------

/** Formato: tpl-<industry>-<generatorVersion>-<índice a 4 dígitos>. */
export function buildTemplateId(industry: IndustryId, index: number): string {
  return `tpl-${industry}-${GENERATOR_VERSION}-${String(index + 1).padStart(4, "0")}`;
}

function buildLinkId(batchId: string, index: number, position: number): string {
  return `${slug(batchId)}_t${index}_b${position + 1}`;
}

function buildSocialId(batchId: string, index: number, position: number): string {
  return `${slug(batchId)}_t${index}_s${position + 1}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildTemplateName(logoText: string, subtitle: string): string {
  const title = subtitle.charAt(0) + subtitle.slice(1).toLowerCase();
  return `${logoText} · ${title}`;
}

function buildDescription(uiIndustry: string, buttonCount: number, recipe: Recipe): string {
  const plural = buttonCount === 1 ? "botón" : "botones";
  return `Plantilla ${uiIndustry.toLowerCase()} (${recipe.label}) con ${buttonCount} ${plural}.`;
}

// --- Batch --------------------------------------------------------------

export interface GenerateBatchInput {
  industry: IndustryId;
  count: number;
  seed: string | number;
  batchId: string;
  recipePool?: readonly string[];
  buttonCountPool?: readonly ButtonCount[];
  metadata?: Record<string, unknown>;
}

export interface BatchSummary {
  batchId: string;
  generatorVersion: string;
  createdAt: string;
  industry: IndustryId;
  requestedCount: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  generationParameters: {
    seed: string | number;
    recipePool: string[];
    buttonCountPool: number[];
  };
  templates: GeneratedTemplate[];
  failures: { index: number; errors: string[] }[];
  duplicates: { index: number; configHash: string; duplicateOfTemplateId: string }[];
}

/**
 * Límite duro para prevenir generación descontrolada por accidente.
 * PASS C solo autoriza un set de pruebas pequeño.
 */
export const MAX_BATCH_SIZE = 10;

export function generateBatch(input: GenerateBatchInput): BatchSummary {
  if (!Number.isInteger(input.count) || input.count <= 0) {
    throw new Error("count debe ser un entero positivo y explícito");
  }
  if (input.count > MAX_BATCH_SIZE) {
    throw new Error(
      `count ${input.count} excede el límite de seguridad de ${MAX_BATCH_SIZE} por corrida`,
    );
  }

  const recipePool =
    input.recipePool && input.recipePool.length > 0
      ? [...input.recipePool]
      : getRecipesForIndustry(input.industry).map((recipe) => recipe.id);
  const buttonCountPool =
    input.buttonCountPool && input.buttonCountPool.length > 0
      ? [...input.buttonCountPool]
      : [...SUPPORTED_BUTTON_COUNTS];

  const templates: GeneratedTemplate[] = [];
  const failures: BatchSummary["failures"] = [];
  const duplicates: BatchSummary["duplicates"] = [];
  const seenHashes = new Map<string, string>();

  for (let index = 0; index < input.count; index++) {
    // Selector estable por índice: no consume el RNG de la plantilla, así que
    // cambiar `count` no altera las plantillas ya generadas.
    const selector = new SeededRandom(deriveSeed(input.seed, `select:${input.batchId}:${index}`));
    const recipeId = selector.pick(recipePool);
    const buttonCount = selector.pick(buttonCountPool);

    try {
      const generated = generateTemplate({
        industry: input.industry,
        recipe: recipeId,
        buttonCount,
        seed: input.seed,
        batchId: input.batchId,
        index,
        metadata: input.metadata,
      });

      if (!generated.validation.valid) {
        failures.push({ index, errors: generated.validation.errors });
        continue;
      }

      const previous = seenHashes.get(generated.configHash);
      if (previous) {
        duplicates.push({
          index,
          configHash: generated.configHash,
          duplicateOfTemplateId: previous,
        });
        continue;
      }

      seenHashes.set(generated.configHash, generated.templateId);
      templates.push(generated);
    } catch (error) {
      failures.push({
        index,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  return {
    batchId: input.batchId,
    generatorVersion: GENERATOR_VERSION,
    createdAt: new Date().toISOString(),
    industry: input.industry,
    requestedCount: input.count,
    successCount: templates.length,
    failureCount: failures.length,
    duplicateCount: duplicates.length,
    generationParameters: {
      seed: input.seed,
      recipePool,
      buttonCountPool: [...buttonCountPool],
    },
    templates,
    failures,
    duplicates,
  };
}
