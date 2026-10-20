import type { SupabaseClient } from "@supabase/supabase-js";
import { editRouteSearch } from "../../components/home/editRouteSearch";
import { magicPageService } from "../../services/magic-page.service";
import { pageService } from "../../services/page.service";
import { profileService } from "../../services/profile.service";
import { clearCreationIntent, readCreationIntent } from "./creationIntent";

/**
 * Landing Launch Lite V2 - resume the creation intent after authentication.
 *
 * This is the *read* half of the anonymous continuity flow: after the visitor
 * authenticates, whoever owns the post-login destination asks this module
 * whether a creation intent is pending. If it is, the exact same canonical
 * boundary used by the CTA and by Home runs (profile -> create-or-resume the
 * single initial landing -> seed the canonical bio document) and the caller
 * receives the internal editor target to navigate to.
 *
 * Design rules, mirroring the CTA:
 *   - The boundary is reused verbatim; no new endpoint, RPC or schema.
 *   - The target is a fixed internal route built from the server-issued page id,
 *     never a URL supplied by the visitor, so no open redirect is possible.
 *   - The intent is consumed (cleared) exactly once, before the work starts, so
 *     a failure cannot loop.
 *   - A missing/expired/malformed intent, or a failure anywhere in the boundary,
 *     returns `null` and the caller keeps its normal destination.
 */

export interface CreationResumeTarget {
  to: "/pages/$pageId/edit";
  params: { pageId: string };
  search: typeof editRouteSearch;
}

export interface ResumeCreationDeps {
  /** Session user id, already verified by the caller. */
  userId: string;
  email?: string | null;
  userMetadata?: Record<string, unknown> | null;
  supabase: SupabaseClient;
  /** Test seam: defaults to the real sessionStorage-backed reader. */
  hasPendingIntent?: () => boolean;
  /** Test seam: defaults to the real clearing function. */
  consumeIntent?: () => void;
}

/**
 * Run the canonical creation boundary when a pending intent exists.
 * Returns the internal editor target, or `null` when there is nothing to resume.
 */
export async function resumePendingCreation({
  userId,
  email = null,
  userMetadata = null,
  supabase,
  hasPendingIntent = () => readCreationIntent(),
  consumeIntent = () => clearCreationIntent(),
}: ResumeCreationDeps): Promise<CreationResumeTarget | null> {
  if (!hasPendingIntent()) return null;

  // Consume first: a retry must not re-enter this branch in a loop.
  consumeIntent();

  try {
    await profileService.ensurePrimaryProfileForUser(supabase, {
      userId,
      email,
      userMetadata,
    });
    const { page } = await pageService.createOrResumeInitialLandingPage(supabase, userId);
    await magicPageService.ensureInitialMagicDocument(supabase, page.id, userId, "bio");
    return {
      to: "/pages/$pageId/edit",
      params: { pageId: page.id },
      search: editRouteSearch,
    };
  } catch {
    // The visitor keeps the normal destination; nothing is left half-done
    // because the boundary is idempotent (create-or-resume + seeded doc).
    return null;
  }
}
