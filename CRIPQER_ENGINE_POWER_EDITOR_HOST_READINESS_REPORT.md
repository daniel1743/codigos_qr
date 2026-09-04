# Cripqer — Engine V2 / Power Editor V2 Host Readiness Report

Date: 2026-09-03  
Scope: host preparation only. Engine V2 and Power Editor V2 were not migrated.

## Pre-change audit

- HEAD: `d320f81d0e357249c8c64b66d5a57ef060995b8b`.
- Pre-existing dirty work: `BasicEditorShell.tsx`, `MobileBottomNavbar.tsx`, `README_PRODUCT_STRATEGY.md`, and the existing untracked `src/server/` billing-auth work.
- Current page model: a `profiles` row owned by `auth.users`, plus child `profile_links` rows.
- Stable public identity: `profiles.public_id` and `profiles.slug`; public routes are `/p/$publicId` and `/$alias`.
- Persistence: `profiles.template_config JSONB`, added by `20260830000001_add_template_fields.sql`.
- Current renderer: `BasicTemplateRenderer` and legacy `PublicProfileView`; no Power Editor renderer is installed in this host.
- Engine V1 is present under `src/lib/parametric-engine`; the V2 package remains external and was not copied.
- The current Basic save flow previously sent the full in-memory `template_config` on profile updates. That preserved unknown keys only accidentally and was unsafe for concurrent/future editor ownership.

## Readiness verdicts

| Requirement                                   | Result                  | Evidence / limitation                                                                                                     |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Current Cripqer page model identified         | YES                     | `profiles` + `profile_links`                                                                                              |
| Current persistence safe for canonical config | PARTIAL → PREPARED      | Existing JSONB fits the opaque V2 config; atomic Basic namespace patch is now provided by RPC                             |
| Basic Editor overwrote full page              | PARTIAL                 | It did not replace the full `profiles` row, but the legacy save path previously replaced the full `template_config` JSONB |
| Basic Editor patch adapter prepared           | YES                     | `src/lib/basic-editor-persistence/patch.ts` and `profileService.updateBasicEditorProfile`                                 |
| Unknown/premium JSON preserved                | YES for Basic patches   | RPC merges only `basic_link_presentations` and `professional_badge`                                                       |
| Stable block/item IDs                         | PARTIAL                 | `profile_links.id` is stable; V2 block IDs are opaque until package migration                                             |
| Legacy Basic pages preserved                  | YES                     | Legacy JSON remains readable; absent canonical envelope returns `null`                                                    |
| Canonical page envelope prepared              | YES                     | `schemaVersion: 1` + opaque `editorConfig`                                                                                |
| Host action contract defined                  | YES                     | `src/lib/host-contracts/action-contract.ts`                                                                               |
| Calendar/form semantics                       | PARTIAL                 | External booking is supported as a URL; native calendar/forms are explicitly not implemented                              |
| Server-only API boundary ready                | YES                     | `src/server/integrations/server-fetch.ts`; provider keys are server env only                                              |
| Dual-editor routing prepared                  | YES, internal seam only | `/editor` remains current Basic route; no Power route or public navigation was added                                      |
| Production behavior changed                   | NO by intent            | Only save internals and dormant host infrastructure changed                                                               |
| Engine migrated                               | NO                      | Required freeze honored                                                                                                   |
| Power Editor migrated                         | NO                      | Required freeze honored                                                                                                   |

## Migration blockers

1. The handoff’s `BioTemplateConfig` type depends on `@/premium-template-studio/types`, which is not present in this host. The envelope therefore validates only the host boundary and keeps `editorConfig` opaque.
2. The ownership matrix for exact V2 canonical paths was not available. No speculative mapping was invented.
3. Native booking/form persistence, notifications, spam controls, and availability are not current V1 host capabilities.
4. Plan gating and downgrade behavior need an explicit product policy before the Power route is exposed.

## Validation

- Target TypeScript diagnostics: 0 for the new host files and touched adapter/service files; the repository-wide typecheck still contains unrelated pre-existing diagnostics.
- ESLint: PASS for the directed changed-file set.
- Prettier: PASS for the directed changed-file and readiness-document set. SQL was reviewed as SQL and not reformatted by Prettier.
- Persistence self-check: PASS, 8/8 assertions.
- Build: PASS (`npm run build`).
- Static client boundary scan: PASS for server integration secret names; the authenticated Supabase RPC names are intentionally callable contract references, not secrets.
- No Engine V2 or Power Editor V2 files copied.
