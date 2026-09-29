import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Eye, Pencil } from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { CqPageHeader } from "../components/cq-ui/CqPageHeader";
import { CqPanel } from "../components/cq-ui/CqPanel";
import { CqStatusPill } from "../components/cq-ui/CqStatusPill";
import { cqPrimaryButton, cqSecondaryButton } from "../components/cq-ui/buttonStyles";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { getPublicProfileUrl } from "../lib/url";
import { resolveCanonicalMagicPageId } from "../lib/editor-routing/resolveCanonicalMagicPage";

/**
 * F7 — `/page` visual closure.
 *
 * `/page` is NOT a duplicate of `/pages/$pageId`: it stays the legacy "Mi página"
 * hub that reads the owner's `profiles` row (root identity / BioLink) and only
 * links out to the canonical Magic document through `resolveCanonicalMagicPageId`.
 * The route path, the data source, the query fields and every destination are
 * unchanged, so `/page` keeps working for existing links (`PLATFORM_NAV_ITEMS`,
 * `BasicEditorShell`, `/account`) and for the frozen F1–F6 behaviour.
 *
 * Presentation-only migration to the F1 tokens + `cq-ui` kit. The old local tab
 * strip (`LOCAL_NAV`) is removed: it was a dead control that only restyled itself
 * (the panels below never changed with `activeTab`), so no navigation, data or
 * behaviour is lost. The inline `PLATFORM_BRAND` hex CTA is replaced by the
 * approved `cq-blue` button recipe.
 */

interface PageSummary {
  display_name: string;
  profession?: string | null;
  bio: string | null;
  avatar_url: string | null;
  published: boolean;
  scan_count: number;
  public_id: string;
  slug: string;
}

export const Route = createFileRoute("/page")({ component: MyPageHub });

function MyPageHub() {
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageSummary | null>(null);
  const [canonicalPageId, setCanonicalPageId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        setCanonicalPageId(await resolveCanonicalMagicPageId(supabase, auth.user.id));
        const { data: profiles } = await supabase
          .from("profiles")
          .select(
            "public_id, slug, display_name, profession, bio, avatar_url, published, scan_count",
          )
          .eq("user_id", auth.user.id);
        const p = profiles?.[0];
        if (p) setPage(p as PageSummary);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const publicUrl = page?.public_id ? getPublicProfileUrl(page.public_id) : null;
  const name = page?.display_name || "Mi página";
  const statusLabel = page ? (page.published ? "Publicada" : "Borrador") : "Sin crear";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="h-14 w-14 shrink-0 rounded-cq-lg border border-cq-line">
            <AvatarImage src={page?.avatar_url ?? undefined} alt={name} />
            <AvatarFallback className="bg-cq-blue-50 text-[18px] font-bold text-cq-blue">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CqPageHeader
            title={name}
            description={page?.profession || page?.bio || "Gestiona tu página pública"}
            pill={
              <CqStatusPill tone={page?.published ? "positive" : "neutral"} label={statusLabel} />
            }
            actions={
              <>
                <Link to="/pages" className={`${cqSecondaryButton} no-underline`}>
                  Ver todas mis páginas
                </Link>
                <button
                  type="button"
                  className={cqPrimaryButton}
                  onClick={() =>
                    void navigate(
                      canonicalPageId
                        ? { to: "/pages/$pageId/edit", params: { pageId: canonicalPageId } }
                        : { to: "/profile" },
                    )
                  }
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
                </button>
              </>
            }
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
          <CqPanel
            headingId="page-hub-summary-heading"
            title="Resumen"
            description="Tu identidad pública y el enlace real que Cripqer genera."
          >
            <div className="space-y-4">
              {publicUrl ? (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full min-w-0 items-center justify-between gap-2 rounded-cq-sm bg-cq-canvas px-3 py-2.5 ring-1 ring-cq-line transition-colors hover:ring-cq-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
                >
                  <span className="truncate text-[13px] font-medium text-cq-blue">{publicUrl}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-cq-subtle" aria-hidden="true" />
                </a>
              ) : (
                <p className="text-[13.5px] leading-relaxed text-cq-muted">
                  Aún no tienes una página pública.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cqPrimaryButton}
                  onClick={() =>
                    void navigate(
                      canonicalPageId
                        ? { to: "/pages/$pageId/edit", params: { pageId: canonicalPageId } }
                        : { to: "/profile" },
                    )
                  }
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Editar página
                </button>
                {publicUrl && page?.published && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${cqSecondaryButton} no-underline`}
                  >
                    <Eye className="h-4 w-4 text-cq-muted" aria-hidden="true" /> Ver página
                  </a>
                )}
              </div>
            </div>
          </CqPanel>

          <CqPanel headingId="page-hub-status-heading" title="Estado">
            <dl className="space-y-3 text-[13.5px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-cq-muted">Estado</dt>
                <dd className="font-semibold text-cq-ink">{statusLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-cq-muted">Escaneos</dt>
                <dd className="font-semibold text-cq-ink">
                  {page ? page.scan_count.toLocaleString("es-CL") : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-cq-muted">Enlace</dt>
                <dd className="min-w-0 truncate font-semibold text-cq-ink">
                  {page?.slug ? `/${page.slug}` : "—"}
                </dd>
              </div>
            </dl>
          </CqPanel>
        </div>
      </main>
    </AppShell>
  );
}
