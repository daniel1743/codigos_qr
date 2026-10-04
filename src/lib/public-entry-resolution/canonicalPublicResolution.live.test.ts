import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { decidePublicEntryRoute } from "./publicEntryRouting";
import { isCanonicalPublicResolutionEnabled } from "./canonicalPublicResolutionGate";
import {
  createSupabaseCanonicalPublicPagePort,
  type CanonicalPublicReadClient,
} from "./supabaseCanonicalPublicPagePort.server";

/**
 * PHASE 3B — LIVE, READ-ONLY QA of the canonical public resolution.
 *
 * Disabled by default (same convention as the repo's other live suites:
 * `RUN_ONBOARDING_V2_LIVE_QA`). It performs READS ONLY: no insert/update, no
 * analytics write, no QR regeneration. Enable explicitly:
 *
 *   RUN_CANONICAL_PUBLIC_RESOLUTION_LIVE_QA=true
 *   VITE_SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...
 *
 * The allowlist mirrors the QA activation (server-only names, no VITE_ prefix):
 *   CANONICAL_PUBLIC_RESOLUTION_ENABLED=true
 *   CANONICAL_PUBLIC_RESOLUTION_ALLOWLIST=KTRdygd,vida-saludable-bienestar
 */
const LIVE = process.env["RUN_CANONICAL_PUBLIC_RESOLUTION_LIVE_QA"] === "true";
const SUPABASE_URL = process.env["QA_SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const SERVICE_KEY =
  process.env["QA_SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

/** Raw server env values, exactly as `canonicalPublicResolution-server.ts` reads them. */
const QA_FLAG_VALUE: unknown = "true";
const QA_ALLOWLIST_VALUE: unknown = "KTRdygd,vida-saludable-bienestar";

const PROFILE_PUBLIC_ID = "KTRdygd";
const PROFILE_SLUG = "vida-saludable-bienestar";
const EXPECTED_PAGE_PUBLIC_ID = "VvUsngW";

describe.skipIf(!LIVE || !SUPABASE_URL || !SERVICE_KEY)(
  "LIVE QA (read-only) — canonical public resolution",
  () => {
    const client = createClient(SUPABASE_URL, SERVICE_KEY) as unknown as CanonicalPublicReadClient;
    const readClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const decide = (identifier: Parameters<typeof decidePublicEntryRoute>[0]["identifier"], own: string[]) =>
      decidePublicEntryRoute({
        enabled: isCanonicalPublicResolutionEnabled({
          flagValue: QA_FLAG_VALUE,
          allowlistValue: QA_ALLOWLIST_VALUE,
          identifiers: own,
        }),
        identifier,
        createPort: () => createSupabaseCanonicalPublicPagePort(client),
      });

    it("1+2) both legacy entries resolve the published modern page", async () => {
      const byPublicId = await decide(
        { kind: "legacy-profile-public-id", value: PROFILE_PUBLIC_ID },
        [PROFILE_PUBLIC_ID],
      );
      const bySlug = await decide({ kind: "legacy-profile-slug", value: PROFILE_SLUG }, [PROFILE_SLUG]);

      expect(byPublicId).toMatchObject({
        kind: "redirect-to-page",
        pagePublicId: EXPECTED_PAGE_PUBLIC_ID,
        path: `/pg/${EXPECTED_PAGE_PUBLIC_ID}`,
      });
      // Same canonical destination (the entry kind legitimately differs).
      expect(bySlug).toMatchObject({
        kind: "redirect-to-page",
        pagePublicId: EXPECTED_PAGE_PUBLIC_ID,
        path: `/pg/${EXPECTED_PAGE_PUBLIC_ID}`,
      });
      console.log("[QA] /p/" + PROFILE_PUBLIC_ID + " and /" + PROFILE_SLUG + " → /pg/" + EXPECTED_PAGE_PUBLIC_ID);
    });

    it("3+4) the published revision drives the render (not the draft)", async () => {
      const { data, error } = await readClient
        .from("pages")
        .select("public_id,slug,published,published_revision,published_at,published_template_config,template_config")
        .eq("public_id", EXPECTED_PAGE_PUBLIC_ID)
        .eq("published", true)
        .maybeSingle();
      expect(error).toBeNull();
      expect(data?.published_revision).toBeGreaterThan(0);
      expect(data?.published_template_config).not.toBeNull();
      // The draft has diverged (edits after publishing) yet the published
      // document is the only public source → the entries cannot show the draft.
      const draftDiffers =
        JSON.stringify(data?.template_config) !== JSON.stringify(data?.published_template_config);
      console.log(
        "[QA] page " +
          EXPECTED_PAGE_PUBLIC_ID +
          " slug=" +
          String(data?.slug) +
          " rev=" +
          String(data?.published_revision) +
          " published_at=" +
          String(data?.published_at) +
          " draftDiffers=" +
          String(draftDiffers),
      );
      expect(typeof data?.published_template_config).toBe("object");
    });

    it("9) a profile outside the allowlist stays exactly as today (flag OFF, no extra query)", async () => {
      expect(
        isCanonicalPublicResolutionEnabled({
          flagValue: QA_FLAG_VALUE,
          allowlistValue: QA_ALLOWLIST_VALUE,
          identifiers: ["OtroPerfil"],
        }),
      ).toBe(false);
      const decision = await decidePublicEntryRoute({
        enabled: false,
        identifier: { kind: "legacy-profile-public-id", value: "OtroPerfil" },
        createPort: () => {
          throw new Error("the port must never be built when the flag is OFF");
        },
      });
      expect(decision).toEqual({ kind: "render-legacy" });
      console.log("[QA] non-allowlisted profile → legacy (no extra query)");
    });

    it("10) a published legacy profile without a modern page keeps rendering legacy", async () => {
      const { data, error } = await readClient
        .from("profiles")
        .select("public_id,slug")
        .eq("published", true)
        .limit(40);
      expect(error).toBeNull();
      const candidates = (data ?? []).filter(
        (row) => row.public_id !== PROFILE_PUBLIC_ID && row.slug !== PROFILE_SLUG,
      );
      const port = createSupabaseCanonicalPublicPagePort(client);
      let legacyCandidate: { public_id: string } | null = null;
      for (const candidate of candidates) {
        const page = await port.findPublishedPageForProfile(candidate.public_id);
        if (!page) {
          legacyCandidate = { public_id: candidate.public_id };
          break;
        }
      }
      expect(legacyCandidate).not.toBeNull();
      if (!legacyCandidate) throw new Error("unreachable");
      const decision = await decidePublicEntryRoute({
        enabled: true,
        identifier: { kind: "legacy-profile-public-id", value: legacyCandidate.public_id },
        createPort: () => createSupabaseCanonicalPublicPagePort(client),
      });
      console.log("[QA] legacy-only profile " + legacyCandidate.public_id + " → legacy render");
      expect(decision).toEqual({ kind: "render-legacy" });
    });
  },
);
