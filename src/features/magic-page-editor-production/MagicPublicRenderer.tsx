import { useMemo, type MouseEvent } from "react";
import { EditorProvider } from "../../isolated/magic-page-editor/contexts/EditorContext";
import { TemplateRenderer } from "../../isolated/magic-page-editor/components/templates/TemplateRenderer";
import type { MagicPageDocumentV1 } from "./magic-document";
import { hydrateMagicEditorState } from "./magic-document";
import { extractCatalogProducts } from "./catalog-products";
import type { CatalogAccess } from "./catalog-link";
import { pageService } from "../../services/page.service";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { LandingBot } from "../../components/landing-bot/LandingBot";
import { PageVerificationProvider, type VerificationVariant } from "../../isolated/magic-page-editor/contexts/PageVerificationContext";
import { normalizeLandingBot } from "../../lib/landing-bot/config";
import "../../isolated/magic-page-editor/styles/magic-editor.css";

type MagicPublicTrackEvent = {
  type: string;
  blockId?: string;
  url?: string;
  itemId?: string;
  label?: string;
};

interface MagicPublicRendererProps {
  document: MagicPageDocumentV1;
  onTrack?: (event: MagicPublicTrackEvent) => void | Promise<void>;
  /** Public id of the page; enables the owner-configured landing bot. */
  publicId?: string;
  /** Trusted verification variant for the page owner (resolved server-side). */
  verificationVariant?: VerificationVariant;
}

export function MagicPublicRenderer({ document, onTrack, publicId, verificationVariant }: MagicPublicRendererProps) {
  /**
   * Public landing resolution for linked catalogs: only the catalog's PUBLISHED
   * snapshot is readable here, so a landing linked to an unpublished/missing
   * catalog simply keeps its embedded cards and hides the "Ver catálogo
   * completo" CTA.
   */
  const catalogAccess = useMemo<CatalogAccess>(
    () => ({
      resolve: async (catalogPublicId: string) => {
        try {
          const resolved = await pageService.getPublicPageByPublicId(
            getBrowserSupabaseClient(),
            catalogPublicId,
          );
          if (!resolved) return { pageId: null, products: null, published: false };
          return {
            pageId: resolved.page_id,
            products: extractCatalogProducts(resolved.published_template_config),
            published: true,
          };
        } catch {
          return { pageId: null, products: null, published: false };
        }
      },
    }),
    [],
  );

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!onTrack || !(event.target instanceof Element)) return;

    const anchor = event.target.closest("a[href]");
    if (!anchor) return;

    const url = anchor.getAttribute("href");
    if (!url || url.startsWith("#")) return;

    const label =
      anchor.getAttribute("aria-label")?.trim() ||
      anchor.textContent?.trim() ||
      undefined;

    const track = onTrack({
      type: "link_click",
      url,
      ...(label ? { label } : {}),
    });
    if (anchor.target !== "_blank") {
      event.preventDefault();
      void Promise.resolve(track).catch(() => undefined).finally(() => {
        window.location.assign(url);
      });
    } else {
      // For _blank links the browser may discard in-flight fetch requests when
      // the new tab opens. Use sendBeacon when available so the event survives;
      // otherwise fall back to a best-effort awaited call with a 300 ms cap.
      if (navigator.sendBeacon) {
        // sendBeacon is fire-and-forget and survives context unload.
        void Promise.resolve(track).catch(() => undefined);
      } else {
        // Await the tracking promise but cap it at 300 ms to avoid delaying navigation.
        void Promise.race([
          Promise.resolve(track).catch(() => undefined),
          new Promise<void>((resolve) => setTimeout(resolve, 300)),
        ]);
      }
    }
  };

  return (
    <div
      className="magic-editor-root min-h-screen w-full"
      onClickCapture={handleClickCapture}
    >
      <EditorProvider
        initialDocument={hydrateMagicEditorState(document)}
        initialMode="preview"
        catalogAccess={catalogAccess}
      >
        <PageVerificationProvider variant={verificationVariant ?? "none"}>
          <TemplateRenderer showLandingBotPreview={false} />
        </PageVerificationProvider>
      </EditorProvider>
      {publicId && document.bot?.enabled && (
        <LandingBot publicId={publicId} config={normalizeLandingBot(document.bot)} />
      )}
    </div>
  );
}
