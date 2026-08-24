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
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicTemplateViewModel {
  id: string;
  name: string;
  category: string;
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
}

/**
 * Get all templates accessible by the current user
 */
export async function getTemplates(
  filter?: "all" | "premium" | "private"
): Promise<TemplateConfig[]> {
  try {
    let query = supabase.from("template_bank").select("*");

    if (filter === "premium") {
      query = query.eq("template_type", "premium");
    } else if (filter === "private") {
      query = query.eq("template_type", "private");
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
  const category = readConfigString(config, ["category", "rubro", "industry"], "General");
  const tags = readConfigStringArray(config, ["tags", "features", "capabilities"]);
  const createdAt = template.created_at;
  const createdDate = new Date(createdAt);
  const isNew =
    Number.isFinite(createdDate.getTime()) &&
    Date.now() - createdDate.getTime() < 1000 * 60 * 60 * 24 * 21;

  return {
    id: template.id,
    name: template.name,
    category,
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

export async function getPublicTemplates(): Promise<PublicTemplateViewModel[]> {
  try {
    const { data, error } = await supabase
      .from("template_bank")
      .select("*")
      .eq("is_public", true)
      .order("usage_count", { ascending: false });

    if (error) throw error;

    return (data || [])
      .filter((template) => template.is_public === true)
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
    const { data, error } = await supabase
      .from("template_bank")
      .select("*")
      .eq("id", id)
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
        template_type: templateData.template_type || "private",
        is_public: templateData.is_public || false,
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
    const { data, error } = await supabase
      .from("template_bank")
      .update(updates)
      .eq("id", id)
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
    const { error } = await supabase.from("template_bank").delete().eq("id", id);

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
      .single();

    if (template) {
      await supabase
        .from("template_bank")
        .update({ usage_count: template.usage_count + 1 })
        .eq("id", id);
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
