import type { SupabaseClient } from "@supabase/supabase-js";
import type { DemoLogo, DemoLogoCategory } from "../types/demo-logo";

export const demoLogoService = {
  /**
   * Obtener todos los logos demo
   */
  async getAllLogos(supabase: SupabaseClient): Promise<DemoLogo[]> {
    const { data, error } = await supabase
      .from("demo_logos")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener logos por categoría
   */
  async getLogosByCategory(
    supabase: SupabaseClient,
    category: DemoLogoCategory
  ): Promise<DemoLogo[]> {
    const { data, error } = await supabase
      .from("demo_logos")
      .select("*")
      .eq("category", category)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener logo por ID
   */
  async getLogoById(supabase: SupabaseClient, id: string): Promise<DemoLogo | null> {
    const { data, error } = await supabase
      .from("demo_logos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Crear nuevo logo demo (solo admin)
   */
  async createLogo(
    supabase: SupabaseClient,
    logo: Omit<DemoLogo, "id" | "created_at" | "updated_at">
  ): Promise<DemoLogo> {
    const { data, error } = await supabase
      .from("demo_logos")
      .insert(logo)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar logo demo (solo admin)
   */
  async updateLogo(
    supabase: SupabaseClient,
    id: string,
    updates: Partial<Omit<DemoLogo, "id" | "created_at" | "updated_at">>
  ): Promise<DemoLogo> {
    const { data, error } = await supabase
      .from("demo_logos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Eliminar logo demo (solo admin)
   */
  async deleteLogo(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("demo_logos").delete().eq("id", id);

    if (error) throw error;
  },

  /**
   * Upload logo file to Supabase Storage
   */
  async uploadLogoFile(
    supabase: SupabaseClient,
    file: File,
    category: string
  ): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${category}-${Date.now()}.${fileExt}`;
    const filePath = `${category}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("demo-logos")
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("demo-logos").getPublicUrl(filePath);

    return data.publicUrl;
  },
};
