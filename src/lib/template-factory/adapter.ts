/**
 * Template Factory - Private Bank Ingestion Adapter
 * PASS C - TF-F5-PRIVATE-BANK-BRIDGE
 * 
 * Responsibilities:
 * - Read validated manifest/records
 * - Map to template_bank schema
 * - Enforce private initial state
 * - Ingest to Supabase safely
 * - Return ids/results
 */

import { getPrivilegedSupabaseClient } from "../supabase/server-privileged";
import { type IngestionRecord, INITIAL_PUBLICATION_STATUS } from "./ingestion";

export type AdapterMode = "dry_run" | "live";

export interface IngestionOptions {
  mode: AdapterMode;
}

export interface AdapterResult {
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
  insertedIds: string[];
  errors: string[];
}

/**
 * Executes the ingestion of validated records into the template_bank table.
 */
export async function ingestToTemplateBank(
  records: Array<{ templateId: string; record: IngestionRecord }>,
  options: IngestionOptions = { mode: "dry_run" }
): Promise<AdapterResult> {
  const result: AdapterResult = {
    insertedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    insertedIds: [],
    errors: [],
  };

  const client = getPrivilegedSupabaseClient();

  for (const { templateId, record } of records) {
    try {
      // 1. Safety Hard Rejects
      if ((record as any).is_public === true) {
        throw new Error("HARD REJECT: Template " + templateId + " is attempting to ingest as public.");
      }
      if (record.publication_status !== INITIAL_PUBLICATION_STATUS) {
        throw new Error("HARD REJECT: Template " + templateId + " has invalid status '" + record.publication_status + "'. Must be " + INITIAL_PUBLICATION_STATUS + ".");
      }
      if ((record as any).published_at != null) {
        throw new Error("HARD REJECT: Template " + templateId + " cannot have published_at defined.");
      }

      // Map to DB schema (template_bank)
      const dbPayload = {
        id: templateId,
        name: record.name,
        description: record.description,
        config_json: record.config_json,
        preview_image: record.preview_image,
        template_type: record.template_type,
        is_public: record.is_public,
        publication_status: record.publication_status,
        category: record.category,
        industry: record.industry,
        style: record.style,
        theme: record.theme,
        layout: record.layout,
        schema_version: record.schema_version,
        generation_source: record.generation_source,
        generator_version: record.generator_version,
        batch_id: record.batch_id,
        validation_status: record.validation_status,
        qa_score: record.qa_score,
        qa_findings: record.qa_findings,
      };

      if (options.mode === "dry_run") {
        result.insertedCount++;
        result.insertedIds.push(templateId);
        continue;
      }

      // 2. Idempotency Check
      const { data: existing, error: checkError } = await client
        .from("template_bank")
        .select("id")
        .eq("id", templateId)
        .maybeSingle();

      if (checkError) {
        throw new Error("Idempotency check failed for " + templateId + ": " + checkError.message);
      }

      if (existing) {
        result.skippedCount++;
        continue;
      }

      // 3. Execute Insert
      const { error: insertError } = await client
        .from("template_bank")
        .insert(dbPayload);

      if (insertError) {
        throw new Error("Insert failed for " + templateId + ": " + insertError.message);
      }

      result.insertedCount++;
      result.insertedIds.push(templateId);
      
    } catch (err) {
      result.failedCount++;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return result;
}
