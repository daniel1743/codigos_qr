import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { pageService } from "../services/page.service";
import { getBrowserCanonicalWriter } from "../lib/analytics/browser";

/**
 * REAL QR SCAN REDIRECT BOUNDARY (C2B4B).
 *
 *   /q/$publicId
 *     → validate the QR identity against a published page (server-side)
 *     → emit ONE canonical `qr_scan` event (client-side, reusing the browser
 *       session id so the subsequent page activity joins the same session)
 *     → redirect to the stable public page `/pg/$publicId`.
 *
 * Truth rule: this namespace exists ONLY for QR codes. A direct `/pg/{publicId}`
 * visit never passes through here and therefore never emits a `qr_scan`.
 */
export const Route = createFileRoute("/q/$publicId")({
  loader: async ({ params }) => {
    const supabase = getServerSupabaseClient();
    // getPublicPageByPublicId only returns PUBLISHED pages with a published
    // document; anything else resolves to null → notFound (no qr_scan emitted).
    const page = await pageService.getPublicPageByPublicId(supabase, params.publicId);
    if (!page) {
      throw notFound();
    }
    return { page };
  },
  component: QrScanRedirect,
});

function QrScanRedirect() {
  const { page } = Route.useLoaderData();
  const navigate = useNavigate();
  const emitted = useRef(false);

  useEffect(() => {
    // One physical redirect = one scan. The ref guards against React
    // StrictMode double-invocation; a genuine reload is a new mount (new scan).
    if (emitted.current) return;
    emitted.current = true;

    void (async () => {
      await getBrowserCanonicalWriter().track({
        eventType: "qr_scan",
        publicId: page.public_id,
        qrId: page.public_id,
        source: "qr",
      });
      navigate({ to: "/pg/$publicId", params: { publicId: page.public_id } });
    })();
  }, [page.public_id, navigate]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Abriendo tu página…</p>
    </main>
  );
}
