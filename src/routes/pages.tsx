import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { IdentityCard } from "../components/pages/IdentityCard";
import { MagicPageCard } from "../components/pages/MagicPageCard";
import {
  countPageSections,
  formatDay,
  pageTypeLabel,
  resolveIdentityUrl,
  resolvePageUrl,
} from "../components/pages/page-presentation";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { readCanonicalPageEnvelope } from "../lib/canonical-page";
import { pageService } from "../services/page.service";
import { pageCanonicalService } from "../services/page-canonical.service";
import { profileService } from "../services/profile.service";
import { toast } from "sonner";
import type { Page, Profile } from "../types/database";
import { useAdminStatus } from "../lib/use-admin-status";

/**
 * F3 - Mi Pagina / Identity.
 *
 * Keeps the real CRIPQER model: `profiles` (root identity / BioLink) and `pages`
 * (independent Magic documents) are rendered as separate blocks and are never
 * collapsed into a single object. Data loading, services, persistence and the
 * canonical URL grammar are unchanged from the previous implementation.
 */
export const Route = createFileRoute("/pages")({ component: PagesList });

const createPageCta =
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-cq-sm bg-cq-blue px-5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(30,86,224,0.6)] transition-colors hover:bg-cq-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cq-blue-200";

function PagesList() {
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [linkCount, setLinkCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyPageId, setBusyPageId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { isAdmin } = useAdminStatus();

  // /pages is the parent of the nested child routes (/pages/$pageId, /pages/new,
  // /pages/$pageId/edit). When one of those children is the active match we must
  // render the outlet instead of the list, otherwise the child UI never mounts.
  const matches = useMatches();
  const hasNestedChild = matches.some(
    (match) => match.routeId !== "/pages" && match.routeId.startsWith("/pages/"),
  );

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const userId = auth.user.id;
        const currentProfile = await profileService.getProfileByUserId(supabase, userId);
        setProfile(currentProfile);
        const ownPages = await pageService.listOwnPages(supabase, userId, currentProfile?.id);
        setPages(ownPages);
        if (currentProfile?.id) {
          const { count } = await supabase
            .from("profile_links")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", currentProfile.id);
          setLinkCount(count ?? 0);
        }
      } catch (err) {
        console.error("Error loading pages:", err);
        setError("No se pudieron cargar tus páginas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const togglePublication = async (page: Page) => {
    setBusyPageId(page.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Debes iniciar sesión para cambiar la publicación.");
      const userId = auth.user.id;
      if (page.published) {
        const updated = await pageCanonicalService.unpublish(
          supabase,
          page.id,
          userId,
          page.published_revision,
        );
        setPages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("Página despublicada");
        return;
      }

      const envelope = readCanonicalPageEnvelope(page.template_config);
      if (!envelope) {
        toast.error("Abre la página y guárdala antes de publicarla.");
        return;
      }
      const updated = await pageCanonicalService.publish(
        supabase,
        page.id,
        userId,
        envelope.editorConfig,
        page.published_revision,
      );
      setPages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Página publicada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar la publicación.");
    } finally {
      setBusyPageId(null);
    }
  };

  const deletePage = async (page: Page) => {
    setBusyPageId(page.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Debes iniciar sesión para eliminar una página.");
      await pageService.deleteOwnedChildPage(supabase, page.id, auth.user.id);
      setPages((current) => current.filter((item) => item.id !== page.id));
      toast.success("Página eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la página.");
    } finally {
      setBusyPageId(null);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("Enlace copiado");
      window.setTimeout(() => setCopiedUrl((current) => (current === url ? null : current)), 1800);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  if (hasNestedChild) {
    return <Outlet />;
  }

  const identity = resolveIdentityUrl(profile);
  const identityName = profile?.display_name?.trim() || "Perfil principal";
  const identityTagline = profile?.profession?.trim() || profile?.bio?.trim() || null;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-cq-blue">
              Mi página
            </p>
            <h1 className="mt-2 text-[30px] font-bold leading-[1.06] tracking-[-0.035em] text-cq-ink sm:text-[38px]">
              Tu identidad y tus páginas
            </h1>
            <p className="mt-2 max-w-[620px] text-[14.5px] leading-relaxed text-cq-muted">
              Tu perfil principal es tu identidad raíz. Las páginas Magic son documentos
              independientes: puedes publicar cada una por separado.
            </p>
          </div>
          {isAdmin ? <Link to="/pages/new" className={createPageCta}>
            <Plus className="h-4 w-4" aria-hidden /> Crear página
          </Link> : null}
        </header>

        {loading ? (
          <p className="mt-8 text-[13.5px] text-cq-muted">Cargando…</p>
        ) : error ? (
          <p className="mt-8 text-[13.5px] text-cq-muted">{error}</p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {profile ? (
              <IdentityCard
                displayName={identityName}
                tagline={identityTagline}
                avatarUrl={profile.avatar_url ?? null}
                published={Boolean(profile.published)}
                canonical={identity}
                scans={profile.scan_count ?? 0}
                links={linkCount}
                createdLabel={formatDay(profile.created_at)}
                onCopy={() => {
                  if (identity) void copyUrl(identity.url);
                }}
                copied={Boolean(identity) && copiedUrl === identity?.url}
              />
            ) : null}

            <section aria-label="Páginas Magic" className="min-w-0">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-cq-subtle">
                  Mis páginas Magic
                </h2>
                <p className="text-[12.5px] text-cq-subtle">
                  {pages.length} {pages.length === 1 ? "página" : "páginas"}
                </p>
              </header>

              {pages.length === 0 ? (
                <div className="mt-3 rounded-cq-xl border border-dashed border-cq-line bg-white px-4 py-8 text-center shadow-soft">
                  <p className="text-[15px] font-semibold text-cq-ink">
                    Todavía no has creado páginas Magic
                  </p>
                  <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] text-cq-muted">
                    Crea una página para publicar contenido independiente de tu identidad, con su
                    propio enlace, su QR y sus estadísticas.
                  </p>
                  {isAdmin ? <Link to="/pages/new" className={`${createPageCta} mt-5`}>
                    <Plus className="h-4 w-4" aria-hidden /> Crear página
                  </Link> : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-5 lg:grid-cols-2">
                  {pages.map((page) => {
                    const url = resolvePageUrl(page);
                    const revision =
                      page.published && (page.published_revision ?? 0) > 0
                        ? (page.published_revision ?? 0)
                        : null;
                    return (
                      <MagicPageCard
                        key={page.id}
                        title={page.title || "Página sin título"}
                        typeLabel={pageTypeLabel(page.page_type)}
                        published={Boolean(page.published)}
                        canonical={url}
                        updatedLabel={formatDay(page.updated_at)}
                        publishedLabel={page.published ? formatDay(page.published_at) : null}
                        revision={revision}
                        sections={countPageSections(page.template_config)}
                        pageId={page.id}
                        busy={busyPageId === page.id}
                        copied={Boolean(url) && copiedUrl === url?.url}
                        onCopy={() => {
                          if (url) void copyUrl(url.url);
                        }}
                        onTogglePublish={() => void togglePublication(page)}
                        onDelete={() => void deletePage(page)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
