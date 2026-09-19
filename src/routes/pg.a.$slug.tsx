import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { PublicTemplateRenderer } from "../premium-template-studio/engine/PublicTemplateRenderer";
import { resolveCanonicalEditorConfig } from "../components/profile/canonicalRenderBridge";
import { pageAliasService } from "../services/page-alias.service";
import { analyticsService } from "../services/analyticsService";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import type { PageAnalyticsInteraction } from "../types/analytics";

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

    const config = resolveCanonicalEditorConfig(page.published_template_config);
    if (!config) {
      throw notFound();
    }

    return { page, config };
  },
  component: PublicPageAlias,
});

function PublicPageAlias() {
  const { page, config } = Route.useLoaderData();

  useEffect(() => {
    void analyticsService.trackPageEvent(getBrowserSupabaseClient(), page.page_id, "view");
  }, [page.page_id]);

  const handleTrack = useCallback(
    (event: { type: string; blockId?: string; url?: string; itemId?: string; label?: string }) => {
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
    },
    [page.page_id],
  );

  return <PublicTemplateRenderer config={config} onTrack={handleTrack} />;
}
