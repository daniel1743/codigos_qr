# CRIPQER — OWNER MEDIA LIVE UPLOAD SMOKE V1

**Task ID:** `CRIPQER_OWNER_MEDIA_LIVE_UPLOAD_SMOKE_V1`
**Agent:** CODEX (RUNTIME_VERIFICATION_ONLY)
**Branch:** `feat/basic-editor-editorial-canvas-ui` (forbidden `main` — not touched)
**Date:** 2026-09-16
**Route:** `/onboarding-test`

> **SUCCESS GATE:** `CRIPQER_OWNER_MEDIA_LIVE_UPLOAD_RUNTIME_VERIFIED_FROZEN`

---

## EXECUTIVE VERDICT

`LIVE_UPLOAD_VERIFIED`

A **real authenticated browser** (headless Chromium via Playwright, against the
live local dev server + the real Supabase project) selected a real local PNG,
uploaded it through the existing `avatars`/`banners` Storage authority, and
observed the returned **durable public URL** rendered in the premium onboarding
UI. The failure smoke confirmed an unsupported MIME is rejected truthfully with
no fake reference.

The previous `LIVE_FILE_UPLOAD_UNVERIFIED` blocker was caused by driving the
native file chooser (`fileChooser.setFiles(...)` → `Not allowed`). This task used
Playwright's `setInputFiles()` directly on the `<input type="file">`, which
bypasses the chooser dialog and is the supported headless path. No upload success
was mocked, no storage URL was injected, and the service-role key was never used.

---

## ENVIRONMENT (verified preconditions)

| Precondition | Evidence |
|---|---|
| Real authenticated browser session | Supabase `auth.getSession()` returned the QA session |
| Real owned profile | gate resolved profile `qa-dual-editor-test` (`8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165`) |
| Supabase available | real uploads returned 200 + public URLs |
| `avatars`/`banners` buckets | cover→`banners`, item→`avatars` |
| Real local QA file | `public/brand-assets/cripqer-mark.png` |

Dev server: `http://localhost:8080` (`vite dev`). Playwright `1.62.1` + installed
Chromium.

---

## RESULTS (Playwright, 4/4 passed)

### TEST 1 — Owner cover
Uploaded the cover slot and observed the durable reference:

```
https://mlinfiuhkxdhlveflbkj.supabase.co/storage/v1/object/public/banners/
  8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165/power-editor/cover-1789585206356-cripqer-mark.png
```

- bucket `banners` ✅; ownership path `{auth.uid()}/power-editor/...` ✅;
- not `blob:` / `data:` ✅; rendered as `<img src=...>` after `Imagen subida` ✅.

### TEST 3 — Product media (catalog item)
```
.../avatars/8b1f25ff-.../power-editor/item-1789585237136-cripqer-mark.png
```

### TEST 4 — Portfolio media
```
.../avatars/8b1f25ff-.../power-editor/item-1789585252540-cripqer-mark.png
```

### Failure smoke
`image/gif` rejected by MIME validation → `role="alert"` error shown, no
`Imagen subida`, no rendered `<img>`, no fake `OwnerMediaReference`.

---

## SECURITY VERIFICATION

| Requirement | Verified |
|---|---|
| Authenticated upload | userId derived from `auth.getSession()` server-side, never client-supplied |
| User-owned storage path | first path segment `8b1f25ff-...` = `auth.uid()` (Storage RLS) |
| No service-role exposed | browser uses anon key + user session; no `SUPABASE_SERVICE_ROLE_KEY` |
| No arbitrary foreign path | `removeOwnerMediaReference` rejects paths not under `{userId}/` |
| Existing MIME validation | jpeg/png/webp accepted; gif rejected |
| Existing size limits | 3 MB avatar/item, 4 MB cover (enforced in `owner-media-upload.ts`) |

---

## TEST-HARNESS FIXES (no app code changed)

The runtime verification required three test-only corrections to drive the real
UI (all in the new `e2e/owner-media-live-upload.spec.ts`, no production change):

1. **Stale login assertion** — the app now loads the Power Editor (`Guardar`/
   `Publicar`), not the basic editor (`Guardar borrador`); the spec waits for the
   current editor indicators instead.
2. **Category is a `role="radio"`** — `ChoiceGrid` renders `<button role="radio">`,
   so `getByRole("radio", …)` is used (not `button`).
3. **Generation Inspector FAB overlap** — the floating `Diagnóstico` button
   (`.gi-floating-btn`) intercepts the footer CTA on `/onboarding-test`; the spec
   hides it with an injected style tag so real clicks reach `Continuar`.

These are browser-automation selectors, not application behavior changes.

---

## GENERATION INSPECTOR

The upload path sets `media.preference = "own_media"` after a successful upload
(and the durable `OwnerMediaReference` reaches `OwnerContentInput.media.cover`).
Contextual media (`Unsplash`/`Pexels`) was **not** executed — no such call was
made anywhere in this run.

---

## VISUAL EVIDENCE

`cripqer-owner-media-live-upload/`

- `cover-uploaded.png` (210 KB)
- `product-uploaded.png` (193 KB)
- `portfolio-uploaded.png` (201 KB)

Each captures the premium onboarding card showing the uploaded thumbnail
(`Imagen subida`) with the durable public URL.

---

## FILES CHANGED (test-only)

- `e2e/owner-media-live-upload.spec.ts` (new — 4 runtime smoke tests)
- `e2e/playwright.owner-media.config.ts` (new — headless config, baseURL 8080)
- `cripqer-owner-media-live-upload/*.png` (visual evidence)
- `CRIPQER_OWNER_MEDIA_LIVE_UPLOAD_SMOKE_V1_REPORT.md` (this report)

No application/source code was modified. No `git add`/commit/push/reset/
restore/clean/checkout/stash/merge/rebase was performed.

---

## MANUAL QA (human fallback)

If browser automation is unavailable in another environment, run these steps
against `/onboarding-test` with a signed-in owned profile:

1. Complete the five onboarding steps up to **Imágenes**.
2. In the **Portada** card, choose a real JPG/PNG/WebP file (≤ 4 MB).
3. Confirm the UI shows **Subiendo imagen…** then **Imagen subida**, and a
   thumbnail appears whose URL begins
   `https://…supabase.co/storage/v1/object/public/banners/{yourUserId}/power-editor/`.
4. Repeat for a product (catalog) and a portfolio item (the thumbnail URL uses
   the `avatars` bucket and an `item-…` path).
5. Try a `.gif`: the UI must show an error and keep no thumbnail.

---

**SUCCESS GATE:** `CRIPQER_OWNER_MEDIA_LIVE_UPLOAD_RUNTIME_VERIFIED_FROZEN`
