import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { resumePendingCreation, type CreationResumeTarget } from "./resumeCreation";

/**
 * Landing Launch Lite V2 — post-login half of the anonymous continuity flow.
 *
 * The visitor who pressed "Personalizar una tarjeta" before registering left a
 * session-local creation intent. This module answers ONE question for whoever owns
 * the post-login destination: *where should this session land?*
 *
 * Contract:
 *   - Without a valid session it returns `null`: the caller keeps its normal
 *     destination (`/profile`) exactly as before.
 *   - With a session it delegates to `resumePendingCreation`, which consumes the
 *     intent exactly once and reuses the canonical, idempotent creation boundary
 *     (create-or-resume + seeded document) — so no page can be duplicated and no
 *     existing card is overwritten.
 *   - Any failure (session read, storage, network, boundary) returns `null`. It
 *     never throws and never navigates on its own, so a failure can only leave the
 *     visitor on the page they already reached: no loops.
 *   - The returned target is a fixed internal route whose page id comes from the
 *     server, never from the visitor: no open redirect is possible here either.
 *
 * It is deliberately a plain function (not a hook) so the three outcomes can be
 * tested without mounting the router.
 */
export interface PostLoginResumeDeps {
  /** Test seam: defaults to the browser Supabase client. */
  getSupabase?: () => SupabaseClient;
  /** Test seam: defaults to the real resume boundary. */
  resume?: typeof resumePendingCreation;
}

export async function resolvePostLoginTarget({
  getSupabase = getBrowserSupabaseClient,
  resume = resumePendingCreation,
}: PostLoginResumeDeps = {}): Promise<CreationResumeTarget | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const session = data?.session ?? null;
    // Only a real session may resume: an anonymous visitor keeps the normal flow.
    if (!session) return null;
    return await resume({
      userId: session.user.id,
      email: session.user.email ?? null,
      userMetadata: session.user.user_metadata,
      supabase,
    });
  } catch {
    return null;
  }
}
