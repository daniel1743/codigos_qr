# CRIPQER ENGINE V2 / V1 COMPATIBILITY BOUNDARY FIX V1

**Task ID:** `CRIPQER_ENGINE_V2_V1_COMPATIBILITY_BOUNDARY_FIX_V1`  
**Status:** `IMPLEMENTED — TARGETED VALIDATOR COMPATIBILITY FIX`  
**Source trace:** `CRPQ-BLACKBOX-DQNA`

## Root cause

The Smart Pages adapter carried `business.category = "beauty"`, but the legacy
V1 validator decided whether `business_other` was required by re-normalizing
only the free-form `business_type`. `Peluquería y belleza` is not an exact
legacy alias, so the valid explicit category was ignored and the payload was
rejected as `other`.

## Fix

- The V1 validator accepts the additive explicit `business_category` field when
  it belongs to the existing Engine vocabulary.
- Legacy payloads without that field retain their existing text-derived rules.
- Invalid explicit category values still fail validation precisely.
- `beauty` now reaches Engine normalization as `beauty`.

The Generation Inspector diagnostic boundary also records the exact legacy
payload, validator name and field issues when T7 rejects a payload. Secrets are
not included, and downstream unavailable stages are not classified as data loss
after an upstream failure.

No renderer, visual recipe, persistence, provider or legacy caller behavior was
otherwise changed.

## Verification

- Static root-cause audit: PASS.
- Legacy compatibility path: preserved.
- V2 `beauty` compatibility path: fixed by code path.
- Authenticated `/onboarding-test` → READY and avatar/cover proof: pending rerun.
