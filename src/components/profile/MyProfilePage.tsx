import { useEffect, useMemo, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { getPublicPageAliasUrl, getPublicPageUrl, getPublicProfileUrl } from "../../lib/url";
import { magicPageService } from "../../services/magic-page.service";
import { profileService } from "../../services/profile.service";
import type { Page } from "../../types/database";
import { ActivityPanel } from "../home/ActivityPanel";
import { HomeHero } from "../home/HomeHero";
import { NoPageCard, PageAssetCard } from "../home/PageAssetCard";
import { PerformancePanel } from "../home/PerformancePanel";
import { QuickDestinations } from "../home/QuickDestinations";
import { editRouteSearch } from "../home/editRouteSearch";
import { useHomeAnalytics } from "../home/useHomeAnalytics";
import { useAdminStatus } from "../../lib/use-admin-status";

type UserProfile = {
  email: string;
  full_name?: string | undefined;
  avatar_url?: string | undefined;
  created_at: string;
};

type PageProfile = {
  display_name: string;
  profession?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  published: boolean;
  scan_count: number;
  public_id: string;
  slug?: string | null;
  created_at?: string | null;
};

const ANALYTICS_DAYS = 30;

function formatDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * F2 - Home / Command Center (/profile).
 *
 * Data contract identical to the previous implementation (Supabase auth.getUser,
 * the owner of the profiles row, the owner pages rows and a profile_links count).
 * F2 adds a READ-ONLY consumption of the existing legacy Analytics page summary for
 * the primary page and renders presentation components. Nothing is mocked and no
 * Analytics engine, service, contract, gate or mode is modified.
 */
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
  const { isAdmin } = useAdminStatus();
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
            slug: primary.slug,
            created_at: primary.created_at,
          });
        setCanonicalPage((pagesData?.[0] as Page | undefined) ?? null);
        const profileIds = (profilesData ?? []).map((item: { id: string }) => item.id);
        const { count } = profileIds.length
          ? await supabase
              .from("profile_links")
              .select("*", { count: "exact", head: true })
              .in("profile_id", profileIds)
          : { count: 0 };
        if (active)
          setStats({
            totalScans: (profilesData ?? []).reduce(
              (sum: number, item: { scan_count?: number | null }) => sum + (item.scan_count ?? 0),
              0,
            ),
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
  }, [supabase]);  const analytics = useHomeAnalytics(canonicalPage?.id ?? null, ANALYTICS_DAYS);

  const firstName = useMemo(() => {
    const value = profile?.full_name?.trim();
    if (!value) return "bienvenido";
    return value.split(/\s+/)[0] ?? value;
  }, [profile?.full_name]);

  const displayName =
    pageProfile?.display_name?.trim() || profile?.full_name || canonicalPage?.title || "Mi pagina";
  const tagline = pageProfile?.profession?.trim() || pageProfile?.bio?.trim() || null;
  const avatarUrl = pageProfile?.avatar_url || profile?.avatar_url || null;

  const pageUrl = canonicalPage?.public_id ? getPublicPageUrl(canonicalPage.public_id) : null;
  const aliasUrl =
    canonicalPage?.published && canonicalPage.slug ? getPublicPageAliasUrl(canonicalPage.slug) : null;
  const profileUrl = pageProfile?.public_id ? getPublicProfileUrl(pageProfile.public_id) : null;
  const shareUrl = aliasUrl ?? pageUrl ?? profileUrl;
  const shareLabel = shareUrl ? shareUrl.replace(/^https?:\/\//, "") : null;

  const summary = analytics.summary;
  const published = canonicalPage ? canonicalPage.published : (pageProfile?.published ?? false);
  const visits30d = analytics.status === "ready" && summary ? summary.visits : null;

  const createPage = async () => {
    if (!isAdmin || !user || creating) return;
    setCreating(true);
    try {
      const ensuredProfile = await profileService.ensurePrimaryProfileForUser(supabase, {
        userId: user.id,
        email: user.email ?? null,
        userMetadata: user.user_metadata,
      });
      const created = await magicPageService.createPage(supabase, {
        userId: user.id,
        profileId: ensuredProfile.id,
        title: ensuredProfile.display_name || displayName,
        pageType: "landing",
      });
      await navigate({
        to: "/pages/$pageId/edit",
        params: { pageId: created.id },
        search: editRouteSearch,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la pagina.");
    } finally {
      setCreating(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Enlace copiado");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 text-sm text-cq-subtle">
        Cargando tu espacio...
      </div>
    );
  if (!user || !profile)
    return (
      <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 text-sm text-cq-subtle">
        No se pudo cargar tu perfil.
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-cq-page px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <HomeHero
        firstName={firstName}
        hasPage={Boolean(canonicalPage)}
        editPageId={canonicalPage?.id ?? null}
        visits30d={visits30d}
        onCreate={() => void createPage()}
        creating={creating}
        canCreatePage={isAdmin}
      />

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {canonicalPage ? (
            <PageAssetCard
              displayName={displayName}
              tagline={tagline}
              avatarUrl={avatarUrl}
              published={published}
              publicUrl={shareUrl}
              linkLabel={shareLabel}
              updatedLabel={formatDay(canonicalPage.updated_at)}
              createdLabel={formatDay(canonicalPage.created_at)}
              scans={stats.totalScans}
              links={stats.totalLinks}
              pageId={canonicalPage.id}
              onCopyShare={() => void copyShare()}
              copied={copied}
            />
          ) : (
            <NoPageCard onCreate={() => void createPage()} creating={creating} canCreatePage={isAdmin} />
          )}

          <PerformancePanel
            status={analytics.status}
            days={analytics.days}
            visits={summary?.visits ?? 0}
            buttonClicks={summary?.buttonClicks ?? 0}
            whatsappClicks={summary?.whatsappClicks ?? 0}
            interest={(summary?.productClicks ?? 0) + (summary?.serviceClicks ?? 0)}
            daily={summary?.dailyVisits ?? []}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <ActivityPanel analyticsPageId={canonicalPage?.id ?? null} />
          <QuickDestinations pageId={canonicalPage?.id ?? null} canCreatePage={isAdmin} />
        </div>
      </div>
    </div>
  );
}

export default MyProfilePage;
