import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "../../types/database";
import type { PageDocumentV1 } from "../../lib/direct-page-editor/page-document";
import { pageCanonicalService } from "../../services/page-canonical.service";

export interface DirectPageStorageAdapter {
  save(document: PageDocumentV1): Promise<void>;
  publish(document: PageDocumentV1): Promise<Page>;
}

export function createDirectPageStorageAdapter(options: {
  supabase: SupabaseClient;
  pageId: string;
  userId: string;
  initialPublishedRevision: number;
  onPublished?: (page: Page) => void;
}): DirectPageStorageAdapter {
  let revision = options.initialPublishedRevision;
  return {
    async save(document) {
      await pageCanonicalService.saveDraft(
        options.supabase,
        options.pageId,
        options.userId,
        document,
      );
    },
    async publish(document) {
      const page = await pageCanonicalService.publish(
        options.supabase,
        options.pageId,
        options.userId,
        document,
        revision,
      );
      revision = page.published_revision;
      options.onPublished?.(page);
      return page;
    },
  };
}
