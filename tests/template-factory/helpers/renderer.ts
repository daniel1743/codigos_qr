/**
 * Helper para conducir el renderer compartido desde Playwright.
 * PASS C · generator-v1
 *
 * El renderer vive en `public/template-builder.html`, un HTML standalone. Se
 * carga por file://, sin dev server, y se le habla por sus funciones globales
 * (`loadTemplateConfig`, `getTemplateConfig`, ...), que son exactamente las que
 * usa el editor humano. Así se cumple la regla de PASS C: un solo renderer
 * compartido, nunca un preview paralelo.
 */

import { pathToFileURL } from "node:url";
import path from "node:path";
import type { Page } from "@playwright/test";

// El paquete es ESM ("type": "module"), donde __dirname no existe. Playwright
// ejecuta con cwd en la raíz del repo, así que se resuelve desde ahí.
export const REPO_ROOT = process.cwd();

export const RENDERER_URL = pathToFileURL(
  path.join(REPO_ROOT, "public", "template-builder.html"),
).href;

export interface RendererErrors {
  pageErrors: string[];
  consoleErrors: string[];
}

/**
 * Carga el renderer y empieza a capturar errores.
 * Las fuentes/iconos vienen de CDN y por file:// pueden no resolver; eso no es
 * un fallo del config, así que los errores de red de terceros se filtran.
 */
export async function openRenderer(page: Page): Promise<RendererErrors> {
  const errors: RendererErrors = { pageErrors: [], consoleErrors: [] };

  page.on("pageerror", (error) => errors.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isThirdPartyNoise(text)) return;
    errors.consoleErrors.push(text);
  });

  await page.goto(RENDERER_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      typeof (window as never as Record<string, unknown>)["loadTemplateConfig"] === "function" &&
      typeof (window as never as Record<string, unknown>)["getTemplateConfig"] === "function",
    undefined,
    { timeout: 15_000 },
  );

  return errors;
}

/** Ruido de CDN/red que no indica un problema del TemplateConfig. */
function isThirdPartyNoise(text: string): boolean {
  return /net::ERR|Failed to load resource|cdn\.tailwindcss|fonts\.googleapis|cdnjs\.cloudflare|font-awesome|Sortable/i.test(
    text,
  );
}

export interface LoadResult {
  ok: boolean;
  error: string | null;
}

/**
 * Carga un config por la vía canónica del editor.
 * Devuelve el resultado en lugar de lanzar, para que el test pueda registrar
 * el fallo como evidencia de QA (`rendererSuccess`) en vez de abortar la corrida.
 */
export async function loadConfig(page: Page, config: unknown): Promise<LoadResult> {
  return page.evaluate((incoming) => {
    try {
      (window as never as { loadTemplateConfig: (c: unknown) => void }).loadTemplateConfig(
        incoming,
      );
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, config);
}

/** Exporta el config actual, igual que haría el editor. */
export async function exportConfig(page: Page): Promise<unknown> {
  return page.evaluate(() =>
    (window as never as { getTemplateConfig: () => unknown }).getTemplateConfig(),
  );
}

/** Valida usando el validador del renderer, no el espejo tipado. */
export async function validateInRenderer(
  page: Page,
  config: unknown,
): Promise<{ valid: boolean; errors: string[] }> {
  return page.evaluate((incoming) => {
    return (
      window as never as {
        validateTemplateConfig: (c: unknown) => { valid: boolean; errors: string[] };
      }
    ).validateTemplateConfig(incoming);
  }, config);
}

export interface RenderedSnapshot {
  buttonCount: number;
  buttonTexts: string[];
  buttonHrefs: string[];
  socialCount: number;
  logoText: string;
  subtitleText: string;
  titleText: string;
  footerText: string;
  profileSrc: string;
  gridClass: string;
}

/** Lee lo que el renderer efectivamente pintó en el canvas. */
export async function readRenderedSnapshot(page: Page): Promise<RenderedSnapshot> {
  return page.evaluate(() => {
    const text = (selector: string) =>
      document.querySelector(selector)?.textContent?.trim() ?? "";
    const grid = document.getElementById("view-buttons-grid");
    const anchors = Array.from(grid?.querySelectorAll("a") ?? []);
    const socials = Array.from(
      document.getElementById("view-social-icons")?.querySelectorAll("a") ?? [],
    );

    return {
      buttonCount: anchors.length,
      buttonTexts: anchors.map((a) => a.querySelector("span")?.textContent?.trim() ?? ""),
      buttonHrefs: anchors.map((a) => a.getAttribute("href") ?? ""),
      socialCount: socials.length,
      logoText: text("#view-logo"),
      subtitleText: text("#view-subtitle"),
      titleText: text("#view-title"),
      footerText: text("#view-footer-text"),
      profileSrc:
        (document.getElementById("view-profile-img") as HTMLImageElement | null)?.getAttribute(
          "src",
        ) ?? "",
      gridClass: grid?.className ?? "",
    };
  });
}

/**
 * Mide overflow horizontal dentro del canvas del teléfono.
 * Se mide el canvas, no el body: el body contiene el chrome del editor, que no
 * forma parte de la plantilla.
 */
export async function measureOverflow(
  page: Page,
): Promise<{ scrollWidth: number; clientWidth: number; overflowPx: number }> {
  return page.evaluate(() => {
    const canvas = document.getElementById("render-canvas");
    if (!canvas) return { scrollWidth: 0, clientWidth: 0, overflowPx: 0 };
    return {
      scrollWidth: canvas.scrollWidth,
      clientWidth: canvas.clientWidth,
      overflowPx: Math.max(0, canvas.scrollWidth - canvas.clientWidth),
    };
  });
}

/** Extrae los registros vivos del renderer, para el chequeo de paridad. */
export async function readRendererRegistries(page: Page): Promise<{
  themeIds: string[];
  buttonPresetIds: string[];
  iconClasses: string[];
  actionTypeIds: string[];
  socialPlatformIds: string[];
  defaultConfig: unknown;
}> {
  // Estos registros se declaran con `const` en el nivel superior de un <script>
  // clásico, así que NO son propiedades de `window`: viven en el entorno léxico
  // global. Hay que leerlos como identificadores desnudos (page.evaluate corre
  // en ese mismo scope) y no como window[...], que daría undefined y haría
  // pasar el chequeo de paridad en falso.
  return page.evaluate(() => {
    const read = <T,>(expression: string, fallback: T): T => {
      try {
        // eslint-disable-next-line no-eval
        const value = eval(expression) as T | undefined;
        return value ?? fallback;
      } catch {
        return fallback;
      }
    };

    const themes = read<{ id: string }[]>("PREMIUM_THEMES", []);
    const presets = read<{ id: string }[]>("BUTTON_PRESETS", []);
    const icons = read<{ class: string }[]>("availableIcons", []);
    const actions = read<{ id: string }[]>("ACTION_TYPES", []);
    const socials = read<Record<string, unknown>>("SOCIAL_PLATFORMS", {});

    return {
      themeIds: themes.map((t) => t.id),
      buttonPresetIds: presets.map((p) => p.id),
      iconClasses: icons.map((i) => i.class),
      actionTypeIds: actions.map((a) => a.id),
      socialPlatformIds: Object.keys(socials),
      defaultConfig: read<unknown>("DEFAULT_TEMPLATE_CONFIG", null),
    };
  });
}
