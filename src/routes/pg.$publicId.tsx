import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { PublicTemplateRenderer } from "../premium-template-studio/engine/PublicTemplateRenderer";
import { resolveCanonicalEditorConfig } from "../components/profile/canonicalRenderBridge";
import { pageService } from "../services/page.service";
import { analyticsService } from "../services/analyticsService";
import type { PageAnalyticsInteraction } from "../types/analytics";

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
    const config = resolveCanonicalEditorConfig(page.published_template_config);
    if (!config) {
      throw notFound();
    }

    return { page, config };
  },
  component: PublicChildPage,
});

function PublicChildPage() {
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
