/**
 * RECOVERY 01 — Pipeline obligatorio de 11 pasos, ejecutado de verdad.
 *
 * Este archivo se reescribió por completo. La versión anterior se escribió
 * contra una API imaginada (applyConfig, loadSharedRenderer, readRenderedState,
 * roundTripTemplateConfig, scoreTemplate) y nunca llegó a ejecutarse: fallaba
 * al cargar el módulo. Aquí todo se llama contra las firmas reales verificadas
 * en src/lib/template-factory/*.
 *
 * El renderer compartido se carga por file://, sin dev server y sin Supabase.
 */

import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  openRenderer,
  loadConfig,
  exportConfig,
  validateInRenderer,
  readRendererRegistries,
  readRenderedSnapshot,
  measureOverflow,
  type RendererErrors,
} from "./helpers/renderer";

import { generateTemplate, type ButtonCount } from "../../src/lib/template-factory/generator";
import {
  validateTemplateConfig,
  roundTripConfig,
  diffConfigs,
  findNonSerializable,
  isUnsafeUrl,
  type TemplateConfig,
} from "../../src/lib/template-factory/config";
import {
  computeQaScore,
  QA_VIEWPORTS,
  OVERFLOW_TOLERANCE_PX,
  type QaCheckResults,
  type QaFinding,
} from "../../src/lib/template-factory/qa";
import {
  THEME_IDS,
  BUTTON_PRESET_IDS,
  ICON_CLASSES,
  ACTION_TYPE_IDS,
} from "../../src/lib/template-factory/registries";

const ARTIFACTS = join(process.cwd(), "artifacts", "template-factory", "recovery-01");
const CONFIGS_DIR = join(ARTIFACTS, "generated-test-configs");
const SHOTS_DIR = join(ARTIFACTS, "screenshots");

function writeArtifact(name: string, data: unknown) {
  mkdirSync(ARTIFACTS, { recursive: true });
  writeFileSync(join(ARTIFACTS, name), JSON.stringify(data, null, 2), "utf8");
}

/** Matriz exigida por la spec de PASS C (sección 32). */
const MATRIX = [
  { industry: "medical", recipe: "medical_clean", buttonCount: 1, seed: "rec01-m1" },
  { industry: "medical", recipe: "medical_clean", buttonCount: 5, seed: "rec01-m5" },
  { industry: "legal", recipe: "lawyer_executive", buttonCount: 3, seed: "rec01-l3" },
  { industry: "restaurant", recipe: "restaurant_premium", buttonCount: 4, seed: "rec01-r4" },
  { industry: "barber", recipe: "barber_modern", buttonCount: 2, seed: "rec01-b2" },
] as const;

/** Fixtures de PASS A: 1..5 botones, recuperación de la evidencia que faltaba. */
const PASS_A_COUNTS: ButtonCount[] = [1, 2, 3, 4, 5];

test.describe("RECOVERY 01 — núcleo generador/config/renderer", () => {
  test("paridad de registros: el generador solo emite valores que el renderer conoce", async ({
    page,
  }) => {
    await openRenderer(page);
    const live = await readRendererRegistries(page);

    // Si esto viniera vacío, el chequeo pasaría en falso. Se afirma primero.
    expect(live.themeIds.length, "el renderer expuso PREMIUM_THEMES").toBeGreaterThan(0);
    expect(live.buttonPresetIds.length, "el renderer expuso BUTTON_PRESETS").toBeGreaterThan(0);
    expect(live.iconClasses.length, "el renderer expuso availableIcons").toBeGreaterThan(0);

    const unknownThemes = THEME_IDS.filter((id) => !live.themeIds.includes(id));
    const unknownPresets = BUTTON_PRESET_IDS.filter((id) => !live.buttonPresetIds.includes(id));
    const unknownIcons = ICON_CLASSES.filter((c) => !live.iconClasses.includes(c));
    const unknownActions = ACTION_TYPE_IDS.filter((a) => !live.actionTypeIds.includes(a));

    const total =
      unknownThemes.length + unknownPresets.length + unknownIcons.length + unknownActions.length;

    writeArtifact("registry-parity-results.json", {
      executedAt: new Date().toISOString(),
      renderer: live,
      generator: {
        themeIds: THEME_IDS,
        buttonPresetIds: BUTTON_PRESET_IDS,
        iconClasses: ICON_CLASSES,
        actionTypeIds: ACTION_TYPE_IDS,
      },
      unknownThemes,
      unknownPresets,
      unknownIcons,
      unknownActions,
      verdict: total === 0 ? "PASS" : "FAIL",
    });

    expect(unknownThemes, "temas inventados por el generador").toEqual([]);
    expect(unknownPresets, "presets inventados por el generador").toEqual([]);
    expect(unknownIcons, "iconos inventados por el generador").toEqual([]);
    expect(unknownActions, "actionTypes inventados por el generador").toEqual([]);
  });

  test("determinismo: misma semilla produce config idéntica, distinta semilla varía", async () => {
    const seedFijo = "cripqer-audit-seed-001";

    const a = generateTemplate({
      industry: "medical",
      recipe: "medical_clean",
      buttonCount: 3,
      seed: seedFijo,
      batchId: "rec01-det",
    });
    const b = generateTemplate({
      industry: "medical",
      recipe: "medical_clean",
      buttonCount: 3,
      seed: seedFijo,
      batchId: "rec01-det",
    });
    const c = generateTemplate({
      industry: "medical",
      recipe: "medical_clean",
      buttonCount: 3,
      seed: "cripqer-audit-seed-999",
      batchId: "rec01-det",
    });

    const ja = JSON.stringify(a.config);
    const jb = JSON.stringify(b.config);
    const jc = JSON.stringify(c.config);

    const sameSeedIdentical = ja === jb;
    const hashesMatch = a.configHash === b.configHash;
    const differentSeedDiffers = ja !== jc;
    const diffAB = diffConfigs(a.config, b.config);
    const diffAC = diffConfigs(a.config, c.config);

    writeArtifact("determinism-results.json", {
      executedAt: new Date().toISOString(),
      test1: {
        input: { industry: "medical", recipe: "medical_clean", buttonCount: 3, seed: seedFijo },
        ranTwice: true,
        sameSeedIdentical,
        hashA: a.configHash,
        hashB: b.configHash,
        hashesMatch,
        differences: diffAB,
      },
      test2: {
        input: { seed: "cripqer-audit-seed-999" },
        differentSeedDiffers,
        hashC: c.configHash,
        differenceCount: diffAC.length,
        sampleDifferences: diffAC.slice(0, 12),
      },
      verdict: sameSeedIdentical && hashesMatch && differentSeedDiffers ? "PASS" : "FAIL",
    });

    expect(diffAB, "misma semilla => cero diferencias").toEqual([]);
    expect(jb, "misma semilla => misma config serializada").toBe(ja);
    expect(a.configHash, "misma semilla => mismo hash").toBe(b.configHash);
    expect(differentSeedDiffers, "semilla distinta => config distinta").toBe(true);
  });

  test("PASS A recuperado: round-trip real de fixtures 1..5 botones", async ({ page }) => {
    const rendererErrors = await openRenderer(page);
    const rows: unknown[] = [];

    for (const count of PASS_A_COUNTS) {
      const label = `fixture-${count}-button`;

      const gen = generateTemplate({
        industry: "medical",
        recipe: "medical_clean",
        buttonCount: count,
        seed: `rec01-passa-${count}`,
        batchId: "rec01-passa",
      });

      // Se carga por la vía canónica y se exporta con getTemplateConfig.
      await loadConfig(page, gen.config);
      const back = (await exportConfig(page)) as TemplateConfig;
      const rendered = await readRenderedSnapshot(page);

      const before = gen.config;
      const idsBefore = before.links.map((l) => l.id);
      const idsAfter = back.links.map((l) => l.id);

      const row = {
        label,
        buttonCount: count,
        // Comparación campo por campo, no un booleano opaco.
        buttonCountPreserved: back.links.length === count,
        renderedButtonCount: rendered.buttonCount,
        renderedMatchesConfig: rendered.buttonCount === count,
        stableIdsPreserved: JSON.stringify(idsBefore) === JSON.stringify(idsAfter),
        orderPreserved:
          JSON.stringify(before.links.map((l) => l.text)) ===
          JSON.stringify(back.links.map((l) => l.text)),
        labelsPreserved: before.links.every((l, i) => l.text === back.links[i]?.text),
        urlsPreserved: before.links.every((l, i) => l.url === back.links[i]?.url),
        iconsPreserved: before.links.every((l, i) => l.icon === back.links[i]?.icon),
        actionTypesPreserved: before.links.every(
          (l, i) => (l.actionType ?? "url") === (back.links[i]?.actionType ?? "url"),
        ),
        themePreserved: before.appearance.themeId === back.appearance.themeId,
        presetPreserved: before.appearance.btnPresetId === back.appearance.btnPresetId,
        profilePreserved:
          before.identity.titleText === back.identity.titleText &&
          before.identity.subtitleText === back.identity.subtitleText &&
          before.identity.logoText === back.identity.logoText &&
          before.identity.profileImg === back.identity.profileImg,
        socialsCountPreserved: before.socials.items.length === back.socials.items.length,
        renderedTitle: rendered.titleText,
        configTitle: before.identity.titleText,
        differences: diffConfigs(before, back),
      };

      rows.push(row);
    }

    const allOk = rows.every((r) => {
      const row = r as Record<string, unknown>;
      return (
        row["buttonCountPreserved"] === true &&
        row["renderedMatchesConfig"] === true &&
        row["stableIdsPreserved"] === true &&
        row["orderPreserved"] === true &&
        row["labelsPreserved"] === true &&
        row["urlsPreserved"] === true &&
        row["iconsPreserved"] === true &&
        row["themePreserved"] === true &&
        row["presetPreserved"] === true &&
        row["profilePreserved"] === true
      );
    });

    writeArtifact("pass-a-roundtrip-results.json", {
      executedAt: new Date().toISOString(),
      note: "Recuperación de la evidencia que PASS A reportó sin ejecutar.",
      fixtures: rows,
      rendererErrors,
      verdict: allOk ? "PASS" : "FAIL",
    });

    for (const r of rows) {
      const row = r as Record<string, unknown>;
      const name = String(row["label"]);
      expect(row["buttonCountPreserved"], `${name}: conteo de botones`).toBe(true);
      expect(row["renderedMatchesConfig"], `${name}: botones en el DOM`).toBe(true);
      expect(row["stableIdsPreserved"], `${name}: IDs estables`).toBe(true);
      expect(row["orderPreserved"], `${name}: orden`).toBe(true);
      expect(row["urlsPreserved"], `${name}: URLs`).toBe(true);
      expect(row["iconsPreserved"], `${name}: iconos`).toBe(true);
      expect(row["themePreserved"], `${name}: tema`).toBe(true);
      expect(row["presetPreserved"], `${name}: preset`).toBe(true);
    }
  });

  test("pipeline obligatorio de 11 pasos sobre la matriz completa", async ({ page }) => {
    mkdirSync(CONFIGS_DIR, { recursive: true });
    mkdirSync(SHOTS_DIR, { recursive: true });

    const rendererErrors: RendererErrors = await openRenderer(page);
    const results: unknown[] = [];
    const screenshots: string[] = [];

    for (const row of MATRIX) {
      const label = `${row.industry}-${row.buttonCount}btn`;
      const steps: Record<string, boolean | string> = {};

      // Paso 1: generar de forma determinista.
      const gen = generateTemplate({
        industry: row.industry,
        recipe: row.recipe,
        buttonCount: row.buttonCount,
        seed: row.seed,
        batchId: "rec01-pipeline",
      });
      steps["step1_generate"] = true;

      // Paso 2: normalizar (el generador ya normaliza; se comprueba idempotencia).
      const rt = roundTripConfig(gen.config);
      steps["step2_normalize"] = rt.ok;

      // Paso 3: validar con el validador tipado.
      const localValidation = validateTemplateConfig(gen.config);
      steps["step3_validate"] = localValidation.valid;

      // Paso 4: serializar. Sin File/Blob/función/DOM.
      const nonSerializable = findNonSerializable(gen.config);
      const serialized = JSON.stringify(gen.config);
      steps["step4_serialize"] = nonSerializable.length === 0;
      writeFileSync(
        join(CONFIGS_DIR, `${label}.json`),
        JSON.stringify(gen.config, null, 2),
        "utf8",
      );

      // Paso 5: cargar el renderer compartido (ya abierto arriba).
      steps["step5_openRenderer"] = true;

      // Paso 6: aplicar el config por la vía canónica del editor.
      await loadConfig(page, gen.config);
      steps["step6_applyConfig"] = true;

      // Paso 7: renderizar y leer lo pintado.
      const rendered = await readRenderedSnapshot(page);
      steps["step7_render"] = rendered.buttonCount > 0;

      // Paso 8: inspeccionar el estado renderizado.
      const buttonIntegrity =
        rendered.buttonCount === row.buttonCount &&
        rendered.titleText === gen.config.identity.titleText;
      steps["step8_inspect"] = buttonIntegrity;

      // Paso 9: leer el config de vuelta.
      const back = (await exportConfig(page)) as TemplateConfig;
      steps["step9_readBack"] = Boolean(back);

      // Paso 10: comparar round-trip contra el renderer real.
      const editorDiff = diffConfigs(gen.config, back);
      steps["step10_roundTrip"] = editorDiff.length === 0;

      // Validación cruzada con el validador del propio renderer.
      const rendererValidation = await validateInRenderer(page, gen.config);

      // QA por viewports, con la tolerancia definida en qa.ts.
      const viewports: { name: string; width: number; overflowPx: number; overflow: boolean }[] = [];
      for (const vp of QA_VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const m = await measureOverflow(page);
        viewports.push({
          name: vp.name,
          width: vp.width,
          overflowPx: m.overflowPx,
          overflow: m.overflowPx > OVERFLOW_TOLERANCE_PX,
        });
      }

      await page.setViewportSize({ width: 390, height: 844 });
      const shotPath = join(SHOTS_DIR, `${label}.png`);
      await page.screenshot({ path: shotPath });
      screenshots.push(`${label}.png`);

      const unsafeUrls = gen.config.links.filter((l) => isUnsafeUrl(l.url)).map((l) => l.url);
      const assetRefsOk = Boolean(gen.config.identity.profileImg);

      // Paso 11: QA con la firma REAL de computeQaScore (7 booleanos).
      const checks: QaCheckResults = {
        schemaValid: localValidation.valid && rendererValidation.valid,
        rendererSuccess: rendered.buttonCount > 0 && rendererErrors.pageErrors.length === 0,
        noOverflow: viewports.every((v) => !v.overflow),
        buttonIntegrity,
        assetIntegrity: assetRefsOk,
        urlSafety: unsafeUrls.length === 0,
        roundTrip: rt.ok && editorDiff.length === 0,
      };

      const extraFindings: QaFinding[] = viewports
        .filter((v) => v.overflow)
        .map((v) => ({
          check: "viewport" as const,
          severity: "warning" as const,
          message: `Overflow horizontal en ${v.name}`,
          detail: `${v.overflowPx}px`,
        }));

      const qa = computeQaScore(checks, extraFindings);
      steps["step11_qa"] = qa.blockingOk;

      results.push({
        label,
        industry: row.industry,
        recipe: row.recipe,
        buttonCount: row.buttonCount,
        seed: row.seed,
        templateId: gen.templateId,
        configHash: gen.configHash,
        themeId: gen.config.appearance.themeId,
        btnPresetId: gen.config.appearance.btnPresetId,
        steps,
        localValidation,
        rendererValidation,
        nonSerializable,
        renderedButtonCount: rendered.buttonCount,
        renderedTitle: rendered.titleText,
        serializedBytes: serialized.length,
        editorRoundTripDifferences: editorDiff,
        viewports,
        unsafeUrls,
        qaScore: qa.score,
        qaScoreNormalized: qa.scoreNormalized,
        qaPassed: qa.passed,
        qaFailed: qa.failed,
        qaBlockingOk: qa.blockingOk,
        screenshot: `screenshots/${label}.png`,
      });

      // El config del generador no lleva estado de publicación: eso es de la
      // capa de ingesta, y siempre arranca en GENERATED_PRIVATE.
      expect(Object.keys(gen.config)).not.toContain("publication_status");
      expect(Object.keys(gen.config)).not.toContain("is_public");
    }

    // Variación real dentro de la misma industria.
    const medical = results.filter((r) => (r as { industry: string }).industry === "medical");
    const medicalHashes = medical.map((r) => (r as { configHash: string }).configHash);
    const medicalDiffer = new Set(medicalHashes).size === medical.length;

    const allBlockingOk = results.every((r) => (r as { qaBlockingOk: boolean }).qaBlockingOk);

    writeArtifact("pipeline-results.json", {
      executedAt: new Date().toISOString(),
      rendererUrl: "file:// public/template-builder.html",
      matrix: MATRIX,
      results,
      screenshotsProduced: screenshots,
      medicalVariation: { hashes: medicalHashes, allDifferent: medicalDiffer },
      rendererErrors,
      verdict: allBlockingOk && medicalDiffer ? "PASS" : "FAIL",
    });

    expect(medical.length, "dos fixtures médicas en la matriz").toBe(2);
    expect(medicalDiffer, "dos plantillas de la misma industria deben diferir").toBe(true);

    for (const r of results) {
      const row = r as Record<string, unknown>;
      const name = String(row["label"]);
      expect(row["nonSerializable"], `${name}: valores no serializables`).toEqual([]);
      expect(row["unsafeUrls"], `${name}: URLs peligrosas`).toEqual([]);
      expect(row["qaBlockingOk"], `${name}: chequeos bloqueantes de QA`).toBe(true);
    }
  });

  test("seguridad de publicación: la ingesta no puede publicar ni aprobar", async () => {
    const mod = await import("../../src/lib/template-factory/ingestion");
    const exported = Object.keys(mod);
    const forbidden = exported.filter((k) => /publish|approve/i.test(k));

    const { buildIngestionRecord, assertSafeForIngestion, INITIAL_PUBLICATION_STATUS } = mod;

    const gen = generateTemplate({
      industry: "legal",
      recipe: "lawyer_executive",
      buttonCount: 3,
      seed: "rec01-safety",
      batchId: "rec01-safety",
    });

    // Caso normal: el estado inicial debe ser GENERATED_PRIVATE.
    const outcome = buildIngestionRecord(gen, null);
    const accepted = outcome.ok ? outcome.record : null;

    // Intento de forzar PUBLIC/is_public por la superficie de entrada.
    let overrideRejected = false;
    let overrideError = "";
    if (accepted) {
      const tampered = { ...accepted, publication_status: "PUBLIC" } as typeof accepted;
      try {
        assertSafeForIngestion(tampered);
      } catch (error) {
        overrideRejected = true;
        overrideError = (error as Error).message;
      }
    }

    let publicFlagRejected = false;
    let publicFlagError = "";
    if (accepted) {
      const tampered = { ...accepted, is_public: true } as unknown as typeof accepted;
      try {
        assertSafeForIngestion(tampered);
      } catch (error) {
        publicFlagRejected = true;
        publicFlagError = (error as Error).message;
      }
    }

    const verdict =
      forbidden.length === 0 &&
      accepted?.publication_status === INITIAL_PUBLICATION_STATUS &&
      accepted?.is_public === false &&
      overrideRejected &&
      publicFlagRejected
        ? "PASS"
        : "FAIL";

    writeArtifact("publication-safety-results.json", {
      executedAt: new Date().toISOString(),
      exportedSymbols: exported,
      forbiddenSymbols: forbidden,
      initialStatus: accepted?.publication_status ?? null,
      initialIsPublic: accepted?.is_public ?? null,
      statusOverrideRejected: overrideRejected,
      statusOverrideError: overrideError,
      publicFlagOverrideRejected: publicFlagRejected,
      publicFlagOverrideError: publicFlagError,
      verdict,
    });

    expect(forbidden, "la ingesta no expone publicar/aprobar").toEqual([]);
    expect(accepted, "la ingesta aceptó un template válido").not.toBeNull();
    expect(accepted?.publication_status, "estado inicial forzado").toBe(INITIAL_PUBLICATION_STATUS);
    expect(accepted?.is_public, "is_public inicial").toBe(false);
    expect(overrideRejected, "forzar PUBLIC debe ser rechazado").toBe(true);
    expect(publicFlagRejected, "forzar is_public=true debe ser rechazado").toBe(true);
  });
});
