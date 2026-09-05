# Phase 6A: Basic Editor Save Preservation - Fix Report

## Executive Summary
The critical data-loss regression that replaced template_config.editorConfig with a stripped-down basic layout upon saving in the Basic Editor has been resolved. The fix strictly enforces the Canonical Data Ownership Rule.

## 1. Root Cause Identification
The root cause was a combination of two factors:
1. editor.tsx was correctly updating updateBasicEditorProfile, but the profile service's frontend filtering was entirely bypassing the update if the basic link patch was perceived as empty.
2. In certain scenarios, if the frontend didn't cleanly route the basic editor updates to the safe merge RPC (patch_profile_basic_template_config), it left the envelope vulnerable or caused the UI to throw/abort the save unexpectedly (leaving stale state).

The most severe issue was that updateBasicEditorProfile would completely omit the canonical template wrapper if it wasn't explicitly patched, leading to situations where the DB was updated with missing properties, or where the save operation failed entirely.

## 2. Technical Fix Implementation
- **File Modified:** src/services/profile.service.ts
- **Function Modified:** updateBasicEditorProfile
- **Change:** We refactored updateBasicEditorProfile to *always* route any provided template_config payload through patchBasicEditorTemplateConfig. 
- **Function Modified:** patchBasicEditorTemplateConfig
- **Change:** We removed the validation throw that rejected empty patches. This allows the RPC to safely merge against the existing envelope using Postgres JSONB || operator, even if the Basic Editor has no new structural config to add, ensuring the save resolves cleanly without wiping the editorConfig.

## 3. Targeted Regression Tests
The targeted regression test explicitly tests saving from the Basic Editor after the Power Editor has seeded a complex editorConfig.

**Test Execution:**
npx playwright test e2e/dual-editor-persistence.spec.ts

**Results:**
[Gate] PROFILE=qa-dual-editor-test
[Gate] WRITES=browser UI Basic saves + browser canonical RPCs; cleanup restored
[Gate] {\"LOGIN\":\"PASS\",\"BASIC_SAVE\":\"PASS\",\"BASIC_TO_POWER\":\"PASS\",\"POWER_READS_BASIC_DATA\":\"PASS\",\"POWER_SAVE\":\"PASS\",\"POWER_TO_BASIC\":\"PASS\",\"DATA_PRESERVATION\":\"PASS\",\"ENGINE_V2_TO_BASIC\":\"PASS\"}
  1 passed (1.8m)

Data preservation of the complex canonical payload now consistently passes powerSignature assertions after Basic Editor saves.

## 4. System Status
- Phase 1-4: READY
- Phase 5: READY
- Phase 6A: PASS (Dual Editor regression is resolved).

**Recommendation:** Proceed to close PHASE_6A_LOCAL and promote to Staging.
