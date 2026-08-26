/**
 * Template Bank Service
 * Manages template CRUD operations and integrates with Supabase
 */

import { getBrowserSupabaseClient } from "../lib/supabase/client";

const supabase = getBrowserSupabaseClient();

export interface TemplateConfig {
  id: string;
  name: string;
  description?: string;
  preview_image?: string;
  config_json: any;
  css_variables?: any;
  template_type: "premium" | "private";
  is_public: boolean;
  publication_status?: string;
  industry?: string;
  category?: string;
  style?: string;
  theme?: string;
  schema_version?: number;
  generation_source?: string;
  generator_version?: string;
  batch_id?: string;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const PRIVATE_USER_TEMPLATE_STATUS = "GENERATED_PRIVATE";

export interface PublicTemplateViewModel {
  id: string;
  name: string;
  industry: string;
  category: string;
  style: string;
  palette: string;
  themeMode: "light" | "dark" | "auto";
  recipe: string;
  previewUrl: string;
  plan: "free" | "premium";
  tags: string[];
  isFeatured: boolean;
  isNew: boolean;
  usageCount: number;
  createdAt: string;
  status: "PUBLIC";
  config: any;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  preview_image?: string;
  config_json: any;
  css_variables?: any;
  template_type?: "premium" | "private";
  is_public?: boolean;
  publication_status?: string;
  industry?: string;
  category?: string;
  style?: string;
  theme?: string;
  generation_source?: string;
}

/**
 * Get all templates accessible by the current user
 */
export async function getTemplates(
  filter?: "all" | "premium" | "private"
): Promise<TemplateConfig[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase.from("template_bank").select("*");

    if (filter === "premium") {
      query = query.eq("template_type", "premium");
    } else if (filter === "private") {
      if (!user) return [];
      query = query.eq("template_type", "private").eq("created_by", user.id);
    } else {
      query = query.or(
        user
          ? `and(is_public.eq.true,publication_status.eq.PUBLIC),created_by.eq.${user.id}`
          : "and(is_public.eq.true,publication_status.eq.PUBLIC)",
      );
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw error;
  }
}

function readConfigString(config: any, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = config?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function readConfigBoolean(config: any, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = config?.[key];
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

function readConfigStringArray(config: any, keys: string[]): string[] {
  for (const key of keys) {
    const value = config?.[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    }
  }
  return [];
}

export function mapTemplateToPublicViewModel(template: TemplateConfig): PublicTemplateViewModel {
  const config = template.config_json || {};
  
  // Prefer database columns (from PASS B) over config digging
  const industry = template.industry || readConfigString(config, ["industry", "rubro"], "General");
  const category = template.category || readConfigString(config, ["category"], "General");
  const style = template.style || readConfigString(config, ["style"], "Modern");
  const palette = config.paletteId || config.palette || "default";
  const recipe = config.recipe || "custom";
  const paletteTokens = config.paletteTokens || config.tokens || {};
  
  // Heuristic for dark mode if not explicitly tagged
  const isDark = paletteTokens.background?.toLowerCase().includes("000") ||
                 paletteTokens.background?.toLowerCase().includes("111") ||
                 palette.toLowerCase().includes("dark") || 
                 template.theme === "dark";

  const themeMode = template.theme === "light" || template.theme === "dark" 
      ? template.theme 
      : (isDark ? "dark" : "light");

  const tags = readConfigStringArray(config, ["tags", "features", "capabilities"]);
  const createdAt = template.created_at;
  const createdDate = new Date(createdAt);
  const isNew =
    Number.isFinite(createdDate.getTime()) &&
    Date.now() - createdDate.getTime() < 1000 * 60 * 60 * 24 * 21;

  return {
    id: template.id,
    name: template.name,
    industry,
    category,
    style,
    palette,
    themeMode,
    recipe,
    previewUrl: template.preview_image || readConfigString(config, ["previewUrl", "preview_url"]),
    plan: template.template_type === "premium" ? "premium" : "free",
    tags,
    isFeatured: readConfigBoolean(config, ["isFeatured", "featured"], template.usage_count > 25),
    isNew: readConfigBoolean(config, ["isNew", "new"], isNew),
    usageCount: template.usage_count || 0,
    createdAt,
    status: "PUBLIC",
    config,
  };
}

/**
 * TF-F9: SECURE PUBLIC FETCH
 * Only retrieves templates explicitly published to the public catalog.
 */
export async function getPublicTemplates(): Promise<PublicTemplateViewModel[]> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("*")
      .eq("publication_status", "PUBLIC") // STRICT
      .eq("is_public", true)              // STRICT
      .order("usage_count", { ascending: false });

    if (error) throw error;

    return (data || [])
      .filter((template) => template.is_public === true && template.publication_status === "PUBLIC") // Paranoia check
      .map((template) => mapTemplateToPublicViewModel(template as TemplateConfig));
  } catch (error) {
    console.error("Error fetching public templates:", error);
    throw error;
  }
}

/**
 * Get a specific template by ID
 */
export async function getTemplateById(
  id: string
): Promise<TemplateConfig | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("template_bank")
      .select("*")
      .eq("id", id)
      .or(
        user
          ? `and(is_public.eq.true,publication_status.eq.PUBLIC),created_by.eq.${user.id}`
          : "and(is_public.eq.true,publication_status.eq.PUBLIC)",
      )
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching template:", error);
    return null;
  }
}

/**
 * Create a new template
 */
export async function createTemplate(
  templateData: CreateTemplateData
): Promise<TemplateConfig> {
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
        publication_status: PRIVATE_USER_TEMPLATE_STATUS,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating template:", error);
    throw error;
  }
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<CreateTemplateData>
): Promise<TemplateConfig> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const {
      is_public: _isPublic,
      publication_status: _publicationStatus,
      template_type: _templateType,
      ...safeUpdates
    } = updates;

    const { data, error } = await supabase
      .from("template_bank")
      .update(safeUpdates)
      .eq("id", id)
      .eq("created_by", user.id)
      .neq("publication_status", "PUBLIC")
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating template:", error);
    throw error;
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("template_bank")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id)
      .neq("publication_status", "PUBLIC");

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting template:", error);
    throw error;
  }
}

/**
 * Increment usage count for a template
 */
export async function incrementTemplateUsage(id: string): Promise<void> {
  try {
    const { data: template } = await supabase
      .from("template_bank")
      .select("usage_count")
      .eq("id", id)
      .eq("is_public", true)
      .eq("publication_status", "PUBLIC")
      .single();

    if (template) {
      await supabase
        .from("template_bank")
        .update({ usage_count: template.usage_count + 1 })
        .eq("id", id)
        .eq("is_public", true)
        .eq("publication_status", "PUBLIC");
    }
  } catch (error) {
    console.error("Error incrementing usage:", error);
  }
}

/**
 * Search templates by name
 */
export async function searchTemplates(
  searchTerm: string
): Promise<TemplateConfig[]> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .eq("is_public", true)
      .eq("publication_status", "PUBLIC")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error searching templates:", error);
    return [];
  }
}

/**
 * Get user's templates
 */
export async function getUserTemplates(): Promise<TemplateConfig[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from("template_bank")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user templates:", error);
    return [];
  }
}
