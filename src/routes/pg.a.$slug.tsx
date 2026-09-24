import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { PublicTemplateRenderer } from "../premium-template-studio/engine/PublicTemplateRenderer";
import { resolveCanonicalEditorConfig } from "../components/profile/canonicalRenderBridge";
import { pageAliasService } from "../services/page-alias.service";
import { analyticsService } from "../services/analyticsService";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import type { PageAnalyticsInteraction } from "../types/analytics";
import { readDirectPageEnvelope } from "../lib/canonical-page";
import { DirectPageRenderer } from "../components/direct-page-editor/DirectPageRenderer";
import { isCanonicalAnalyticsEnabled, resolveCanonicalClickType } from "../lib/analytics";
import { getBrowserCanonicalWriter } from "../lib/analytics/browser";
import { isMagicPageDocument } from "../features/magic-page-editor-production/magic-document";
import { MagicPublicRenderer } from "../features/magic-page-editor-production/MagicPublicRenderer";

/**
 * PUBLIC CHILD PAGE CUSTOM-ALIAS ROUTE.
 *
 *   /pg/a/$slug
 *     → get_public_page_by_slug (safe public RPC)
 *     → published_template_config (the ONLY canonical public document)
 *     → PublicTemplateRenderer (reused; no renderer fork)
 *
 * This is convenience-only. The stable identity is `/pg/{public_id}` (which
 * the QR always points to). The canonical link therefore points back to the
 * stable public_id URL so the alias never becomes a second SEO identity.
 */
export const Route = createFileRoute("/pg/a/$slug")({
  head: ({ loaderData }) => {
    if (!loaderData?.page) return {};

    const { page } = loaderData;
    const baseUrl = "https://www.cripqer.dev";
    const stableUrl = `${baseUrl}/pg/${page.public_id}`;
    const title = page.title ? `${page.title} | Cripqer` : `Página | Cripqer`;
    const description = page.title
      ? `${page.title} — página pública creada con Cripqer.`
      : "Página pública creada con Cripqer.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: stableUrl },
        { property: "og:site_name", content: "Cripqer" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "robots", content: "index, follow" },
      ],
      links: [{ rel: "canonical", href: stableUrl }],
    };
  },
  loader: async ({ params }) => {
    const supabase = getServerSupabaseClient();
    const page = await pageAliasService.getPublicPageByAlias(supabase, params.slug);

    if (!page) {
      throw notFound();
    }

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
  component: PublicPageAlias,
});

function PublicPageAlias() {
  const { page, config, directDocument, magicDocument } = Route.useLoaderData();

  // The canonical Analytics V1.1 writer is enabled in QA, and in production only
  // when the global flag is on AND this page is explicitly allowlisted. Any
  // other page keeps the legacy tracking path untouched.
  const useCanonical = useMemo(
    () =>
      isCanonicalAnalyticsEnabled({
        supabaseUrl: import.meta.env["VITE_SUPABASE_URL"],
        publicId: page.public_id,
        environment: import.meta.env,
      }),
    [page.public_id],
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
