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

  /** Promote one exact validated editor snapshot to the public authority. */
  async publish(
    supabase: SupabaseClient,
    profileId: string,
    editorConfig: unknown,
  ): Promise<{
    id: string;
    public_id: string;
    published: boolean;
    published_revision: number;
    published_at: string;
    published_template_config: CanonicalPageEnvelopeV1;
  }> {
    const envelope = acceptEngineGeneratedConfig(editorConfig);
    const { data, error } = await supabase.rpc("publish_profile_canonical_snapshot", {
      p_profile_id: profileId,
      p_editor_config: envelope.editorConfig,
    });

    if (error) throw error;

    const profile = data as
      | {
          id?: unknown;
          public_id?: unknown;
          published?: unknown;
          published_revision?: unknown;
          published_at?: unknown;
          published_template_config?: unknown;
        }
      | null;
    const publishedEnvelope = readCanonicalPageEnvelope(profile?.published_template_config);
    if (
      !profile ||
      typeof profile.id !== "string" ||
      typeof profile.public_id !== "string" ||
      profile.published !== true ||
      typeof profile.published_revision !== "number" ||
      typeof profile.published_at !== "string" ||
      !publishedEnvelope
    ) {
      throw new Error("Canonical publish returned an invalid publication result.");
    }

    return {
      id: profile.id,
      public_id: profile.public_id,
      published: profile.published,
      published_revision: profile.published_revision,
      published_at: profile.published_at,
      published_template_config: publishedEnvelope,
    };
  },
};
