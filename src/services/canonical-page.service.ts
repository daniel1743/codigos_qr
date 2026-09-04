import type { SupabaseClient } from "@supabase/supabase-js";
import {
  acceptEngineGeneratedConfig,
  readCanonicalPageEnvelope,
  type CanonicalPageEnvelopeV1,
} from "../lib/canonical-page";

export const canonicalPageService = {
  /** Read the future editor config without interpreting its internal fields. */
  async get(supabase: SupabaseClient, profileId: string): Promise<CanonicalPageEnvelopeV1 | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("template_config")
      .eq("id", profileId)
      .maybeSingle();

    if (error) throw error;
    return readCanonicalPageEnvelope(data?.template_config);
  },

  /** Persist an Engine/Power Editor config while retaining Basic metadata. */
  async save(
    supabase: SupabaseClient,
    profileId: string,
    editorConfig: unknown,
  ): Promise<CanonicalPageEnvelopeV1> {
    const envelope = acceptEngineGeneratedConfig(editorConfig);
    const { data, error } = await supabase.rpc("set_profile_canonical_editor_config", {
      p_profile_id: profileId,
      p_editor_config: envelope.editorConfig,
    });

    if (error) throw error;
    const persisted = readCanonicalPageEnvelope(
      (data as { template_config?: unknown } | null)?.template_config,
    );
    if (!persisted) {
      throw new Error("Canonical page persistence returned an invalid envelope.");
    }
    return persisted;
  },
};
