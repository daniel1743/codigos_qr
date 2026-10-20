import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { editRouteSearch } from "../../components/home/editRouteSearch";
import { magicPageService } from "../../services/magic-page.service";
import { pageService } from "../../services/page.service";
import { profileService } from "../../services/profile.service";
import { clearCreationIntent, markCreationIntent } from "./creationIntent";

/**
 * Landing Launch Lite - single entry point to the real creation flow.
 *
 * The "Personalizar una tarjeta" CTA must open an independent, editable base
 * card in the EXISTING Magic Editor, without a template picker and without the
 * conversational bot. Nothing is re-implemented here: the sequence below is the
 * same canonical non-admin creation boundary Home already uses.
 *
 *   1. ensurePrimaryProfileForUser - the create RPC resolves profile_id
 *      server-side, so the profile row has to exist first.
 *   2. createOrResumeInitialLandingPage - the narrow server-side RPC creates AT
 *      MOST one initial landing per owner and resumes it on retry, so no
 *      duplicate page can be produced.
 *   3. ensureInitialMagicDocument - seeds the canonical Magic starter document
 *      (bio) and is idempotent: an already-initialized document is never
 *      overwritten, so reopening an existing card keeps its real content.
 *   4. /pages/$pageId/edit - the productive Magic Editor host, which re-checks
 *      session ownership before mounting.
 *
 * Anonymous visitors are sent to the GUEST EDITOR instead of being pushed into
 * registration: `/crear-tarjeta` opens a real, editable Bio card with local-only
 * persistence, and the visitor is only asked for an account when they want to keep
 * it (see `features/guest-editor`). The creation intent is still recorded before
 * that hop, so the existing post-login continuity (creationIntent -> resumeCreation
 * -> profile) keeps working for anyone who registers from the guest editor.
 */

type StartBaseCardOptions = {
  /**
   * When resuming after authentication the intent is already being consumed, so
   * the anonymous branch must not re-record it.
   */
  consumeIntent?: boolean;
};

export function useStartBaseCard() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const start = useCallback(
    async (options: StartBaseCardOptions = {}) => {
      if (starting) return;
      setStarting(true);
      try {
        const supabase = getBrowserSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // No login wall: the visitor designs first, in the guest editor. The intent
          // is recorded so a later signup still resumes into their own card.
          if (!options.consumeIntent) markCreationIntent();
          await navigate({ to: "/crear-tarjeta" });
          return;
        }
        // Authenticated: any pending intent has been fulfilled.
        clearCreationIntent();
        const user = data.session.user;
        await profileService.ensurePrimaryProfileForUser(supabase, {
          userId: user.id,
          email: user.email ?? null,
          userMetadata: user.user_metadata,
        });
        const { page } = await pageService.createOrResumeInitialLandingPage(supabase, user.id);
        await magicPageService.ensureInitialMagicDocument(supabase, page.id, user.id, "bio");
        await navigate({
          to: "/pages/$pageId/edit",
          params: { pageId: page.id },
          search: editRouteSearch,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo preparar tu tarjeta.");
      } finally {
        setStarting(false);
      }
    },
    [navigate, starting],
  );

  return { starting, start };
}
