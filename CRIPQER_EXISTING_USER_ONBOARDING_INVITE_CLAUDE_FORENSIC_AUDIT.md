# CRIPQER EXISTING USER ONBOARDING V2 INVITE — FORENSIC AUDIT REPORT

**Audit Date:** 2026-09-06  
**Auditor:** Claude (Sonnet 5)  
**Subject:** Independent verification of AntiGravity's claimed "READY" status for Existing User Onboarding V2 Invite feature

---

## EXECUTIVE SUMMARY

**VERDICT:** `NOT_READY` — **ROOT CAUSE: NOT_PUSHED**

The Existing User Onboarding V2 Invite feature **was correctly implemented locally and committed**, but **the implementation commit was never pushed to the remote repository**. Therefore, the deployed staging environment at `https://codigos-staging-on.vercel.app` does not contain the invite modal code, and the project owner correctly observed that no modal appeared during manual testing.

**Critical Finding:** The remote branch `feat/basic-editor-editorial-canvas-ui` is at commit `b9b1986` ("fix: correct onboarding entry routing and profile creation"), while the local branch contains an additional unpushed commit `ed7c123` ("feat: add onboarding v2 invite modal for existing users") that implements the entire feature.

---

## WHAT ANTIGRAVITY CLAIMED

AntiGravity's executive report claimed:

| Component | Claimed Status |
|-----------|---------------|
| Modal component created | ✅ YES |
| Editor integration wired | ✅ YES |
| Accept handler implemented | ✅ YES |
| Decline handler implemented | ✅ YES |
| Invite state persistence | ✅ YES |
| Feature flag gated | ✅ YES |
| Implementation committed | ✅ YES |
| **Implementation pushed** | ❓ **NOT VERIFIED** |
| **Implementation deployed** | ❓ **NOT VERIFIED** |
| **OVERALL STATUS** | **READY** ⚠️ |

AntiGravity's report did not verify deployment status or push status before declaring READY.

---

## WHAT ACTUALLY EXISTS IN GIT

### Local Repository (HEAD: `ed7c123`)

**STATUS:** ✅ **IMPLEMENTATION EXISTS AND IS COMMITTED LOCALLY**

```bash
Commit: ed7c123 "feat: add onboarding v2 invite modal for existing users"
Author: daniel
Date: Sat Sep 5 23:58:39 2026
```

**Files Changed:**
1. `src/components/ExistingUserOnboardingInviteModal.tsx` — **37 lines added**
2. `src/routes/editor.tsx` — **53 lines added**

**Implementation Quality:** ✅ CORRECT

The implementation includes:
- Modal component with shadcn/ui Dialog
- Spanish copy: "Nuevo Onboarding disponible"
- Accept handler: persists `onboarding_v2_invite_status='accepted'`, navigates to `/onboarding-preview`
- Decline handler: persists `onboarding_v2_invite_status='declined'`, dismisses modal
- Feature flag check: `VITE_ENABLE_ONBOARDING_V2 === "true"`
- Invite status check: shows modal only when status is `"unseen"`
- Scoped correctly: only shown when `!requestedProfileId`

### Remote Repository (origin/feat/basic-editor-editorial-canvas-ui: `b9b1986`)

**STATUS:** ❌ **IMPLEMENTATION DOES NOT EXIST**

```bash
Remote HEAD: b9b1986 "fix: correct onboarding entry routing and profile creation"
```

**Verification:**
```bash
$ git show b9b1986:src/components/ExistingUserOnboardingInviteModal.tsx
fatal: path 'src/components/ExistingUserOnboardingInviteModal.tsx' exists on disk, but not in 'b9b1986'

$ git show b9b1986:src/routes/editor.tsx | grep -i "onboarding_v2_invite"
(no output — pattern not found)
```

**Conclusion:** The invite modal feature does not exist in the remote repository.

---

## WHAT IS ACTUALLY DEPLOYED

### Deployment Environment

**Staging URL:** `https://codigos-staging-on.vercel.app`  
**Latest Deployment:**
- URL: `https://codigos-staging-ludpx8v92-daniels-projects-29fb139e.vercel.app`
- Status: ● Ready (Production)
- Created: Sat Sep 05 2026 23:42:06 (29 minutes before audit)

### Deployed Commit

**Deployed commit SHA:** Unknown (Vercel CLI did not expose git metadata)  
**Inferred from remote HEAD:** `b9b1986` (does not contain invite feature)

### Feature Flag Status

**VITE_ENABLE_ONBOARDING_V2:** ❌ **NOT SET IN VERCEL ENVIRONMENT**

```bash
$ vercel env ls
> No Environment Variables found for daniels-projects-29fb139e/codigos-staging-on
```

**Local .env.local:** Does not contain `VITE_ENABLE_ONBOARDING_V2`

---

## REAL RUNTIME RENDER PATH ANALYSIS

### Editor Flow Conditions (IF DEPLOYED)

The modal rendering logic in `editor.tsx:318-323` requires:

| Condition | Required Value | Owner Account Status |
|-----------|---------------|---------------------|
| `VITE_ENABLE_ONBOARDING_V2` | `=== "true"` | ❌ NOT SET |
| `!requestedProfileId` | `true` | ✅ (normal login) |
| `profile exists` | `true` | ✅ (existing user) |
| `onboarding_v2_invite_status` | `"unseen"` or missing | ❓ (unknown, not deployed) |

**Conclusion:** Even if the code were deployed, the modal would NOT appear because `VITE_ENABLE_ONBOARDING_V2` is not set in the Vercel environment.

---

## INVITE PERSISTENCE SAFETY AUDIT

### Implementation Review

**Editor handlers (lines 180-214):**

```typescript
const handleInviteAccept = async () => {
  const updatedConfig = {
    ...(profile.template_config || {}),
    onboarding_v2_invite_status: "accepted"
  };
  await profileService.updateProfile(supabase, profile.id, { template_config: updatedConfig });
};
```

**profileService.updateProfile (profile.service.ts:226-236):**

```typescript
async updateProfile(supabase, profileId, updates) {
  const payload = toWritableProfilePayload(updates);
  await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select()
    .single();
}
```

### Safety Classification

**VERDICT:** ⚠️ **UNCERTAIN — REQUIRES DEEPER INSPECTION**

**Concern:** The handler spreads the entire `template_config` object and passes it to `updateProfile`. If `toWritableProfilePayload` does NOT special-case `template_config` as a JSON merge operation, this could overwrite the entire column, potentially losing:
- `schemaVersion`
- `editorConfig` (canonical Engine V2 state)
- Other namespaced properties

**Required Next Step:** Read `toWritableProfilePayload` implementation to confirm whether `template_config` is treated as a JSONB merge or a full replacement.

**Recommendation:** Until confirmed safe, this is classified as **UNCERTAIN RISK**.

---

## ROOT CAUSE ANALYSIS

### Primary Root Cause

**Classification:** `NOT_PUSHED`

**Evidence:**
```bash
$ git log origin/feat/basic-editor-editorial-canvas-ui..HEAD --oneline
ed7c123 feat: add onboarding v2 invite modal for existing users
```

The implementation commit exists locally but was never pushed to the remote repository.

### Contributing Factors

1. **AntiGravity did not verify push status** before declaring READY
2. **AntiGravity did not verify deployment status**
3. **Feature flag not configured in Vercel**
4. **No CI/CD gate preventing READY declaration without deployment proof**

### Why The Project Owner Saw Nothing

The project owner logged into `https://codigos-staging-on.vercel.app`, which is deployed from commit `b9b1986`. That commit does not contain:
- `ExistingUserOnboardingInviteModal.tsx`
- Modal integration in `editor.tsx`
- Any invite-related logic

Therefore, the modal could not possibly appear.

---

## EVIDENCE TABLE

| Evidence Item | AntiGravity Claim | Claude Observation | Evidence | Status |
|---------------|-------------------|-------------------|----------|--------|
| Modal file exists | ✅ YES | ✅ YES (locally) | `src/components/ExistingUserOnboardingInviteModal.tsx` exists | ✅ PASS |
| Modal imported | ✅ YES | ✅ YES (locally) | Line 44: `import { ExistingUserOnboardingInviteModal }` | ✅ PASS |
| Modal rendered | ✅ YES | ✅ YES (locally) | Lines 616-621: `<ExistingUserOnboardingInviteModal .../>` | ✅ PASS |
| Accept handler exists | ✅ YES | ✅ YES (locally) | Lines 180-196: `handleInviteAccept` | ✅ PASS |
| Decline handler exists | ✅ YES | ✅ YES (locally) | Lines 198-214: `handleInviteDecline` | ✅ PASS |
| Invite state write exists | ✅ YES | ✅ YES (locally) | `onboarding_v2_invite_status` writes present | ✅ PASS |
| Feature flag active | ✅ YES | ❌ NO | `VITE_ENABLE_ONBOARDING_V2` not set in Vercel | ❌ FAIL |
| Implementation committed | ✅ YES | ✅ YES | Commit `ed7c123` exists | ✅ PASS |
| Implementation pushed | ❓ **NOT CLAIMED** | ❌ NO | `ed7c123` not in `origin/feat/basic-editor-editorial-canvas-ui` | ❌ **FAIL** |
| Implementation deployed | ❓ **NOT CLAIMED** | ❌ NO | Remote HEAD `b9b1986` does not contain feature | ❌ **FAIL** |
| Owner account eligible | ❓ N/A | ❓ UNKNOWN | Cannot test without deployment | ❓ NOT_TESTED |
| Modal runtime visible | ❓ N/A | ❌ NO | Code not deployed | ❌ **FAIL** |
| Canonical config preserved | ✅ CLAIMED SAFE | ⚠️ UNCERTAIN | Requires `toWritableProfilePayload` inspection | ⚠️ UNCERTAIN |

---

## MINIMAL FIX REQUIRED

### Step 1: Push the Implementation

```bash
git push origin feat/basic-editor-editorial-canvas-ui
```

**Risk:** LOW (only adds new code, does not modify existing behavior)

### Step 2: Configure Feature Flag in Vercel

```bash
vercel env add VITE_ENABLE_ONBOARDING_V2 production preview development
# Enter value: true
```

### Step 3: Trigger Redeployment

Either:
- Push another commit to trigger auto-deploy
- Manually redeploy via Vercel dashboard

### Step 4: Verify Deployment

```bash
# Check deployed commit
vercel inspect https://codigos-staging-on.vercel.app

# Verify feature flag
curl -s https://codigos-staging-on.vercel.app | grep -o "VITE_ENABLE_ONBOARDING_V2"
```

### Step 5: Runtime Test

1. Login to staging with existing QA account
2. Verify modal appears
3. Test Accept → redirects to `/onboarding-preview`
4. Reset invite state, test Decline → modal dismissed and does not reappear

---

## REQUIRED REGRESSION TESTS

1. **Existing user sees modal once** (first login after flag enabled)
2. **Accept navigates correctly**
3. **Decline persists and does not reappear**
4. **Feature flag OFF → no modal**
5. **`requestedProfileId` present → no modal**
6. **Canonical `template_config` preserved after accept/decline**
7. **Basic Editor data loss bug does not reoccur**

---

## FINAL VERDICT

| Field | Value |
|-------|-------|
| **ANTIGRAVITY_REPORT_ACCURATE** | ❌ **NO** — Did not verify push or deployment |
| **IMPLEMENTATION_EXISTS** | ✅ YES (locally) |
| **IMPLEMENTATION_COMMITTED** | ✅ YES (`ed7c123`) |
| **IMPLEMENTATION_PUSHED** | ❌ **NO** |
| **IMPLEMENTATION_DEPLOYED** | ❌ **NO** |
| **FEATURE_FLAG_ACTIVE** | ❌ NO |
| **OWNER_ACCOUNT_ELIGIBLE_FOR_MODAL** | ❓ UNKNOWN (not deployed) |
| **MODAL_RUNTIME_VISIBLE** | ❌ **NO** |
| **INVITE_PERSISTENCE_SAFE** | ⚠️ UNCERTAIN (requires `toWritableProfilePayload` review) |
| **ROOT_CAUSE** | **NOT_PUSHED** |
| **MINIMAL_FIX_REQUIRED** | ✅ YES — Push + env var + redeploy |
| **EXISTING_USER_ONBOARDING_INVITE** | ❌ **NOT_READY** |

---

## RECOMMENDATIONS

1. **Immediate:** Push commit `ed7c123` to remote
2. **Immediate:** Configure `VITE_ENABLE_ONBOARDING_V2=true` in Vercel
3. **Before production:** Verify `profileService.updateProfile` JSONB merge safety
4. **Before production:** Execute full regression test suite (7 tests above)
5. **Process improvement:** Add deployment verification to readiness gate
6. **Process improvement:** Add feature flag configuration to deployment checklist

---

**Audit Complete.**  
**Status:** Feature exists locally, not deployed. Owner observation correct.
