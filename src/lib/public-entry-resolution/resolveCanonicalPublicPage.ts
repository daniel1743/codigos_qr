/**
 * PHASE 1 — Canonical public entry resolution (pure, dependency-injected).
 *
 * Problem it solves (see audit `cripqer-qr-routing-canonical-page-audit`):
 * the same person can be reached through several entry points that today read
 * DIFFERENT publications:
 *
 *   /{profiles.slug}            → profiles.published_*        (legacy renderer)
 *   /p/{profiles.public_id}     → bridge → /pg/{pages.public_id}
 *   /pg/{pages.public_id}       → pages.published_template_config
 *   /pg/a/{pages.slug}          → pages.published_template_config
 *   /q/{pages.public_id}        → pages.published_template_config (+ qr_scan)
 *
 * Canonical rule implemented here (approved decision):
 *
 *   - `pages` is the source of truth **when a modern published page exists**.
 *   - Legacy profiles that have NOT migrated keep resolving to the legacy
 *     presentation (never a 404, never a silent rewrite).
 *
 * This module is deliberately PURE: it performs no I/O and imports nothing from
 * Supabase, routes, analytics or the renderers. All data access goes through
 * `CanonicalPublicPagePort`, so it is unit-testable without a database and can be
 * wired into the routes in Phase 2/3 without touching their current behaviour.
 */

/** Every entry point family the audit identified. */
export type PublicEntryKind =
  | "page-public-id"
  | "page-slug"
  | "legacy-profile-public-id"
  | "legacy-profile-slug";

export interface PublicEntryIdentifier {
  kind: PublicEntryKind;
  value: string;
}

/** A PUBLISHED page (the caller never receives draft data). */
export interface PublishedPageRef {
  pagePublicId: string;
  pageSlug: string | null;
}

/** A PUBLISHED legacy profile. */
export interface PublishedProfileRef {
  profilePublicId: string;
  profileSlug: string | null;
}

/**
 * Data access required by the resolver. Every method MUST return published data
 * only (the existing RPCs already behave that way) and MUST return `null` for
 * unknown/unpublished identifiers — never draft rows, never legacy fallbacks.
 */
export interface CanonicalPublicPagePort {
  /** Stable identity `/pg/{pagePublicId}`. */
  findPublishedPageByPublicId(publicId: string): Promise<PublishedPageRef | null>;
  /** Custom alias `/pg/a/{pageSlug}` (lives in `pages.slug`, global-unique). */
  findPublishedPageBySlug(slug: string): Promise<PublishedPageRef | null>;
  /** Legacy identity `/p/{profilePublicId}` (lives in `profiles.public_id`). */
  findPublishedProfileByPublicId(publicId: string): Promise<PublishedProfileRef | null>;
  /** Legacy root alias `/{profileSlug}` (lives in `profiles.slug`). */
  findPublishedProfileBySlug(slug: string): Promise<PublishedProfileRef | null>;
  /**
   * Compatibility bridge used by the historical QR: the modern published page
   * owned by this profile, or `null` when the profile has not migrated yet.
   */
  findPublishedPageForProfile(profilePublicId: string): Promise<PublishedPageRef | null>;
}

export type CanonicalPublicTarget =
  | {
      kind: "page";
      /** Canonical identity: what every entry point should end up rendering. */
      pagePublicId: string;
      pageSlug: string | null;
      /** Relative canonical path (callers prepend the public origin). */
      canonicalPath: string;
      /** Which entry point produced this resolution. */
      resolvedFrom: PublicEntryKind;
    }
  | {
      kind: "legacy-profile";
      profilePublicId: string;
      profileSlug: string | null;
      resolvedFrom: PublicEntryKind;
    }
  | { kind: "not-found"; resolvedFrom: PublicEntryKind };

function canonicalPagePath(pagePublicId: string): string {
  return `/pg/${pagePublicId}`;
}

function pageTarget(page: PublishedPageRef, resolvedFrom: PublicEntryKind): CanonicalPublicTarget {
  return {
    kind: "page",
    pagePublicId: page.pagePublicId,
    pageSlug: page.pageSlug,
    canonicalPath: canonicalPagePath(page.pagePublicId),
    resolvedFrom,
  };
}

/**
 * Resolve ONE public entry point to its canonical target.
 *
 * Ordering rule: a published page always wins over the legacy profile, because
 * `pages.published_template_config` is the single public source of truth. When
 * no published page exists the legacy profile is preserved as-is.
 *
 * Errors from the port are NOT swallowed: callers must decide explicitly what a
 * resolution outage means (the audit forbids silent fallbacks).
 */
export async function resolveCanonicalPublicPage(
  port: CanonicalPublicPagePort,
  identifier: PublicEntryIdentifier,
): Promise<CanonicalPublicTarget> {
  const { kind } = identifier;
  const value = (identifier.value ?? "").trim();
  if (!value) return { kind: "not-found", resolvedFrom: kind };

  if (kind === "page-public-id") {
    const page = await port.findPublishedPageByPublicId(value);
    return page ? pageTarget(page, kind) : { kind: "not-found", resolvedFrom: kind };
  }

  if (kind === "page-slug") {
    const page = await port.findPublishedPageBySlug(value);
    return page ? pageTarget(page, kind) : { kind: "not-found", resolvedFrom: kind };
  }

  const profile =
    kind === "legacy-profile-public-id"
      ? await port.findPublishedProfileByPublicId(value)
      : await port.findPublishedProfileBySlug(value);

  if (!profile) return { kind: "not-found", resolvedFrom: kind };

  // Canonical preference: the modern published page of this profile, if any.
  const migrated = await port.findPublishedPageForProfile(profile.profilePublicId);
  if (migrated) return pageTarget(migrated, kind);

  // Not migrated yet → keep the legacy presentation (no silent rewrite).
  return {
    kind: "legacy-profile",
    profilePublicId: profile.profilePublicId,
    profileSlug: profile.profileSlug,
    resolvedFrom: kind,
  };
}
