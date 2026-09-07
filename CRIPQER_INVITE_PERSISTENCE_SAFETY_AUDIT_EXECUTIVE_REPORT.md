# CRIPQER INVITE PERSISTENCE SAFETY AUDIT — EXECUTIVE REPORT

**Audit Date:** 2026-09-06  
**Auditor:** Claude (Sonnet 5)  
**Subject:** Pre-push/deploy safety audit of Existing User Onboarding V2 Invite persistence path (commit `ed7c123`)

---

## EXECUTIVE SUMMARY

**VERDICT:** ⛔ **UNSAFE — DO NOT PUSH/DEPLOY AS-IS**

**ROOT CAUSE:** `FULL_JSONB_COLUMN_REPLACEMENT`

The invite handlers in commit `ed7c123` use `profileService.updateProfile()` with a client-side spread of `template_config`. This performs a **full JSONB column replacement** via Supabase's standard `.update()` operation, which does NOT deep-merge JSONB fields.

**Critical Risk:** If the client's `profile.template_config` is stale, partial, or missing keys that exist server-side (e.g., a concurrent Power Editor save added `editorConfig`), the invite write will **overwrite the entire `template_config` column** and **erase canonical data**.

This is **exactly the same data-loss pattern** that Phase 6A fixed for Basic Editor saves.

---

## CURRENT INVITE WRITE PATH

### Implementation (editor.tsx:180-214)

```typescript
const handleInviteAccept = async () => {
  const updatedConfig = {
    ...(profile.template_config || {}),
    onboarding_v2_invite_status: "accepted"
  };
  await profileService.updateProfile(supabase, profile.id, { 
    template_config: updatedConfig 
  });
};
```

### profileService.updateProfile Behavior

**Source:** `src/services/profile.service.ts:226-241`

```typescript
async updateProfile(supabase, profileId, updates) {
  const payload = toWritableProfilePayload(updates);
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select()
    .single();
  return data;
}
```

**What `toWritableProfilePayload` does (lines 86-97):**
- Iterates through `PROFILE_WRITABLE_COLUMNS`
- If `template_config` is in `updates`, passes it through AS-IS
- Does NOT deep-merge JSONB
- Does NOT call any RPC

**What Supabase `.update()` does:**
- Sends: `UPDATE profiles SET template_config = $1 WHERE id = $2`
- PostgreSQL replaces the **entire JSONB column** with the new value
- Does NOT use `||` (JSONB merge operator)
- Does NOT preserve keys absent from the client payload

---

## CANONICAL ENVELOPE RISK ANALYSIS

### Test Case: Existing Profile with Power Editor State

**Before invite write:**
```json
{
  "schemaVersion": 1,
  "editorConfig": {
    "bio": {
      "sections": [...],
      "activities": [...],
      "theme": {...}
    }
  },
  "basic_link_presentations": {...},
  "professional_badge": true
}
```

**Client state loaded in editor.tsx (line 312-316):**
```typescript
const currentProfile = await profileService.getProfileByUserId(supabase, userId);
setProfile({
  ...DEFAULT_PROFILE,
  ...currentProfile,
  banner_fusion_strength: getSafeFusionStrength(currentProfile.banner_fusion_strength),
});
```

**What happens if user clicks Accept:**

1. Client spreads `profile.template_config`:
   ```javascript
   const updatedConfig = {
     ...(profile.template_config || {}),  // Whatever was in memory
     onboarding_v2_invite_status: "accepted"
   }
   ```

2. `updateProfile` sends full replacement:
   ```sql
   UPDATE profiles 
   SET template_config = '{"basic_link_presentations": {...}, "professional_badge": true, "onboarding_v2_invite_status": "accepted"}'
   WHERE id = $1
   ```

3. **Result:** `schemaVersion` and `editorConfig` are **ERASED** from the database.

### Stale State Risk

**Scenario:** User has two browser tabs open

1. **Tab 1:** Editor (loaded profile at T0)
2. **Tab 2:** Power Editor (saves new `editorConfig` at T1)
3. **Tab 1:** User clicks "Probar ahora" on invite modal (T2)

**Result:** Tab 1's stale `profile.template_config` (from T0, before Power save) overwrites Tab 2's fresh `editorConfig` (from T1).

---

## COMPARISON WITH SAFE RPC PATH

### How Basic Editor Safely Persists (Phase 6A Fix)

**Source:** `src/services/profile.service.ts:177-208`

```typescript
async updateBasicEditorProfile(supabase, profileId, updates) {
  const patch = createBasicEditorPatch(updates);
  
  if (updates.template_config) {
    return this.patchBasicEditorTemplateConfig(supabase, profileId, patch.templateConfig);
  }
  // ... only writes Basic-owned keys
}
```

**RPC:** `patch_profile_basic_template_config`  
**Source:** `supabase/migrations/20260903000000_add_canonical_page_patch_functions.sql:4-50`

```sql
UPDATE public.profiles
SET template_config = COALESCE(template_config, '{}'::jsonb) || p_patch
WHERE id = p_profile_id AND user_id = auth.uid()
```

**Key difference:** Uses `||` (JSONB merge operator), which:
- Preserves all existing keys
- Only overwrites keys present in `p_patch`
- Atomic server-side operation (no stale client state)

### Why Basic Editor Is Safe

1. `createBasicEditorPatch` extracts ONLY `basic_link_presentations` and `professional_badge`
2. RPC enforces whitelist: rejects patches with non-owned keys
3. `||` operator merges at top level, preserving `schemaVersion`, `editorConfig`, etc.

---

## INVITE STATUS OWNERSHIP CLASSIFICATION

**Question:** Is `onboarding_v2_invite_status` Basic-owned metadata?

**Analysis:**
- Invite modal appears in Basic Editor (editor.tsx)
- Invite status controls whether to show modal in Basic Editor
- Invite accept navigates to onboarding (creates new page via Engine V2)
- Invite status does NOT belong to Power Editor
- Invite status does NOT belong to canonical `editorConfig`

**Classification:** **BASIC-OWNED METADATA** (same tier as `professional_badge`)

**Implication:** It SHOULD be persisted through `patch_profile_basic_template_config`, not through generic `updateProfile`.

---

## PROOF OF UNSAFE BEHAVIOR

### Static Analysis Evidence

| Evidence | Status | Details |
|----------|--------|---------|
| `updateProfile` uses `.update()` | ✅ CONFIRMED | Line 232-236 |
| `.update()` replaces full JSONB column | ✅ CONFIRMED | Standard Supabase/PostgreSQL behavior |
| `toWritableProfilePayload` does NOT merge | ✅ CONFIRMED | Lines 86-97, passes value AS-IS |
| Client spreads in-memory `template_config` | ✅ CONFIRMED | Lines 183-186, 201-204 |
| No server-side merge operator used | ✅ CONFIRMED | No `\|\|` in updateProfile path |
| `schemaVersion` preservation NOT guaranteed | ⛔ **FAIL** | Will be erased if not in client state |
| `editorConfig` preservation NOT guaranteed | ⛔ **FAIL** | Will be erased if not in client state |

### Comparison with Phase 6A Data Loss

**Phase 6A Root Cause (Fixed):**
> "editor.tsx was correctly calling updateBasicEditorProfile, but... it left the envelope vulnerable... leading to situations where the DB was updated with missing properties."

**Current Invite Implementation:**
- Does NOT call `updateBasicEditorProfile`
- Does NOT route through `patchBasicEditorTemplateConfig`
- Uses raw `updateProfile` with client-side spread
- **IDENTICAL RISK PATTERN**

---

## RECOMMENDED SAFE WRITE PATH

### Option 1: Extend Basic Editor Patch (RECOMMENDED)

**Add to:** `src/lib/basic-editor-persistence/patch.ts`

```typescript
export const BASIC_EDITOR_TEMPLATE_CONFIG_KEYS = [
  "basic_link_presentations",
  "professional_badge",
  "onboarding_v2_invite_status",  // ADD THIS
] as const;

export interface BasicEditorTemplateConfigPatchV1 {
  basic_link_presentations?: Record<string, unknown>;
  professional_badge?: boolean;
  onboarding_v2_invite_status?: "unseen" | "accepted" | "declined";  // ADD THIS
}
```

**Update RPC whitelist:** `supabase/migrations/20260903000000_add_canonical_page_patch_functions.sql:23-25`

```sql
WHERE key_name NOT IN (
  'basic_link_presentations', 
  'professional_badge',
  'onboarding_v2_invite_status'  -- ADD THIS
)
```

**Update handlers:** `src/routes/editor.tsx:180-214`

```typescript
const handleInviteAccept = async () => {
  setIsProcessingInvite(true);
  try {
    const patch: BasicEditorTemplateConfigPatchV1 = {
      onboarding_v2_invite_status: "accepted"
    };
    await profileService.patchBasicEditorTemplateConfig(
      supabase, 
      profile.id as string, 
      patch
    );
    setShowInviteModal(false);
    navigate({ to: "/onboarding-preview" });
  } catch (e) {
    console.error(e);
    toast.error("Error al actualizar la invitación.");
  } finally {
    setIsProcessingInvite(false);
  }
};
```

**Why this is safe:**
- Uses existing Phase 6A-validated RPC
- Atomic server-side `||` merge
- Preserves ALL existing `template_config` keys
- No stale client state risk
- Whitelist enforcement prevents future mistakes

### Option 2: Dedicated Invite RPC (Over-engineered)

Create `patch_profile_onboarding_invite_status` RPC. NOT RECOMMENDED - unnecessary isolation for a single metadata flag.

---

## REQUIRED MIGRATION

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_onboarding_invite_to_basic_patch.sql`

```sql
-- Allow Basic Editor to persist onboarding invite status safely

CREATE OR REPLACE FUNCTION public.patch_profile_basic_template_config(
  p_profile_id UUID,
  p_patch JSONB
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  patched_profile public.profiles;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'Basic Editor patch must be a JSON object.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_patch) AS patch_keys(key_name)
    WHERE key_name NOT IN (
      'basic_link_presentations', 
      'professional_badge',
      'onboarding_v2_invite_status'
    )
  ) THEN
    RAISE EXCEPTION 'Basic Editor cannot patch non-owned template config keys.';
  END IF;

  IF p_patch ? 'professional_badge'
     AND jsonb_typeof(p_patch->'professional_badge') <> 'boolean' THEN
    RAISE EXCEPTION 'professional_badge must be boolean.';
  END IF;

  IF p_patch ? 'basic_link_presentations'
     AND jsonb_typeof(p_patch->'basic_link_presentations') <> 'object' THEN
    RAISE EXCEPTION 'basic_link_presentations must be an object.';
  END IF;

  IF p_patch ? 'onboarding_v2_invite_status'
     AND jsonb_typeof(p_patch->'onboarding_v2_invite_status') <> 'string' THEN
    RAISE EXCEPTION 'onboarding_v2_invite_status must be a string.';
  END IF;

  UPDATE public.profiles
  SET template_config = COALESCE(template_config, '{}'::jsonb) || p_patch
  WHERE id = p_profile_id
    AND user_id = auth.uid()
  RETURNING * INTO patched_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not owned by the current user.';
  END IF;

  RETURN patched_profile;
END;
$$;
```

---

## REGRESSION TESTS REQUIRED

**After implementing safe fix:**

1. ✅ Invite accept preserves `editorConfig`
2. ✅ Invite decline preserves `editorConfig`
3. ✅ Invite accept preserves `schemaVersion`
4. ✅ Concurrent Power save + invite write = both preserved
5. ✅ Phase 6 Dual Editor persistence still PASS
6. ✅ Onboarding V2 Phase 5 handoff still PASS
7. ✅ Build PASS
8. ✅ TypeScript PASS
9. ✅ ESLint PASS

**Test execution:**
```bash
npx playwright test e2e/dual-editor-persistence.spec.ts
npx playwright test e2e/onboarding-v2-phase5.spec.ts
npm run build
npm run typecheck
npm run lint
```

---

## EVIDENCE TABLE

| Evidence Item | Observed | Evidence | Status |
|---------------|----------|----------|--------|
| `updateProfile` replaces full `template_config` | YES | `supabase.from("profiles").update(payload)` | ⛔ **UNSAFE** |
| `toWritableProfilePayload` deep-merges JSONB | NO | Passes value AS-IS (lines 86-97) | ⛔ **UNSAFE** |
| `schemaVersion` preserved | NO | Not in client spread if missing | ⛔ **FAIL** |
| `editorConfig` preserved | NO | Not in client spread if missing | ⛔ **FAIL** |
| Basic namespaces preserved | CONDITIONAL | Only if in client memory | ⛔ **UNSAFE** |
| Unknown namespaces preserved | NO | Full column replacement | ⛔ **FAIL** |
| Accept changes only invite status | NO | Changes entire column | ⛔ **FAIL** |
| Decline changes only invite status | NO | Changes entire column | ⛔ **FAIL** |
| Concurrent newer canonical state preserved | NO | Stale client overwrites | ⛔ **FAIL** |
| Safe RPC available | YES | `patch_profile_basic_template_config` | ✅ AVAILABLE |

---

## FINAL VERDICT

| Field | Value |
|-------|-------|
| **UPDATE_PROFILE_TEMPLATE_CONFIG_BEHAVIOR** | `FULL_REPLACEMENT` |
| **INVITE_WRITE_SAFETY** | ⛔ **UNSAFE** |
| **CANONICAL_EDITORCONFIG_PRESERVED** | ⛔ **NO** |
| **STALE_STATE_OVERWRITE_RISK** | ⛔ **YES** |
| **SAFE_RPC_AVAILABLE** | ✅ YES (`patch_profile_basic_template_config`) |
| **CODE_CHANGE_REQUIRED_BEFORE_PUSH** | ⛔ **YES** |
| **SAFE_TO_PUSH_ED7C123** | ⛔ **NO** |
| **SAFE_TO_DEPLOY_STAGING** | ⛔ **NO** |
| **ROOT_RECOMMENDATION** | **FIX PERSISTENCE PATH BEFORE PUSH** |

---

## REQUIRED ACTIONS BEFORE PUSH/DEPLOY

### DO NOT:
- ❌ Push commit `ed7c123` as-is
- ❌ Deploy to staging
- ❌ Configure `VITE_ENABLE_ONBOARDING_V2` in Vercel
- ❌ Test with production/non-QA profiles

### DO:
1. ✅ Extend `BASIC_EDITOR_TEMPLATE_CONFIG_KEYS` to include `onboarding_v2_invite_status`
2. ✅ Update `BasicEditorTemplateConfigPatchV1` interface
3. ✅ Create migration to update RPC whitelist
4. ✅ Refactor invite handlers to use `patchBasicEditorTemplateConfig`
5. ✅ Run Phase 6 dual-editor regression test
6. ✅ Build + typecheck + lint
7. ✅ Create new commit with safe implementation
8. ✅ THEN push and deploy

---

## ESTIMATED FIX EFFORT

**Time:** 15-30 minutes  
**Risk:** LOW (reusing proven Phase 6A pattern)  
**Files to modify:** 3
- `src/lib/basic-editor-persistence/patch.ts` (3 lines)
- `src/routes/editor.tsx` (10 lines)
- `supabase/migrations/YYYYMMDDHHMMSS_*.sql` (new file, 60 lines)

**Alternative (if migration blocked):** Use SQL `jsonb_set` directly in editor.tsx, but this is less maintainable than extending the existing safe RPC.

---

**Audit Complete.**  
**Status:** Implementation exists but uses unsafe persistence path. Must fix before push/deploy.
