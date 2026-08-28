import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageConfig } from "../power-editor/client/src/lib/editorCandidateModel";
import type {
  PowerEditorProject,
  PowerEditorTemplate,
} from "../types/database";

type CreateProjectInput = {
  ownerUserId: string;
  profileId: string;
  name: string;
  pageConfig: PageConfig;
  templateId?: string | null;
};

function clonePageConfig(config: PageConfig): PageConfig {
  return JSON.parse(JSON.stringify(config)) as PageConfig;
}

function requireRow<T>(row: T | null, error?: unknown): T {
  if (error) throw error;
  if (!row) throw new Error("No se encontró el recurso solicitado del Power Editor.");
  return row;
}

export const powerEditorProjectService = {
  async listTemplates(supabase: SupabaseClient): Promise<PowerEditorTemplate[]> {
    const { data, error } = await supabase
      .from("power_editor_templates")
      .select("*")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PowerEditorTemplate[];
  },

  async getTemplateById(
    supabase: SupabaseClient,
    templateId: string,
  ): Promise<PowerEditorTemplate> {
    const { data, error } = await supabase
      .from("power_editor_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();
    return requireRow(data as PowerEditorTemplate | null, error);
  },

  async listProjects(
    supabase: SupabaseClient,
    ownerUserId: string,
  ): Promise<PowerEditorProject[]> {
    const { data, error } = await supabase
      .from("power_editor_projects")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PowerEditorProject[];
  },

  async getProjectById(
    supabase: SupabaseClient,
    projectId: string,
    ownerUserId: string,
  ): Promise<PowerEditorProject> {
    const { data, error } = await supabase
      .from("power_editor_projects")
      .select("*")
      .eq("id", projectId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    return requireRow(data as PowerEditorProject | null, error);
  },

  async getOwnedEditableProject(
    supabase: SupabaseClient,
    projectId: string,
    ownerUserId: string,
  ): Promise<PowerEditorProject> {
    const project = await this.getProjectById(supabase, projectId, ownerUserId);
    if (project.status === "archived") {
      throw new Error("Este borrador está archivado y no puede editarse.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", project.profile_id)
      .eq("user_id", ownerUserId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error("No se encontró el recurso solicitado del Power Editor.");
    return project;
  },

  async createProject(
    supabase: SupabaseClient,
    input: CreateProjectInput,
  ): Promise<PowerEditorProject> {
    const { data, error } = await supabase
      .from("power_editor_projects")
      .insert({
        owner_user_id: input.ownerUserId,
        profile_id: input.profileId,
        template_id: input.templateId ?? null,
        name: input.name,
        page_config: clonePageConfig(input.pageConfig),
      })
      .select()
      .single();
    return requireRow(data as PowerEditorProject | null, error);
  },

  async createProjectFromTemplate(
    supabase: SupabaseClient,
    input: Omit<CreateProjectInput, "pageConfig" | "templateId"> & { templateId: string },
  ): Promise<PowerEditorProject> {
    const template = await this.getTemplateById(supabase, input.templateId);
    return this.createProject(supabase, {
      ...input,
      templateId: template.id,
      pageConfig: clonePageConfig(template.page_config),
    });
  },

  async saveDraft(
    supabase: SupabaseClient,
    projectId: string,
    ownerUserId: string,
    pageConfig: PageConfig,
  ): Promise<PowerEditorProject> {
    const { data, error } = await supabase
      .from("power_editor_projects")
      .update({
        page_config: clonePageConfig(pageConfig),
      })
      .eq("id", projectId)
      .eq("owner_user_id", ownerUserId)
      .in("status", ["draft", "published"])
      .select()
      .maybeSingle();
    return requireRow(data as PowerEditorProject | null, error);
  },

  async publishProject(
    supabase: SupabaseClient,
    projectId: string,
    ownerUserId: string,
    pageConfig: PageConfig,
  ): Promise<PowerEditorProject> {
    const { data, error } = await supabase
      .from("power_editor_projects")
      .update({
        status: "published",
        page_config: clonePageConfig(pageConfig),
        published_page_config: clonePageConfig(pageConfig),
        published_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("owner_user_id", ownerUserId)
      .in("status", ["draft", "published"])
      .select()
      .maybeSingle();
    return requireRow(data as PowerEditorProject | null, error);
  },

};
