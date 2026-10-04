import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { profileService } from "../services/profile.service";
import { linkService } from "../services/link.service";
import { getServerSupabaseClient } from "../lib/supabase/server";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { PublicProfileView } from "../components/profile/PublicProfileView";
import { useEffect, useRef } from "react";
import { requestCanonicalPublicEntry } from "../lib/public-entry-resolution/canonicalPublicResolution-server";
import { pickTrackingSearch } from "../lib/public-entry-resolution/publicEntryRouting";

export const Route = createFileRoute("/$alias")({
  // PHASE 3C: pure and env-free — the flag lives server-side only. Without
  // tracking params the dep is `undefined` (exactly today's loader cache key);
  // with them it only gets finer-grained, which is invisible (same rendered
  // output, same queries) and keeps UTM attribution across a canonical redirect.
  loaderDeps: ({ search }) => ({ tracking: pickTrackingSearch(search) }),
  validateSearch: (search: Record<string, unknown>) => search,
  loader: async ({ params, deps }) => {
    // Rutas reservadas
    const reservedRoutes = [
      "editor",
      "login",
      "auth",
      "api",
      "q",
      "qr",
      "account",
      "settings",
      "p",
      "terms",
      "privacy",
      "help",
      "support",
    ];
    const aliasLower = params.alias.toLowerCase();

    if (reservedRoutes.includes(aliasLower)) {
      throw notFound();
    }

    const supabase = getServerSupabaseClient();
    const profile = await profileService.getPublicProfileBySlug(supabase, aliasLower);

    if (!profile) {
      throw notFound();
    }

    // PHASE 3C — the whole decision (flag + allowlist + resolver + Supabase
    // port) is made SERVER-SIDE behind a createServerFn, so no configuration
    // ever reaches the browser and the decision is identical on both sides.
    // OFF / identity outside the allowlist → constant `render-legacy` here, and
    // the legacy flow below continues untouched (zero extra queries).
    const decision = await requestCanonicalPublicEntry({
      identifier: { kind: "legacy-profile-slug", value: aliasLower },
      identifiers: [aliasLower, profile.public_id],
      search: deps.tracking,
    });
    if (decision.kind === "redirect-to-page") {
      throw redirect({
        to: "/pg/$publicId",
        params: { publicId: decision.pagePublicId },
        ...(decision.search ? { search: decision.search } : {}),
      });
    }
    if (decision.kind === "not-found") throw notFound();

    const publication = profile.published_profile_config;
    const hasSnapshot =
      publication?.schemaVersion === 1 &&
      publication.profile &&
      Array.isArray(publication.links);
    if (!hasSnapshot && !profile.published_template_config) {
      throw notFound();
    }
    const publicProfile = hasSnapshot ? { ...profile, ...publication!.profile } : profile;
    const links = hasSnapshot
      ? publication!.links.filter((link) => link.enabled)
      : (await linkService.getProfileLinks(supabase, profile.id)).filter((l) => l.enabled);

    return { profile: publicProfile, links };
  },
  component: PublicProfilePageByAlias,
});

function PublicProfilePageByAlias() {
  const { profile, links } = Route.useLoaderData();
  const hasIncremented = useRef(false);

  useEffect(() => {
    if (!hasIncremented.current) {
      hasIncremented.current = true;
      const supabase = getBrowserSupabaseClient();
      profileService.incrementScanCount(supabase, profile.id).catch(console.error);
    }
  }, [profile.id]);

  return <PublicProfileView profile={profile} links={links} isPreview={false} />;
}
