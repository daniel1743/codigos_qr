# Landing Bot — MASTER CONTEXT (agent handoff)

> **Read this file first.** Single source of context for the Cripqer "Landing Bot"
> so any agent/human can continue without re-discovering the codebase.
>
> - **Implemented & committed:** `F1` (landing bot) and `F1.1` (security + durable quota).
> - **Owner Mode:** `CONTEXT_ONLY / DO_NOT_IMPLEMENT` → see §18 and
>   `.claude/plans/landing-bot-owner-mode.md`.
> - **Next step:** close & fully validate **F1/F1.1 at runtime** (see §14 and §18).
>
> Related plans: `.claude/plans/landing-bot.md` (F1 plan),
> `.claude/plans/landing-bot-owner-mode.md` (future).

---

## 0. TL;DR

A **per-landing, owner-configurable AI assistant** (multi-tenant, NOT FuXión-specific).
The owner enables it with a badge in the Magic editor, feeds it their own info, and
visitors chat with it on the public page (`/pg/...`). It can offer **WhatsApp** and,
for Pro, richer data (services/prices/social/stores). All security (tier, quota,
Pro-field stripping, rate limit) is enforced **server-side**.

**Reality check:** F1 is product-complete for the *free* scope; F1.1 hardens it.
It has **NOT** been validated end-to-end at runtime yet (needs the migration + env keys).

---

## 1. Vision
- **For visitors:** "Help me understand this business."
- **For owners (future):** "Help me understand my business." (Owner Mode — not built.)
- Long-term: the bot becomes the **conversational interface of Cripqer**.

---

## 2. Scope

### F1 (done) — public "owner bot"
- Owner config: enable/disable, assistant name, "who you are / what you do", tone,
  WhatsApp. Pro: services, hours, address, FAQ, social, stores, prices, bot face.
- Rendered on the public Magic page as a floating chat.
- Free vs Pro capabilities; free has a **monthly message quota**.

### F1.1 (done) — security & quota closure
- **Durable** Supabase quota by `public_id` / month.
- **Server-side tier resolution** (owner's effective billing tier).
- **Server-side stripping** of Pro-only fields for non-Pro owners.
- **Rate limit** (burst). · **Tests**.
- Forbidden (respected): avatar upload, icon library, new Pro UI, analytics expansion, F2 features.

### Forbidden / future (do NOT implement without explicit authorization)
Owner Mode (role resolution, intent routing, private analytics, owner tools),
monthly-plan gating, CRM access, private data retrieval, avatar upload, icon library.

---

## 3. Architecture & pipeline

### Public path
```
pg.$publicId / pg.a.$slug  (loader)
   → pageService.getPublicPageByPublicId  (safe RPC, anon)
   → isMagicPageDocument(published_template_config)
   → MagicPublicRenderer  (client)
        → EditorProvider (preview) → TemplateRenderer   (the page)
        → LandingBot  (if document.bot.enabled && publicId)
             → askLandingBotFn  (server function)
                  → core.server.answerLandingBot
                       • rate limit
                       • resolveLandingBotOwner   (privileged: owner + tier)
                       • consumeLandingBotQuota   (durable RPC + fallback)
                       • applyLandingBotTierPolicy (strip Pro for free)
                       • buildSystemPrompt → DeepSeek → OneProvider fallback
```
The visitor only ever sends `{ publicId, messages }`; everything sensitive is
resolved server-side.

### Editor path
```
Magic editor (pages.$pageId.edit)
   → select the whole page → action "Bot" (page case)
   → LandingBotPanel → ed.updateDoc(...) writes doc.bot
   → publish serializes doc.bot into the Magic document
```
On mobile the action also appears on the **Portada (hero)** as `Bot` + `Tema de página`.

---

## 4. Data model

`LandingBotConfig` lives inside the Magic document (`PageDoc.bot?` and
`MagicPageDocumentV1.bot?`). It is a **typed object** (NOT `props` strings) so it
can grow; it is **optional** so legacy documents stay valid (schema stays v1).

```ts
// src/isolated/magic-page-editor/types/editor.ts
export interface LandingBotConfig {
  enabled: boolean;
  persona: "generic" | "custom";   // "custom" = Pro (avatar)
  avatarUrl: string;               // "" = none                    (Pro)
  avatarIcon: string;              // "" = none                    (Pro)
  name: string;                    // assistant name
  about: string;                   // who the owner is / does      (free)
  tone: "cercano" | "formal" | "profesional";
  whatsapp: string;                // digits as typed              (free)
  whatsappEnabled: boolean;        //                              (free)
  services: string;  hours: string; address: string;              // Pro
  faq: string;       stores: string;                              // Pro
  social: { instagram; tiktok; youtube; facebook; website };      // Pro (strings)
  prices: { enabled: boolean; currency: string; items: {name;price}[] }; // Pro
}
```
Serialization: `src/features/magic-page-editor-production/magic-document.ts`
(`serializeMagicEditorState` / `hydrateMagicEditorState` carry `bot`).

---

## 5. Key files (map)

**Isomorphic logic (testable, no server imports):**
- `types/editor.ts` — `LandingBotConfig`, `PageDoc.bot?`.
- `lib/landing-bot/config.ts` — `createDefaultLandingBot`, `normalizeLandingBot`,
  `isLandingBotProTier`, `landingBotWhatsAppLink`.
- `lib/landing-bot/tier-policy.ts` — `applyLandingBotTierPolicy`, `hasProOnlyBotContent`, `LANDING_BOT_PRO_FIELDS`.
- `lib/landing-bot/rate-limit.ts` — `createRateLimiter`.
- `lib/landing-bot/quota.ts` — `currentQuotaPeriod`, `landingBotMonthlyLimit`,
  `createInMemoryQuota`, `LANDING_BOT_FREE_MONTHLY_LIMIT`, `LANDING_BOT_PRO_MONTHLY_LIMIT`.

**Server-only (`*.server.ts`):**
- `lib/landing-bot/server.ts` — `askLandingBotFn` (public POST), `getLandingBotPlanFn` (editor tier).
- `lib/landing-bot/core.server.ts` — `answerLandingBot` + `buildSystemPrompt` + providers.
- `lib/landing-bot/owner.server.ts` — `resolveLandingBotOwner` (privileged owner_user_id + tier).
- `lib/landing-bot/quota.server.ts` — `consumeLandingBotQuota` (durable RPC + fallback).

**UI:**
- `components/landing-bot/LandingBot.tsx` — public floating chat.
- `isolated/magic-page-editor/components/editor/controls/LandingBotPanel.tsx` — editor config panel.
- `features/magic-page-editor-production/MagicPublicRenderer.tsx` — mounts `LandingBot`.
- `isolated/magic-page-editor/components/editor/useSelectionActions.tsx` — page "Bot" action (+ hero Bot/Tema mobile).
- `routes/pg.$publicId.tsx`, `routes/pg.a.$slug.tsx` — pass `publicId` (+ verification variant).

**DB / tests:**
- `supabase/migrations/20261002000001_landing_bot_usage_quota.sql` — `landing_bot_usage` + `consume_landing_bot_quota`.
- `lib/landing-bot/__tests__/{tier-policy,rate-limit,quota}.test.ts`.

---

## 6. Public runtime flow (what actually runs)
1. Route loader loads the published Magic doc (safe RPC) and reads `document.bot`.
2. `MagicPublicRenderer` renders the page; if `document.bot.enabled` and `publicId`
   exist it mounts `<LandingBot publicId config />`.
3. Visitor sends a message → `askLandingBotFn({ data:{ publicId, messages } })`.
4. `answerLandingBot`:
   - reads the published doc again (server) and `normalizeLandingBot(config.bot)`;
   - if `!enabled` → "no disponible";
   - **rate limit** (burst) → friendly message if exceeded;
   - `resolveLandingBotOwner(publicId)` → `{ ownerUserId, tier }` (fail-closed `free`);
   - `consumeLandingBotQuota(publicId, tier, inMemory)` → allowed?;
   - `applyLandingBotTierPolicy(config, tier)` → strip Pro for free;
   - build system prompt → DeepSeek (primary) → OneProvider (fallback).
5. Reply returned; UI renders it (`LandingBot` formats `**bold**`, lists, line breaks).

---

## 7. Editor configuration
- Page-level action **"Bot"** in `useSelectionActions.tsx` (case `page`); `active`
  reflects `doc.bot?.enabled` (the "badge"). Opens `LandingBotPanel`.
- `LandingBotPanel` writes via `ed.updateDoc((d) => ({ ...d, bot: {...} }))`
  (undo-able; autosaved; published into the doc).
- Free fields always shown; Pro sections shown only when the editor tier resolves
  to Pro (`getLandingBotPlanFn`), otherwise a locked/upsell block.
- Also surfaced on the **hero ("Portada")** actions on mobile (`Bot`, `Tema de página`).

---

## 8. Security rules (HARD)
- **Tier, quota, Pro-field stripping and rate limit are server-side only.** The
  editor lock is UX; the server never trusts the client.
- The visitor input is `{ publicId, messages }` only — no owner data, no IDs.
- The bot must **never** reveal owner-only data (analytics, leads, billing, config).
- Never let the LLM decide identity/authorization (see §18).
- All privileged reads use the **service-role** client server-side; failures
  degrade safely (→ `free` / no-op / in-memory), never throw to the user.

---

## 9. Tier model
- Effective tiers: `free | pro | business | enterprise` (from `src/server/billing/entitlements.ts`,
  trusted resolver). Default/absent → `free`.
- `isLandingBotProTier`: `pro | business | enterprise`.
- Free = name, about, tone, WhatsApp, enable/disable, generic face.
- Pro = services, hours, address, FAQ, stores, social, prices, custom bot face.


---

## 10. Durable quota + rate limit (F1.1)
- **Monthly quota keyed by `public_id` + period `YYYY-MM` (UTC).**
  - Free = `LANDING_BOT_FREE_MONTHLY_LIMIT` (60); Pro = `LANDING_BOT_PRO_MONTHLY_LIMIT` (5000).
  - Durable path: RPC `consume_landing_bot_quota(p_public_id, p_period)` (atomic
    `INSERT ... ON CONFLICT +1`), called with the **service-role** client.
  - Fail-safe fallback: in-memory `createInMemoryQuota()` if the RPC/keys are missing.
- **Rate limit (burst):** `createRateLimiter({ windowMs: 60_000, max: 20 })` per
  `public_id`, applied before consuming quota (blocked → no quota consumed).

## 11. AI providers
- Configured **server-side only** (never `VITE_`). Primary **DeepSeek**, fallback
  **OneProvider**; the system prompt is built from the (tier-filtered) config.
- Optional model overrides via env (see §12).

## 12. Environment variables (server-side)
| Var | Purpose |
|---|---|
| `DEEPSEEK_API_KEY` | Primary provider key (required for real answers). |
| `DEEPSEEK_BASE_URL` | default `https://api.deepseek.com`. |
| `DEEPSEEK_MODEL` | default `deepseek-chat`. |
| `FALLBACK_API_KEY` / `FALLBACK_BASE_URL` / `FALLBACK_MODEL` | OneProvider fallback. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for tier resolution + durable quota (privileged reads). |
Without these, the bot degrades safely (no crash): no key → "no disponible";
no service role → tier `free` + in-memory quota.

## 13. Supabase migration (manual step)
Apply `supabase/migrations/20261002000001_landing_bot_usage_quota.sql`
(creates `landing_bot_usage` + `consume_landing_bot_quota`). Without it, the
server uses the in-memory fallback (works, but not durable/cross-instance).

## 14. Run / test / build / deploy
- Dev: `npm run dev` · Build: `npm run build` · Preview: `npm run preview` ·
  Tests: `npx vitest run` (or a path).
- Public bot appears at `/pg/{publicId}` (and `/pg/a/{slug}`) when enabled + published.
- "Deploy safe" = push a non-production branch (Vercel project **`codigos-qr`**
  creates a **Preview** deployment). Do **not** force-push.

## 15. Tests
`src/lib/landing-bot/__tests__/`: `tier-policy` (free strips / pro keeps / no
mutation), `rate-limit` (window + isolation), `quota` (period format, limits,
in-memory increment). All pure — no network, no DB.

## 16. Git state / commits
- Branch: **`backup/dirty-main-before-color-merge`** (remote: `origin` =
  `github.com/daniel1743/codigos_qr`).
- Relevant commits:
  - `53c483b` feat(bot): landing bot multi-inquilino + accesos Bot/Tema en el editor
  - `04706ad` feat(admin+verification): Admin nav móvil/escritorio + badge official-gold (Magic)
  - `3e33121` feat(landing-bot): enforce server-side tier policy and durable quota *(F1.1)*

## 17. Known caveats / decisions
- **Storage decision:** config lives in the Magic document (`bot`), not `props`
  strings (option 2, decided — see `.claude/plans/landing-bot.md`).
- **Editor Pro lock is UX only**; enforcement is server-side (§9). The editor
  panel reads the tier via `getLandingBotPlanFn` (fail-closed to `free`).
- **Adjacent, not part of the bot:** "Unificar color de texto" (`toneVars` +
  `PageRoot`) and the **admin/verification** work (Admin nav + `official-gold`
  badge via `PageVerificationContext` + `resolvePageVerification`).
- **Uncommitted (out of scope) known item:** `useSelectionActions.tsx` currently
  has `mobileOnly: true` back on the *page* palette action ("Tema de página"),
  which hides it on desktop (filter `!a.mobileOnly` in `FloatingToolbar`).
- Old `LANDING_BOT_FREE_DAILY_LIMIT` is now unused (kept to avoid churn).

## 18. Roadmap
**Immediate next step (NOT a new feature):** close & validate **F1/F1.1 at runtime**
— apply migration + env keys; test enable/disable, free quota, Pro stripping,
rate limit, WhatsApp button, publish → public render.

**F2 (only when authorized):** prices/social/stores/hours/FAQ polish; avatar/icon
upload; deeper tier gating; UX. Not started.

**Owner Mode (CONTEXT_ONLY / DO_NOT_IMPLEMENT):** see
`.claude/plans/landing-bot-owner-mode.md`. When authorized, order:
1) server-side identity; 2) role `visitor | authenticated_non_owner | owner`;
3) deterministic intent; 4) permissions by tier; 5) first private tool = weekly
summary; 6) LLM only phrases. **Always fail-closed**; never let free text
("soy Darwin") change the role.

## 19. Agent rules / conventions
- Read this file + the two plans before changing anything.
- Keep the **pipeline separated**: identity → intent → authorization → tool/data →
  LLM phrasing. The LLM never authorizes.
- Prefer **additive, fail-safe** changes; no schema/data loss; no force-push.
- Any new privileged read is **server-only** (`*.server.ts`) and must degrade safely.
- Keep the secret boundary: **no** `VITE_` keys for AI/DB privileged operations.
- validate with `npx vitest run` + `npm run build` before committing; commit
  selectively with a clear message.

