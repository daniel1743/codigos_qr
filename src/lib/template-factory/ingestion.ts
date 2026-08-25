/**
 * Template Factory — Frontera de ingesta a la biblioteca privada (PASS B)
 * PASS C · generator-v1
 *
 * Único punto por el que una plantilla generada entra al sistema. Traduce
 * `GeneratedTemplate` + `QaResult` al registro que espera `template_bank`.
 *
 * INVARIANTES DE SEGURIDAD (verificadas por tests):
 *  1. El estado inicial es SIEMPRE `GENERATED_PRIVATE`.
 *  2. `is_public` es SIEMPRE false.
 *  3. Este módulo no importa ni expone `publishTemplate` / `approveTemplate`.
 *     El generador no tiene forma de publicar ni aprobar, ni por accidente.
 *  4. Un config inválido o que falle un chequeo bloqueante NO entra como éxito:
 *     se devuelve como fallo de generación para registro.
 */

import type { GeneratedTemplate } from "./generator";
import { GENERATOR_VERSION } from "./generator";
import { BLOCKING_CHECKS, type QaResult } from "./qa";

/** Estado inicial inmutable de toda plantilla generada. */
export const INITIAL_PUBLICATION_STATUS = "GENERATED_PRIVATE" as const;

/**
 * Fila lista para insertar en `template_bank`. Se mantiene como objeto plano y
 * serializable para poder auditarla y snapshotearla en los artefactos.
 */
export interface IngestionRecord {
  name: string;
  description: string;
  config_json: unknown;
  preview_image: string | null;
  template_type: "private";
  is_public: false;
  publication_status: typeof INITIAL_PUBLICATION_STATUS;
  category: string;
  industry: string;
  style: string;
  theme: string;
  layout: string;
  schema_version: number;
  generation_source: string;
  generator_version: string;
  batch_id: string;
  validation_status: "valid" | "invalid";
  qa_score: number | null;
  qa_findings: unknown[];
}

export interface IngestionRejection {
  templateId: string;
  reason: "invalid-config" | "blocking-qa-failure";
  errors: string[];
}

export type IngestionOutcome =
  | { ok: true; templateId: string; record: IngestionRecord }
  | { ok: false; rejection: IngestionRejection };

/**
 * Construye el registro de ingesta. Función pura: no toca la red ni la base de
 * datos, para que los tests puedan verificar los invariantes sin Supabase.
 */
export function buildIngestionRecord(
  generated: GeneratedTemplate,
  qa: QaResult | null,
): IngestionOutcome {
  // Invariante 4a: esquema inválido nunca entra como éxito.
  if (!generated.validation.valid) {
    return {
      ok: false,
      rejection: {
        templateId: generated.templateId,
        reason: "invalid-config",
        errors: generated.validation.errors,
      },
    };
  }

  // Invariante 4b: fallo en un chequeo bloqueante tampoco.
  if (qa && !qa.blockingOk) {
    const blockingFailures = qa.failed.filter((check) => BLOCKING_CHECKS.includes(check));
    return {
      ok: false,
      rejection: {
        templateId: generated.templateId,
        reason: "blocking-qa-failure",
        errors: blockingFailures.map(
          (check) =>
            qa.findings.find((finding) => finding.check === check)?.message ??
            `Chequeo bloqueante fallido: ${check}`,
        ),
      },
    };
  }

  const meta = generated.metadata;

  return {
    ok: true,
    templateId: generated.templateId,
    record: {
      name: generated.name,
      description: generated.description,
      config_json: generated.config,
      // El preview real lo produce el renderer compartido; no se guarda un
      // screenshot como payload principal de la plantilla (política de PASS B).
      preview_image: null,
      template_type: "private",
      is_public: false,
      publication_status: INITIAL_PUBLICATION_STATUS,
      category: meta.category,
      industry: meta.industry,
      style: meta.style,
      theme: meta.themeId,
      layout: meta.layout,
      schema_version: meta.schemaVersion,
      generation_source: GENERATOR_VERSION,
      generator_version: GENERATOR_VERSION,
      batch_id: meta.batchId,
      validation_status: "valid",
      qa_score: qa ? qa.scoreNormalized : null,
      qa_findings: qa
        ? [
            {
              kind: "qa-summary",
              score: qa.score,
              passed: qa.passed,
              failed: qa.failed,
            },
            ...qa.findings,
            {
              kind: "generation-parameters",
              parameters: meta.generationParameters,
              assetRefs: meta.assetRefs,
              configHash: generated.configHash,
            },
          ]
        : [],
    },
  };
}

/**
 * Verificación defensiva del registro antes de persistirlo.
 * Se ejecuta en los tests y en el runner: si algún día alguien cambia el
 * builder, esto falla de forma ruidosa en lugar de publicar algo por error.
 */
export function assertSafeForIngestion(record: IngestionRecord): void {
  if (record.publication_status !== INITIAL_PUBLICATION_STATUS) {
    throw new Error(
      `Ingesta insegura: publication_status debe ser ${INITIAL_PUBLICATION_STATUS}, se recibió ${record.publication_status}`,
    );
  }
  if (record.is_public !== false) {
    throw new Error("Ingesta insegura: is_public debe ser false");
  }
  if (record.validation_status !== "valid") {
    throw new Error("Ingesta insegura: solo configs válidos pueden persistirse");
  }
  const serialized = JSON.stringify(record.config_json);
  if (!serialized || serialized === "{}") {
    throw new Error("Ingesta insegura: config_json vacío o no serializable");
  }
}
