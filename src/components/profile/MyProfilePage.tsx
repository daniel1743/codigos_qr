import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  QrCode,
  Users,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { magicPageService } from "../../services/magic-page.service";
import { profileService } from "../../services/profile.service";
import type { Page } from "../../types/database";

type UserProfile = { email: string; full_name?: string; avatar_url?: string; created_at: string };
type PageProfile = {
  display_name: string;
  profession?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  published: boolean;
  scan_count: number;
  public_id: string;
};

export function MyProfilePage() {
  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageProfile, setPageProfile] = useState<PageProfile | null>(null);
  const [canonicalPage, setCanonicalPage] = useState<Page | null>(null);
  const [stats, setStats] = useState({ totalScans: 0, totalLinks: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const authUser = authData.user;
        if (!authUser || !active) return;
        setUser(authUser);
        setProfile({
          email: authUser.email ?? "",
          full_name:
            typeof authUser.user_metadata?.full_name === "string"
              ? authUser.user_metadata.full_name
              : undefined,
          avatar_url:
            typeof authUser.user_metadata?.avatar_url === "string"
              ? authUser.user_metadata.avatar_url
              : undefined,
          created_at: authUser.created_at,
        });

        const [
          { data: profilesData, error: profilesError },
          { data: pagesData, error: pagesError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, scan_count, public_id, slug, display_name, profession, bio, avatar_url, published, created_at",
            )
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("pages")
            .select("*")
            .eq("owner_user_id", authUser.id)
            .order("updated_at", { ascending: false }),
        ]);
        if (profilesError) throw profilesError;
        if (pagesError) throw pagesError;
        const primary = profilesData?.[0];
        if (primary)
          setPageProfile({
            display_name: primary.display_name,
            profession: primary.profession,
            bio: primary.bio,
            avatar_url: primary.avatar_url,
            published: primary.published,
            scan_count: primary.scan_count ?? 0,
            public_id: primary.public_id,
          });
        setCanonicalPage((pagesData?.[0] as Page | undefined) ?? null);
        const profileIds = (profilesData ?? []).map((item) => item.id);
        const { count } = profileIds.length
          ? await supabase
              .from("profile_links")
              .select("*", { count: "exact", head: true })
              .in("profile_id", profileIds)
          : { count: 0 };
        if (active)
          setStats({
            totalScans: (profilesData ?? []).reduce((sum, item) => sum + (item.scan_count ?? 0), 0),
            totalLinks: count ?? 0,
          });
      } catch (error) {
        console.error("Error loading Home:", error);
        toast.error("No se pudo cargar tu espacio.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const pageName = pageProfile?.display_name?.trim() || profile?.full_name || "Mi página";
  const publicUrl = canonicalPage?.public_id
    ? `/pg/${canonicalPage.public_id}`
    : pageProfile?.public_id
      ? `/p/${pageProfile.public_id}`
      : null;
  const firstName = useMemo(
    () => (profile?.full_name?.trim() || "bienvenido").split(/\s+/)[0],
    [profile?.full_name],
  );

  const createPage = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const ensuredProfile = await profileService.ensurePrimaryProfileForUser(supabase, {
        userId: user.id,
        email: user.email,
        userMetadata: user.user_metadata,
      });
      const created = await magicPageService.createPage(supabase, {
        userId: user.id,
        profileId: ensuredProfile.id,
        title: ensuredProfile.display_name || pageName,
        pageType: "landing",
      });
      await navigate({ to: "/pages/$pageId/edit", params: { pageId: created.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la página.");
    } finally {
      setCreating(false);
    }
  };

  const copyShare = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
    setCopied(true);
    toast.success("Enlace copiado");
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading)
    return (
      <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 text-sm text-[#8290a3]">
        Cargando tu espacio...
      </div>
    );
  if (!user || !profile)
    return (
      <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 text-sm text-[#8290a3]">
        No se pudo cargar tu perfil.
      </div>
    );

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#0d47a1]">Tu espacio de conversión</p>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#172235] sm:text-4xl">
            Hola, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#68778b] sm:text-base">
            Aquí tienes una vista rápida del rendimiento de tu página y de la actividad más
            reciente.
          </p>
        </div>
        {canonicalPage ? (
          <Link
            to="/pages/$pageId/edit"
            params={{ pageId: canonicalPage.id }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d47a1] px-4 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(13,71,161,.16)] hover:bg-[#0a3b87]"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Editar página
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void createPage()}
            disabled={creating}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d47a1] px-4 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(13,71,161,.16)] disabled:opacity-60"
          >
            {creating ? "Creando…" : "Crear página"}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <article className="overflow-hidden rounded-3xl border border-[#e3ebf5] bg-white shadow-[0_8px_30px_rgba(39,72,110,.06)]">
          <div className="flex items-center justify-between border-b border-[#edf2f8] px-5 py-4 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8290a3]">
                Vista previa
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#172235]">Mi página</h2>
            </div>
            {pageProfile && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pageProfile.published ? "bg-[#e8f6ee] text-[#17703e]" : "bg-[#fff7df] text-[#8f6900]"}`}
              >
                {pageProfile.published ? "Publicada" : "Borrador"}
              </span>
            )}
          </div>
          {canonicalPage && pageProfile ? (
            <div className="p-5 sm:p-7">
              <div className="rounded-2xl border border-[#edf2f8] bg-[#f7faff] p-5 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-2xl font-bold text-[#0d47a1] shadow-sm">
                    {pageProfile.avatar_url ? (
                      <img
                        src={pageProfile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      pageName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-2xl font-bold text-[#172235]">{pageName}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#68778b]">
                      {pageProfile.profession ||
                        pageProfile.bio ||
                        "Personaliza la identidad de tu página."}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    to="/pages/$pageId"
                    params={{ pageId: canonicalPage.id }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d8e2ef] bg-white px-3.5 text-sm font-semibold text-[#34445a] hover:border-[#0d47a1] hover:text-[#0d47a1]"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Ver página
                  </Link>
                  <button
                    type="button"
                    onClick={() => void copyShare()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d8e2ef] bg-white px-3.5 text-sm font-semibold text-[#34445a] hover:border-[#0d47a1] hover:text-[#0d47a1]"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}Compartir
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 p-6 sm:p-8">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf2ff] text-[#0d47a1]">
                <GlobePlaceholder />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#172235]">Aún no tienes una página</h3>
                <p className="mt-1 max-w-lg text-sm leading-6 text-[#68778b]">
                  Crea tu primera página pública para compartir tu identidad y tus enlaces.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void createPage()}
                disabled={creating}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0d47a1] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creating ? "Creando…" : "Crear página"}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </article>

        <aside className="rounded-3xl border border-[#e3ebf5] bg-white p-5 shadow-[0_8px_30px_rgba(39,72,110,.06)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8290a3]">Resumen</p>
          <h2 className="mt-1 text-lg font-bold text-[#172235]">Rendimiento</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Metric icon={Users} label="Personas vieron tu página" value={stats.totalScans} />
            <Metric icon={Link2} label="Enlaces activos" value={stats.totalLinks} />
          </div>
          <Link
            to={canonicalPage ? "/pages/$pageId/analytics" : "/pages"}
            params={canonicalPage ? { pageId: canonicalPage.id } : undefined}
            className="mt-5 flex items-center justify-between rounded-xl bg-[#f7faff] px-4 py-3 text-sm font-semibold text-[#0d47a1] hover:bg-[#eaf2ff]"
          >
            Ver más detalles
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </aside>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e3ebf5] bg-white p-5 shadow-[0_8px_30px_rgba(39,72,110,.06)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8290a3]">
              Actividad reciente
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#172235]">Últimos 7 días</h2>
          </div>
          <BarChart3 className="h-5 w-5 text-[#9aabc0]" aria-hidden />
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-[#dbe5f1] bg-[#fbfdff] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[#526176]">
            Todavía no hay actividad reciente disponible.
          </p>
          <p className="mt-1 text-xs text-[#8290a3]">
            Cuando tengamos eventos de los últimos 7 días, aparecerán aquí.
          </p>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#edf2f8] p-4">
      <div className="flex items-center gap-2 text-xs text-[#8290a3]">
        <Icon className="h-4 w-4 text-[#0d47a1]" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-[#172235]">{value.toLocaleString("es-CL")}</p>
    </div>
  );
}
function GlobePlaceholder() {
  return <QrCode className="h-6 w-6" aria-hidden />;
}
