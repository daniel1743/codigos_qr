import type { SupabaseClient } from "@supabase/supabase-js";
import type { BioTemplateConfig } from "../../premium-template-studio/types";
import type { StorageAdapter } from "../../premium-template-studio/adapters";
import { pageCanonicalService } from "../../services/page-canonical.service";
import type { Page } from "../../types/database";

export interface PageStorageAdapterOptions {
  supabase: SupabaseClient;
  pageId: string;
  userId: string;
  /** The in-memory config used when the editor loads (may be blank-initialized). */
  loadConfig: BioTemplateConfig;
  /** Revision captured when the page was loaded, used for optimistic publish. */
  initialPublishedRevision: number;
  onPublished?: (page: Page) => void;
}

/**
 * PAGE-MODE STORAGE ADAPTER.
 *
 * `save` writes the page draft (`pages.template_config`); `publish` writes the
 * published snapshot with optimistic concurrency on `published_revision`.
 *
 * This adapter is the `pages` authority only — it never calls the profile
 * canonical RPCs (`set_profile_canonical_editor_config`,
 * `publish_profile_canonical_snapshot`) or any other profile persistence path.
 */
export function createPageStorageAdapter(options: PageStorageAdapterOptions): StorageAdapter {
  let currentRevision = options.initialPublishedRevision;

  return {
    load: async () => options.loadConfig,
    save: async (config: BioTemplateConfig) => {
      await pageCanonicalService.saveDraft(
        options.supabase,
        options.pageId,
        options.userId,
        config,
      );
    },
    publish: async (config: BioTemplateConfig) => {
      const published = await pageCanonicalService.publish(
        options.supabase,
        options.pageId,
        options.userId,
        config,
        currentRevision,
      );
      currentRevision = published.published_revision;
      options.onPublished?.(published);
      // Public child-page URL is PAGES_4; publish can succeed without it.
      return {};
    },
  };
}

