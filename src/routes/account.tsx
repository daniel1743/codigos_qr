import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Home,
  Layers,
  Link2,
  LogOut,
  Pencil,
  QrCode,
  ScanLine,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { CqEmptyState } from "../components/cq-ui/CqEmptyState";
import { CqIconTile } from "../components/cq-ui/CqIconTile";
import { CqPageHeader } from "../components/cq-ui/CqPageHeader";
import { CqPanel } from "../components/cq-ui/CqPanel";
import { CqStatusPill } from "../components/cq-ui/CqStatusPill";
import { cqIconButton, cqPrimaryButton, cqSecondaryButton } from "../components/cq-ui/buttonStyles";
import { editRouteSearch } from "../components/home/editRouteSearch";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { getAliasProfileUrl, getPublicProfileUrl } from "../lib/url";
import { resolveCanonicalMagicPageId } from "../lib/editor-routing/resolveCanonicalMagicPage";
import { pageService } from "../services/page.service";
import { profileService } from "../services/profile.service";
import type { Profile } from "../types/database";

/**
 * F6 — Account / Perfil.
 *
 * Presentation-only migration onto the Magic `cq-*` language approved in F1–F5.
 * Every rendered value comes from a source this app already owns:
 *
 *   name / avatar / email / member-since  → Supabase auth user
 *   public id, alias, published, scans    → `profiles` row (profileService)
 *   links count                           → `profile_links` count (same query as F3 /pages)
 *   pages count                           → pageService.listOwnPages (same call as AppShell)
 *   canonical Magic page id               → resolveCanonicalMagicPageId (unchanged)
 *
 * Deliberately NOT ported from the Magic prototype because there is no real
 * capability behind them: plan / freemium / billing UI, `/account/plan`,
 * DangerZone account deletion, SecuritySettings, ProTools. The five dead
 * "Próximamente" rows of the previous version are gone for the same reason, and
 * so is the Premium/Gratis badge (`hasPremiumAccessByEmail` is a hard-coded
 * development email allowlist, not a subscription backend).
 */
export const Route = createFileRoute("/account")({
  component: AccountPage,
});

type AccountData = {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  profile: Profile | null;
  publicUrl: string | null;
  aliasUrl: string | null;
  links: number;
  pages: number;
  canonicalPageId: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

function AccountPage() {
  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AccountData | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) return;

        const profile = await profileService.getProfileByUserId(supabase, authUser.id);

        const [pages, linkCount, canonicalPageId] = await Promise.all([
          pageService.listOwnPages(supabase, authUser.id, profile?.id),
          profile?.id
            ? supabase
                .from("profile_links")
                .select("*", { count: "exact", head: true })
                .eq("profile_id", profile.id)
                .then((res: { count: number | null }) => res.count ?? 0)
            : Promise.resolve(0),
          resolveCanonicalMagicPageId(supabase, authUser.id),
        ]);

        if (!active) return;
        const metaName =
          typeof authUser.user_metadata?.full_name === "string"
            ? authUser.user_metadata.full_name
            : typeof authUser.user_metadata?.name === "string"
              ? authUser.user_metadata.name
              : null;

        setData({
          displayName: metaName,
          email: authUser.email ?? "",
          avatarUrl:
            typeof authUser.user_metadata?.avatar_url === "string"
              ? authUser.user_metadata.avatar_url
              : (profile?.avatar_url ?? null),
          joinedAt: authUser.created_at ?? (profile?.created_at ?? null),
          profile,
          publicUrl: profile?.public_id ? getPublicProfileUrl(profile.public_id) : null,
          aliasUrl: profile?.slug ? getAliasProfileUrl(profile.slug) : null,
          links: linkCount,
          pages: pages.length,
          canonicalPageId,
        });
      } catch (error) {
        console.error("Error loading account:", error);
        toast.error("No se pudieron cargar los datos de tu cuenta.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
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


  if (loading) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <p className="text-sm text-cq-muted" role="status">
            Cargando tu cuenta…
          </p>
        </main>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <CqEmptyState
            headingId="account-no-session-heading"
            icon={<UserRound className="h-6 w-6" />}
            title="Sin sesión activa"
            description="Inicia sesión para ver los datos de tu cuenta."
            action={
              <Link to="/login" search={{ mode: undefined }} className={cqPrimaryButton}>
                Iniciar sesión
              </Link>
            }
          />
        </main>
      </AppShell>
    );
  }

  const profile = data.profile;
  const name =
    data.displayName || profile?.display_name?.trim() || data.email.split("@")[0] || "Usuario";
  const role = profile?.profession?.trim() || null;
  const publicLabel = (data.publicUrl || data.aliasUrl || "").replace(/^https?:\/\//, "");

  const facts = [
    { id: "pages", label: "Páginas", value: data.pages, icon: Layers },
    { id: "links", label: "Enlaces", value: data.links, icon: Link2 },
    { id: "scans", label: "Escaneos", value: profile?.scan_count ?? 0, icon: ScanLine },
  ];

  const linkRows = [
    { key: "public", label: "Identidad pública", url: data.publicUrl },
    { key: "alias", label: "Alias corto", url: data.aliasUrl },
  ].filter((row) => Boolean(row.url));

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <CqPageHeader
          title="Cuenta"
          description="Tu identidad, el estado real de tu página y las acciones disponibles."
          pill={
            profile ? (
              <CqStatusPill
                tone={profile.published ? "positive" : "neutral"}
                label={profile.published ? "Publicada" : "Borrador"}
              />
            ) : undefined
          }
          context={
            publicLabel ? (
              <span className="break-all font-mono text-[12px]">{publicLabel}</span>
            ) : (
              "Aún no tienes una identidad pública publicada."
            )
          }
        />

        <div className="mt-6 grid gap-5 sm:mt-10 lg:grid-cols-12 lg:items-start lg:gap-6">
          <div className="min-w-0 space-y-5 lg:col-span-5">
            {/* Identity — auth user + the real profiles row. */}
            <CqPanel headingId="account-identity-heading" title="Identidad">
              <div className="flex min-w-0 items-start gap-4">
                <Avatar className="h-16 w-16 shrink-0 rounded-cq-lg border border-cq-line">
                  <AvatarImage src={data.avatarUrl ?? undefined} alt={name} />
                  <AvatarFallback className="rounded-cq-lg bg-cq-blue-50 text-xl font-bold text-cq-blue">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-bold leading-tight text-cq-ink">{name}</p>
                  {role ? <p className="truncate text-[13px] text-cq-muted">{role}</p> : null}
                  <p className="mt-1 truncate text-[13px] text-cq-subtle">{data.email}</p>
                  {formatDay(data.joinedAt) ? (
                    <p className="mt-2 text-[12px] text-cq-subtle">
                      Miembro desde {formatDay(data.joinedAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-cq-line pt-4">
                {facts.map(({ id, label, value, icon: Icon }) => (
                  <div key={id} className="min-w-0">
                    <dt className="flex items-center gap-1.5 text-[11.5px] text-cq-subtle">
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </dt>
                    <dd className="mt-1 text-[19px] font-bold leading-none text-cq-ink tabular-nums">
                      {value.toLocaleString("es")}
                    </dd>
                  </div>
                ))}
              </dl>
            </CqPanel>

            {/* Public presence — only URLs the app can really generate. */}
            <CqPanel
              headingId="account-links-heading"
              title="Presencia pública"
              description={
                profile
                  ? "Enlaces generados desde tu identidad en Supabase."
                  : "Crea tu perfil para obtener tu enlace público."
              }
            >
              {linkRows.length > 0 ? (
                <ul className="divide-y divide-cq-line">
                  {linkRows.map((row) => (
                    <li key={row.key} className="flex min-w-0 items-center gap-3 py-3 first:pt-0">
                      <CqIconTile size="sm">
                        <Globe2 className="h-4 w-4" />
                      </CqIconTile>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] text-cq-subtle">{row.label}</p>
                        <p className="truncate font-mono text-[12.5px] text-cq-ink">
                          {row.url?.replace(/^https?:\/\//, "")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={cqIconButton}
                        onClick={() => void copyUrl(row.url as string)}
                        aria-label={`Copiar ${row.label}`}
                      >
                        {copiedUrl === row.url ? (
                          <Check className="h-4 w-4 text-cq-blue" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] leading-relaxed text-cq-muted">
                  Todavía no hay enlaces públicos asociados a esta cuenta.
                </p>
              )}

              {formatDay(profile?.updated_at) || formatDay(profile?.published_at) ? (
                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-cq-line pt-4 text-[12px] text-cq-subtle">
                  {formatDay(profile?.updated_at) ? (
                    <div className="flex items-center gap-1.5">
                      <dt>Última edición</dt>
                      <dd className="font-semibold text-cq-ink">{formatDay(profile?.updated_at)}</dd>
                    </div>
                  ) : null}
                  {formatDay(profile?.published_at) ? (
                    <div className="flex items-center gap-1.5">
                      <dt>Última publicación</dt>
                      <dd className="font-semibold text-cq-ink">
                        {formatDay(profile?.published_at)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </CqPanel>
          </div>

          {/* Actions — only routes and behaviour that already exist. */}
          <div className="min-w-0 space-y-5 lg:col-span-7">
            <CqPanel headingId="account-actions-heading" title="Acciones">
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <button
                  type="button"
                  className={cqSecondaryButton}
                  onClick={() =>
                    void navigate(
                      data.canonicalPageId
                        ? {
                            to: "/pages/$pageId/edit",
                            params: { pageId: data.canonicalPageId },
                            search: editRouteSearch,
                          }
                        : { to: "/profile" },
                    )
                  }
                >
                  <Pencil className="h-4 w-4 text-cq-muted" aria-hidden="true" />
                  {data.canonicalPageId ? "Editar página" : "Editar perfil"}
                </button>

                {data.publicUrl ? (
                  <a
                    href={data.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${cqSecondaryButton} no-underline`}
                  >
                    <ExternalLink className="h-4 w-4 text-cq-muted" aria-hidden="true" />
                    Ver página
                  </a>
                ) : (
                  <button type="button" className={cqSecondaryButton} disabled>
                    <ExternalLink className="h-4 w-4 text-cq-muted" aria-hidden="true" />
                    Ver página
                  </button>
                )}

                <Link to="/page" className={`${cqSecondaryButton} no-underline`}>
                  <QrCode className="h-4 w-4 text-cq-muted" aria-hidden="true" />
                  Ver QR
                </Link>

                <Link to="/profile" className={`${cqSecondaryButton} no-underline`}>
                  <Home className="h-4 w-4 text-cq-muted" aria-hidden="true" />
                  Inicio
                </Link>
              </div>
            </CqPanel>

            <CqPanel
              headingId="account-session-heading"
              title="Sesión"
              description="Cierra tu sesión en este navegador."
            >
              <button
                type="button"
                onClick={() => void signOut()}
                className={`${cqSecondaryButton} justify-center text-red-600 hover:bg-red-50 hover:text-red-700`}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Cerrar sesión
              </button>
            </CqPanel>

            <p className="px-1 text-center text-[11.5px] text-cq-subtle">
              Cripqer versión 1.0.0
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

export default AccountPage;
