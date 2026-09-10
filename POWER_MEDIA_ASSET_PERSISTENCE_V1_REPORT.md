# POWER EDITOR AVATAR / BANNER ASSET PERSISTENCE V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_MEDIA_ASSET_PERSISTENCE_V1`

---

## ROOT_CAUSE (CONFIRMED)

Avatar/Banner uploads in the Power Editor persisted a **`blob:` object URL** into
the canonical config instead of a durable uploaded asset URL.

- The Inspector's `AssetField` (used for both `profile.avatarUrl` and
  `profile.banner.imageUrl`) uploads through `adapters.assets.upload(file)`.
- `PowerEditorHost` did **not** override `assets`, so it fell through to
  `defaultAdapters.assets` = `objectUrlAssetAdapter`
  (`src/premium-template-studio/adapters/index.ts`), whose `upload` returns
  `URL.createObjectURL(file)` — a `blob:` URL.
- The `blob:` URL was written to `profile.avatarUrl` / `profile.banner.imageUrl`
  and saved to the canonical `template_config` JSONB.
- A `blob:` URL is valid only for the current page session. After `Ctrl+R` the
  object URL is dead → `ERR_FILE_NOT_FOUND` for the blob UUID → broken avatar/banner.

## TRACE

### Avatar
1. file selection → `AssetField` input (`Inspector.tsx`, `accept="image/*"`).
2. `adapters.assets.upload(file)` → `objectUrlAssetAdapter` → `blob:` URL.
3. `onChange(asset.url)` → `patch("profile.avatarUrl", blobUrl)`.
4. canonical save → `template_config.editorConfig.profile.avatarUrl = "blob:…"`.
5. reload → `img src="blob:…"` → broken.

### Banner
Identical path: `patch("profile.banner.imageUrl", blobUrl)`.

## ANSWERS

- **What was saved in `profile.avatarUrl` / `profile.banner.imageUrl`:** a
  `blob:https://…/<uuid>` object URL (temporary, session-scoped).
- **Was the binary uploaded anywhere?** No — `objectUrlAssetAdapter` never
  uploads; it only creates a local object URL.
- **Existing durable upload authority:** Supabase Storage bucket `avatars`
  (`storage.buckets` row `avatars`, public), used by the Basic Editor
  (`ProfileSection.tsx`, `MyProfilePage.tsx`, `LinksSection.tsx`, `ShareSection.tsx`,
  `PremiumMediaLinkCard.tsx`) via
  `supabase.storage.from("avatars").upload(...)` + `.getPublicUrl(...)`.
- **Storage RLS:** `avatars` policies require
  `(storage.foldername(name))[1] = auth.uid()` for insert/update/delete, and
  public select — so a path under `${userId}/…` is the correct, allowed shape.

## FIX_APPLIED

`src/components/power-editor/PowerEditorHost.tsx` — inject a durable asset adapter
into the studio adapters:

- Added `createDurableAssetAdapter(supabase, userId)` which:
  - uploads the file to the existing `avatars` bucket at
    `${userId}/power-editor/${Date.now()}-<sanitized-name>.<ext>`;
  - returns `{ id: path, url: publicUrl, name, size, type }` (durable public URL);
  - supports `remove(id)` (derives the storage path from a public URL or a bare path).
- Wired it in: `assets: createDurableAssetAdapter(supabase, session.user.id)`.

This reuses the existing `avatars` bucket (no second storage system), leaves the
Save Coordinator, autosave debounce, revision and `documentId` protections
untouched, and preserves all visual config (Avatar Rim, avatar styling/shape/
alignment, cover full-bleed/blend/fade/focal/blur/overlay) — only the asset
reference becomes durable.

## EXPECTED_CONTRACT (now satisfied)

```
select image → local preview (optional) → upload to avatars bucket
→ get durable public URL → update canonical config with public URL
→ save canonical document → Ctrl+R → same image loads
```

## FILES_MODIFIED

- `src/components/power-editor/PowerEditorHost.tsx`

## DATABASE_CHANGE_REQUIRED

None — the `avatars` bucket and its RLS policies already exist.

## RUNTIME_GATE

Not yet verified in a live browser (requires user runtime confirmation):

- ASSET_01/02 — Upload Avatar/Banner → image appears, canonical `avatarUrl` /
  `banner.imageUrl` becomes a durable `https://…/storage/v1/object/public/avatars/…` URL.
- ASSET_03 — Save → no upload/persistence errors.
- ASSET_04 — Ctrl+R → avatar + banner remain visible, no `ERR_FILE_NOT_FOUND`.
- ASSET_05 — Close/reopen → avatar + banner remain.
