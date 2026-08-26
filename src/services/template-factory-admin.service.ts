/**
 * Template Factory Admin Library Service
 * PASS B: Private administrative template library with workflow management
 */

import { getBrowserSupabaseClient } from "../lib/supabase/client";

const supabase = getBrowserSupabaseClient();

export type PublicationStatus =
  | "GENERATED_PRIVATE"
  | "REVIEW_PENDING"
  | "APPROVED"
  | "PUBLIC"
  | "ARCHIVED"
  | "REJECTED";

export type ValidationStatus = "pending" | "valid" | "invalid";

export interface AdminTemplateRecord {
  id: string;
  name: string;
  description?: string | null;
  preview_image?: string | null;
  config_json: any; // TemplateConfig from PASS A
  css_variables?: any;
  template_type: "premium" | "private";
  is_public: boolean;
  publication_status: PublicationStatus;
  category?: string | null;
  industry?: string | null;
  style?: string | null;
  theme?: string | null;
  layout?: string | null;
  schema_version: number;
  generation_source: string;
  generator_version?: string | null;
  batch_id?: string | null;
  validation_status: ValidationStatus;
  qa_score?: number;
  qa_findings: any[];
  usage_count: number;
  created_by?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

export interface AdminTemplateFilters {
  status?: PublicationStatus | "all";
  category?: string;
  industry?: string;
  batch_id?: string;
  generator_version?: string;
  min_qa_score?: number;
  recipe?: string;
  palette?: string;
  created_after?: string;
  created_before?: string;
  search?: string;
  sortBy?: "created_at" | "qa_score" | "industry" | "batch_id";
  sortOrder?: "asc" | "desc";
}

export interface AdminBatchSummary {
  id: string;
  generationDate: string;
  industries: string[];
  requestedQuantity: number;
  generated: number;
  failed: number;
  approved: number;
  rejected: number;
  published: number;
  averageQaScore: number | null;
  generatorVersion: string;
}

/**
 * Get templates for admin panel with extensive filtering and sorting
 */
export async function getAdminTemplates(
  filters?: AdminTemplateFilters
): Promise<AdminTemplateRecord[]> {
  try {
    let query = supabase.from("template_bank").select("*");

    if (filters) {
      if (filters.status && filters.status !== "all") {
        query = query.eq("publication_status", filters.status);
      }
      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters.industry && filters.industry !== "all") {
        query = query.eq("industry", filters.industry);
      }
      if (filters.batch_id && filters.batch_id !== "all") {
        query = query.eq("batch_id", filters.batch_id);
      }
      if (filters.generator_version && filters.generator_version !== "all") {
        query = query.eq("generator_version", filters.generator_version);
      }
      if (filters.min_qa_score !== undefined) {
        query = query.gte("qa_score", filters.min_qa_score);
      }
      if (filters.recipe && filters.recipe !== "all") {
        query = query.ilike("config_json::text", "%\"recipe\":\"" + filters.recipe + "\"%");
      }
      if (filters.palette && filters.palette !== "all") {
        query = query.ilike("config_json::text", "%\"palette\":\"" + filters.palette + "\"%");
      }
      if (filters.created_after) {
        query = query.gte("created_at", filters.created_after);
      }
      if (filters.created_before) {
        query = query.lte("created_at", filters.created_before);
      }
      if (filters.search) {
        query = query.or(
          "name.ilike.%" + filters.search + "%,description.ilike.%" + filters.search + "%,batch_id.ilike.%" + filters.search + "%"
        );
      }

      // Sorting
      const sortBy = filters.sortBy || "created_at";
      const sortOrder = filters.sortOrder || "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as AdminTemplateRecord[];
  } catch (error) {
    console.error("[Template Factory] Error fetching admin templates:", error);
    throw error;
  }
}

/**
 * Get template by ID for admin
 */
export async function getAdminTemplateById(
  id: string
): Promise<AdminTemplateRecord | null> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as AdminTemplateRecord;
  } catch (error) {
    console.error("[Template Factory] Error fetching template:", error);
    return null;
  }
}

/**
 * Transition template to REVIEW_PENDING
 */
export async function sendToReview(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .update({ publication_status: "REVIEW_PENDING" })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error sending to review:", error);
    throw error;
  }
}

/**
 * Approve template
 */
export async function approveTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .update({
        publication_status: "APPROVED",
      })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error approving template:", error);
    throw error;
  }
}

/**
 * Reject template
 */
export async function rejectTemplate(
  templateId: string,
  reason?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .update({
        publication_status: "REJECTED",
        rejection_reason: reason,
      })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error rejecting template:", error);
    throw error;
  }
}

/**
 * Publish template (make PUBLIC)
 */
export async function publishTemplate(templateId: string): Promise<void> {
  try {
    const { data: existing, error: readError } = await supabase
      .from("template_bank")
      .select("publication_status")
      .eq("id", templateId)
      .single();

    if (readError) throw readError;
    if ((existing as { publication_status?: PublicationStatus } | null)?.publication_status !== "APPROVED") {
      throw new Error("Solo se pueden publicar plantillas aprobadas tras revisión humana.");
    }

    const { error } = await supabase
      .from("template_bank")
      .update({
        publication_status: "PUBLIC",
        is_public: true,
      })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error publishing template:", error);
    throw error;
  }
}

/**
 * Unpublish template (back to APPROVED)
 */
export async function unpublishTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .update({
        publication_status: "APPROVED",
        is_public: false,
      })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error unpublishing template:", error);
    throw error;
  }
}

/**
 * Archive template
 */
export async function archiveTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .update({
        publication_status: "ARCHIVED",
      })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error archiving template:", error);
    throw error;
  }
}

/**
 * Restore template from archived (back to REVIEW_PENDING)
 */
export async function restoreTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .update({
        publication_status: "REVIEW_PENDING",
      })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error restoring template:", error);
    throw error;
  }
}

/**
 * Return template to review (from APPROVED or REJECTED)
 */
export async function returnToReview(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .update({
        publication_status: "REVIEW_PENDING",
        rejection_reason: null,
      })
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error returning to review:", error);
    throw error;
  }
}

/**
 * Get status counts for admin dashboard
 */
export async function getStatusCounts(): Promise<
  Record<PublicationStatus | "all", number>
> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("publication_status");

    if (error) throw error;

    const counts: Record<string, number> = {
      all: data?.length || 0,
      GENERATED_PRIVATE: 0,
      REVIEW_PENDING: 0,
      APPROVED: 0,
      PUBLIC: 0,
      ARCHIVED: 0,
      REJECTED: 0,
    };

    const rows = (data ?? []) as Array<{ publication_status: PublicationStatus | null }>;

    rows.forEach((item) => {
      if (item.publication_status) {
        counts[item.publication_status] = (counts[item.publication_status] || 0) + 1;
      }
    });

    return counts as Record<PublicationStatus | "all", number>;
  } catch (error) {
    console.error("[Template Factory] Error getting status counts:", error);
    throw error;
  }
}

/**
 * Get unique categories from templates
 */
export async function getTemplateCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("category")
      .not("category", "is", null);

    if (error) throw error;

    const rows = (data ?? []) as Array<{ category: string | null }>;
    const unique = Array.from(
      new Set(rows.map((item) => item.category).filter((value): value is string => Boolean(value)))
    );
    return unique.sort();
  } catch (error) {
    console.error("[Template Factory] Error getting categories:", error);
    return [];
  }
}

/**
 * Get unique industries from templates
 */
export async function getTemplateIndustries(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("industry")
      .not("industry", "is", null);

    if (error) throw error;

    const rows = (data ?? []) as Array<{ industry: string | null }>;
    const unique = Array.from(
      new Set(rows.map((item) => item.industry).filter((value): value is string => Boolean(value)))
    );
    return unique.sort();
  } catch (error) {
    console.error("[Template Factory] Error getting industries:", error);
    return [];
  }
}

/**
 * Get unique batch IDs from templates
 */
export async function getTemplateBatches(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("batch_id")
      .not("batch_id", "is", null);

    if (error) throw error;

    const rows = (data ?? []) as Array<{ batch_id: string | null }>;
    const unique = Array.from(
      new Set(rows.map((item) => item.batch_id).filter((value): value is string => Boolean(value)))
    );
    return unique.sort();
  } catch (error) {
    console.error("[Template Factory] Error getting batches:", error);
    return [];
  }
}

/**
 * Build batch-level metadata for the admin batch management view.
 */
export async function getTemplateBatchSummaries(): Promise<AdminBatchSummary[]> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("batch_id,created_at,industry,publication_status,qa_score,generator_version")
      .not("batch_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const batches = new Map<string, AdminBatchSummary & { qaTotal: number; qaCount: number }>();
    const rows = (data ?? []) as Array<{
      batch_id: string | null;
      created_at: string;
      industry: string | null;
      publication_status: PublicationStatus | null;
      qa_score: number | null;
      generator_version: string | null;
    }>;

    rows.forEach((row) => {
      if (!row.batch_id) return;
      const current =
        batches.get(row.batch_id) ||
        {
          id: row.batch_id,
          generationDate: row.created_at,
          industries: [],
          requestedQuantity: 0,
          generated: 0,
          failed: 0,
          approved: 0,
          rejected: 0,
          published: 0,
          averageQaScore: null,
          generatorVersion: row.generator_version || "-",
          qaTotal: 0,
          qaCount: 0,
        };

      current.requestedQuantity += 1;
      current.generated += 1;
      if (row.industry && !current.industries.includes(row.industry)) {
        current.industries.push(row.industry);
      }
      if (row.publication_status === "APPROVED") current.approved += 1;
      if (row.publication_status === "REJECTED") current.rejected += 1;
      if (row.publication_status === "PUBLIC") current.published += 1;
      if (typeof row.qa_score === "number") {
        current.qaTotal += row.qa_score;
        current.qaCount += 1;
        current.averageQaScore = Number((current.qaTotal / current.qaCount).toFixed(2));
      }
      if (new Date(row.created_at).getTime() < new Date(current.generationDate).getTime()) {
        current.generationDate = row.created_at;
      }
      if (row.generator_version) current.generatorVersion = row.generator_version;

      batches.set(row.batch_id, current);
    });

    return Array.from(batches.values()).map(({ qaTotal, qaCount, ...batch }) => ({
      ...batch,
      industries: batch.industries.sort(),
    }));
  } catch (error) {
    console.error("[Template Factory] Error getting batch summaries:", error);
    throw error;
  }
}

/**
 * Archive every template in a batch. This is intentionally not a publish action.
 */
export async function archiveBatch(batchId: string): Promise<void> {
  const { error } = await supabase
    .from("template_bank")
    .update({ publication_status: "ARCHIVED" })
    .eq("batch_id", batchId);

  if (error) throw error;
}

/**
 * Create template for testing/manual addition
 * (Future generator will use this interface)
 */
export async function createAdminTemplate(
  templateData: {
    name: string;
    description?: string | null;
    config_json: any;
    category?: string | null;
    industry?: string | null;
    style?: string | null;
    theme?: string | null;
    preview_image?: string | null;
    batch_id?: string | null;
    generation_source?: string | null;
  }
): Promise<AdminTemplateRecord> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("template_bank")
      .insert({
        ...templateData,
        created_by: user.id,
        template_type: "private",
        is_public: false,
        publication_status: "GENERATED_PRIVATE",
        schema_version: 1,
        generation_source: templateData.generation_source || "manual",
        validation_status: "pending",
        usage_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AdminTemplateRecord;
  } catch (error) {
    console.error("[Template Factory] Error creating template:", error);
    throw error;
  }
}

/**
 * Delete template (hard delete)
 */
export async function deleteAdminTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("template_bank")
      .delete()
      .eq("id", templateId);

    if (error) throw error;
  } catch (error) {
    console.error("[Template Factory] Error deleting template:", error);
    throw error;
  }
}


/**
 * Bulk Action Helpers
 */
export async function approveTemplatesBulk(templateIds: string[]): Promise<void> {
  const { error } = await supabase.from("template_bank").update({ publication_status: "APPROVED" }).in("id", templateIds);
  if (error) throw error;
}

export async function sendToReviewBulk(templateIds: string[]): Promise<void> {
  const { error } = await supabase.from("template_bank").update({ publication_status: "REVIEW_PENDING" }).in("id", templateIds);
  if (error) throw error;
}

export async function rejectTemplatesBulk(templateIds: string[], reason?: string): Promise<void> {
  const { error } = await supabase.from("template_bank").update({ publication_status: "REJECTED", rejection_reason: reason }).in("id", templateIds);
  if (error) throw error;
}

export async function archiveTemplatesBulk(templateIds: string[]): Promise<void> {
  const { error } = await supabase.from("template_bank").update({ publication_status: "ARCHIVED" }).in("id", templateIds);
  if (error) throw error;
}

export async function publishTemplatesBulk(templateIds: string[]): Promise<void> {
  const { data, error: readError } = await supabase
    .from("template_bank")
    .select("id,publication_status")
    .in("id", templateIds);
  if (readError) throw readError;

  const rows = (data ?? []) as Array<{ id: string; publication_status: PublicationStatus | null }>;
  const unsafe = rows.filter((row) => row.publication_status !== "APPROVED");
  if (unsafe.length > 0 || rows.length !== templateIds.length) {
    throw new Error("Solo se pueden publicar plantillas aprobadas tras revisión humana.");
  }

  const { error } = await supabase.from("template_bank").update({ publication_status: "PUBLIC", is_public: true }).in("id", templateIds);
  if (error) throw error;
}

