import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { PublicTemplateRenderer } from "../premium-template-studio/engine/PublicTemplateRenderer";
import { resolveCanonicalEditorConfig } from "../components/profile/canonicalRenderBridge";
import { pageService } from "../services/page.service";
import { analyticsService } from "../services/analyticsService";
import type { PageAnalyticsInteraction } from "../types/analytics";
import { readDirectPageEnvelope } from "../lib/canonical-page";
import { DirectPageRenderer } from "../components/direct-page-editor/DirectPageRenderer";
import { isQaAnalyticsRuntime, resolveCanonicalClickType } from "../lib/analytics";
import { getBrowserCanonicalWriter } from "../lib/analytics/browser";
import { isMagicPageDocument } from "../features/magic-page-editor-production/magic-document";
import { MagicPublicRenderer } from "../features/magic-page-editor-production/MagicPublicRenderer";

/**
 * PUBLIC CHILD PAGE ROUTE.
 *
 *   /pg/$publicId
 *     → get_public_page_by_public_id (safe public RPC)
 *     → published_template_config (the ONLY canonical public document)
 *     → PublicTemplateRenderer (reused; no renderer fork)
 *
 * The draft `template_config` is never read here. If the RPC returns no
 * published document (missing page, unpublished, or null config), we throw
 * `notFound()` — there is no fallback to draft/owner data.
 */

export const Route = createFileRoute("/pg/$publicId")({
  head: ({ loaderData }) => {
    if (!loaderData?.page) return {};

    const { page } = loaderData;
    const baseUrl = "https://www.cripqer.dev";
    const pageUrl = `${baseUrl}/pg/${page.public_id}`;
    const title = page.title ? `${page.title} | Cripqer` : `Página ${page.public_id} | Cripqer`;
    const description = page.title
      ? `${page.title} — página pública creada con Cripqer.`
      : `Página pública creada con Cripqer.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        { property: "og:site_name", content: "Cripqer" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "robots", content: "index, follow" },
      ],
      links: [
        { rel: "canonical", href: pageUrl },
        // Slug is optional and must never be fabricated; only emit an alternate
        // when the DB actually returned one.
        ...(page.slug ? [{ rel: "alternate", href: `${baseUrl}/${page.slug}` }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const supabase = getServerSupabaseClient();
    const page = await pageService.getPublicPageByPublicId(supabase, params.publicId);

    if (!page) {
      throw notFound();
    }

    // The published snapshot is the only canonical document. An invalid or
    // missing envelope is indistinguishable from "not published" publicly.
    const direct = readDirectPageEnvelope(page.published_template_config);
    const magicDocument = isMagicPageDocument(page.published_template_config)
      ? page.published_template_config
      : null;
    const config = direct || magicDocument ? null : resolveCanonicalEditorConfig(page.published_template_config);
    if (!direct && !magicDocument && !config) {
      throw notFound();
    }

    return { page, config, directDocument: direct?.editorConfig ?? null, magicDocument };
  },
  component: PublicChildPage,
});

function PublicChildPage() {
  const { page, config, directDocument, magicDocument } = Route.useLoaderData();

  // The canonical Analytics V1.1 writer is QA-only. When the runtime resolves to
  // the production project we keep the legacy tracking path untouched.
  const useCanonical = useMemo(
    () => isQaAnalyticsRuntime(import.meta.env["VITE_SUPABASE_URL"]),
    [],
  );

  useEffect(() => {
    if (!useCanonical) {
      void analyticsService.trackPageEvent(getBrowserSupabaseClient(), page.page_id, "view");
      return;
    }
    const writer = getBrowserCanonicalWriter();
    void writer.track({ eventType: "session_start", publicId: page.public_id });
    void writer.track({ eventType: "page_view", publicId: page.public_id });
  }, [page.page_id, page.public_id, useCanonical]);

  const handleTrack = useCallback(
    (event: { type: string; blockId?: string; url?: string; itemId?: string; label?: string }) => {
      if (!useCanonical) {
        const interaction: PageAnalyticsInteraction | undefined =
          event.type === "product_click"
            ? "product"
            : event.type === "service_click"
              ? "service"
              : event.url?.toLowerCase().includes("wa.me") ||
                  event.url?.toLowerCase().includes("whatsapp")
                ? "whatsapp"
                : "button";
        void analyticsService.trackPageEvent(
          getBrowserSupabaseClient(),
          page.page_id,
          "link_click",
          interaction,
          event.itemId ?? event.blockId,
          event.label,
          event.url,
        );
        return;
      }
      void getBrowserCanonicalWriter().track({
        eventType: resolveCanonicalClickType(event.type, event.url),
        publicId: page.public_id,
        ...(event.url ? { targetUrl: event.url } : {}),
        ...(event.itemId || event.blockId ? { itemId: event.itemId ?? event.blockId } : {}),
        ...(event.label ? { itemLabel: event.label } : {}),
      });
    },
    [page.page_id, page.public_id, useCanonical],
  );

  return magicDocument ? (
    <MagicPublicRenderer document={magicDocument} />
  ) : directDocument ? (
    <DirectPageRenderer
      document={directDocument}
      mode="public"
      breakpoint="desktop"
      onTrack={handleTrack}
    />
  ) : (
    <PublicTemplateRenderer config={config!} onTrack={handleTrack} />
  );
}
