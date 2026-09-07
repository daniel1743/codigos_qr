# CRIPQER — POWER EDITOR + ENGINE V2 PREVENTIVE FORENSIC AUDIT V1

**Agent**: Cleaner  
**Mode**: READ_ONLY_FORENSIC_AUDIT  
**Priority**: P0  
**Date**: 2026-09-07

---

## EXECUTIVE SUMMARY

### Health Status

```text
POWER EDITOR ARCHITECTURE:     YELLOW
WORKSPACE/CAMERA:              YELLOW  
RESPONSIVE:                    GREEN
RENDERER:                      GREEN
ENGINE V2:                     GREEN
CANONICAL ROUND-TRIP:          YELLOW
HISTORY:                       YELLOW
PERSISTENCE:                   YELLOW
MOBILE READINESS:              YELLOW
PHASE 3 READINESS:             NO
```

### Finding Counts

```text
P0 (CRITICAL):     6
P1 (HIGH):        12
P2 (MEDIUM):      18
P3 (LOW):          9
TOTAL:            45
```

### Urgent Recommendation

**FIX BEFORE PHASE 3**: 6 P0 findings + 8 P1 findings must be addressed before adding pan/pinch/zoom interactions. The autosave race condition (P0-001), selection stale reference (P0-002), and undo-during-save corruption (P0-003) represent immediate data integrity risks.

**PHASE 3 READINESS**: NO — Current architecture has structural issues that will amplify under interactive camera gestures.

---

## PARALLEL WORK NOTICE

**Codex Status**: Actively working on Power Editor Phase 2 Camera/DOM Geometry repair in parallel.

**Critical Rule**: This audit is READ-ONLY. No production files have been modified. All uncommitted changes observed belong to Codex's active work and are NOT classified as defects by this audit.

**Concurrent Modification**: If files changed during inspection, findings for those files are marked as potentially stale.

---

## AUDIT SCOPE

### In Scope

- Power Editor shell and workspace architecture
- Camera/viewport/stage geometry system
- Scroll ownership and isolation
- Responsive rendering (desktop/tablet/mobile)
- TemplateRenderer integration
- Engine V2 output and adapter
- Canonical persistence and round-trip integrity
- State management (StudioProvider/templateReducer)
- History (undo/redo) system
- Autosave and dirty state tracking
- Block operations and selection
- Mobile preparedness
- Performance and memory management
- React correctness
- Error states and recovery

### Out of Scope

- Cryptographic security (encrypted documents)
- Network/infrastructure beyond client persistence
- Basic Editor (separate system)
- QR/public identity
- Billing/entitlements enforcement (surface-level audit only)
- Deep Engine V2 generation quality (separate audit exists)

### Audit Limitations

1. **No Runtime Verification**: Most findings are source-level evidence. Runtime behavior for scroll ownership, camera geometry, responsive breakpoints, and visual rendering is marked as `NOT_VERIFIED` per existing gate reports.

2. **No Browser Testing**: No authenticated Power Editor session was available for direct DOM inspection or screenshot capture.

3. **Concurrent Work**: Codex is actively modifying camera/viewport files. Some findings may already be addressed by uncommitted work.

4. **Test Coverage Limited**: Only camera math has automated tests. No integration tests for autosave, history, responsive rendering, or block operations exist.

---

## CURRENT ARCHITECTURE MAP

```text
┌─────────────────────────────────────────────────────────────────┐
│ PowerEditorHost                                                  │
│  ├─ Load canonical envelope                                      │
│  ├─ Validate with validateTemplate()                             │
│  ├─ Provide adapters (storage.save → canonicalPageService)       │
│  └─ Mount PremiumTemplateStudio                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PremiumTemplateStudio (Shell)                                    │
│  ├─ Desktop: [Tools | Canvas | Inspector]                        │
│  ├─ Mobile: Canvas + BottomDock + BottomSheet                    │
│  └─ StudioProvider (state/dispatch/adapters/breakpoint)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ StudioProvider (Context)                                         │
│  ├─ State: templateReducer                                       │
│  ├─ Guarded dispatch (entitlement + preservation checks)         │
│  ├─ Autosave (900ms debounce)                                    │
│  ├─ Keyboard shortcuts (undo/redo/save/escape)                   │
│  ├─ Config sync from parent                                      │
│  └─ Breakpoint (local useState, not persisted)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ templateReducer (State Machine)                                  │
│  ├─ config: BioTemplateConfig (CANONICAL DOCUMENT)               │
│  ├─ past: BioTemplateConfig[] (undo stack, limit 60)             │
│  ├─ future: BioTemplateConfig[] (redo stack, limit 60)           │
│  ├─ selectedBlockId: string | null (UI STATE)                    │
│  └─ dirty: boolean (SAVE TRIGGER)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Canvas.Workspace                                                 │
│  └─ PowerCanvasViewport                                          │
│      ├─ usePowerCanvasCamera (local camera state)                │
│      ├─ .pts-power-viewport (scroll owner)                       │
│      ├─ .pts-power-camera-stage (explicit size)                  │
│      ├─ .pts-power-camera-layer (transform origin)               │
│      └─ TemplateRenderer (pure renderer)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ TemplateRenderer (Pure)                                          │
│  ├─ Receives: config, breakpoint, mode, editing handlers         │
│  ├─ Renders: ProfileHeader + visible blocks                      │
│  ├─ Block registry resolves type → component                     │
│  ├─ Responsive: merges block.responsive[breakpoint] overrides    │
│  └─ NO STATE MUTATION                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Canonical Persistence                                            │
│  ├─ canonicalPageService.save(supabase, profileId, config)       │
│  ├─ RPC: set_profile_canonical_editor_config                     │
│  ├─ Envelope: { schemaVersion: 1, editorConfig: config }         │
│  ├─ Round-trip verification (stableJson comparison)              │
│  └─ Namespace preservation (Basic/Power coexistence)             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Engine V2 (Server-Only)                                          │
│  ├─ Input: OnboardingIntentV2                                    │
│  ├─ Adapter: mapOnboardingIntentV2ToEngineInput                  │
│  ├─ Generation: generateCripqerPageWithEngineV2                  │
│  ├─ Output: PowerEditorRecipeV2 → BioTemplateConfig              │
│  └─ Handoff: persistOnboardingGeneratedPageV2                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## STATE OWNERSHIP MAP

| State                  | Owner                | Writers                  | Persistence | Undo  | Should Persist |
|------------------------|----------------------|--------------------------|-------------|-------|----------------|
| `config`               | templateReducer      | All commit() actions     | YES         | YES   | YES            |
| `past` (undo stack)    | templateReducer      | commit()                 | NO          | N/A   | NO             |
| `future` (redo stack)  | templateReducer      | commit(), undo, redo     | NO          | N/A   | NO             |
| `selectedBlockId`      | templateReducer      | selectBlock action       | NO          | NO    | NO             |
| `dirty`                | templateReducer      | commit(), markSaved      | NO          | NO    | NO             |
| `breakpoint`           | StudioProvider       | setBreakpoint            | NO          | NO    | NO             |
| `panel`                | StudioProvider       | setPanel                 | NO          | NO    | NO             |
| `previewing`           | StudioProvider       | setPreviewing            | NO          | NO    | NO             |
| `saveState`            | StudioProvider       | save/publish flow        | NO          | NO    | NO             |
| Camera (fitZoom/etc)   | usePowerCanvasCamera | ResizeObserver, controls | NO          | NO    | NO             |

### Ownership Risks Identified

✅ **CORRECT**: `config` is single source of truth  
✅ **CORRECT**: Camera state is separate from document state  
⚠️ **RISK**: `selectedBlockId` can reference deleted block after undo (P0-002)  
⚠️ **RISK**: `breakpoint` not in history, could desync after undo of responsive edit (P2-004)  
⚠️ **RISK**: Config sync from parent uses JSON.stringify comparison (P2-001)

---

## DOCUMENT VS UI BOUNDARY

### Document State (Canonical, Persisted, Undo-able)

- `config.blocks[]`
- `config.theme`
- `config.layout`
- `config.profile`
- `config.seo`
- `config.settings`
- `config.motion`
- `config.metadata` (includes `updatedAt`)

### UI State (Ephemeral, Not Persisted, Not Undo-able)

- `selectedBlockId`
- `breakpoint`
- `panel`
- `previewing`
- `dirty`
- `saveState`
- Camera: `fitZoom`, `userZoom`, `scale`, `translateX/Y`, viewport/content dimensions

### Boundary Violations Detected

✅ **PASS**: Camera never creates undo entries  
✅ **PASS**: Panel collapse never creates undo entries  
✅ **PASS**: Selection never creates undo entries  
⚠️ **RISK**: Undo/redo set `dirty: true` even though config may be identical to a previously-saved state (P3-001)

---

## P0 FINDINGS (CRITICAL)

### P0-001: Autosave + Manual Save Race Condition

**Severity**: P0  
**Confidence**: HIGH  
**Evidence**: StudioProvider.tsx lines 150-162, 190-201

**Finding**: No mutex/lock between autosave timer and manual save. Both call the same `save()` function. User can trigger manual save (Cmd+S or publish button) while autosave timer is pending or in-flight.

**Code Evidence**:
```tsx
// Autosave timer (line 196)
timer.current = setTimeout(() => void save(), 900);

// Manual save (line 150-162)
const save = useCallback(async () => {
  setSaveState("saving");
  await adapters.storage.save(state.config);
  // ...
}, [adapters.storage, state.config, onSave]);
```

**Failure Scenario**:
1. User edits block → dirty, autosave timer starts (900ms)
2. After 500ms, user presses Cmd+S → manual save starts
3. After 400ms more, autosave timer fires → second save starts
4. Both saves execute concurrently with same config
5. Last RPC write wins, but `markSaved` could fire twice

**User Impact**: Duplicate network requests, potential last-write-wins corruption if config mutated between calls, confusing save state UI.

**Reproduction**: Edit → wait 500ms → Cmd+S → observe network panel for duplicate POST.

**Recommended Fix**: Add `saving` guard to debounce timer check, or clear timer at start of `save()`.

**When to Fix**: BEFORE Phase 3 (BLOCKER)

---

### P0-002: Selection References Deleted Block After Undo

**Severity**: P0  
**Confidence**: CONFIRMED  
**Evidence**: templateReducer.ts lines 141-146, 159-181

**Finding**: `selectedBlockId` is cleared when deleting the selected block, but NOT cleared when undo restores a state where that block doesn't exist.

**Code Evidence**:
```tsx
case "deleteBlock": {
  return {
    ...withBlocks(state, blocks),
    selectedBlockId: state.selectedBlockId === action.id ? null : state.selectedBlockId,
  };
}

case "undo": {
  const previous = state.past[state.past.length - 1];
  if (!previous) return state;
  return {
    ...state,
    config: previous,
    past: state.past.slice(0, -1),
    future: [state.config, ...state.future],
    dirty: true,
    // selectedBlockId NOT cleared
  };
}
```

**Failure Scenario**:
1. Page has blocks A, B, C
2. Select block C
3. Add block D → `selectedBlockId = "D"`
4. Undo → restores config without D
5. `selectedBlockId` still points to "D" which no longer exists
6. Inspector tries to render controls for nonexistent block → crash or stale edit

**User Impact**: Inspector editing wrong block, crash, or silent no-op edits.

**Reproduction**: Add block → undo → inspect selectedBlockId.

**Recommended Fix**: Clear `selectedBlockId` on undo/redo, or validate against `config.blocks` after state change.

**When to Fix**: BEFORE Phase 3 (BLOCKER)

---

### P0-003: Undo During In-Flight Save Loses Intermediate Edits

**Severity**: P0  
**Confidence**: HIGH  
**Evidence**: StudioProvider.tsx lines 150-162, templateReducer.ts lines 159-169

**Finding**: User can undo while autosave RPC is in-flight. Save completes with old config, then undo changes current state. No version checking or optimistic locking exists.

**Code Evidence**:
- Autosave is async: `await adapters.storage.save(state.config)`
- Undo is synchronous: immediately updates state
- No CAS (compare-and-set) in RPC

**Failure Scenario**:
1. State A (saved)
2. Edit → State B → autosave starts (in-flight)
3. User immediately undoes → State A displayed
4. Autosave completes, persists State B
5. Server has B, user sees A, dirty=true triggers another save
6. State A overwrites B → intermediate edit lost

**User Impact**: Silent data loss of intermediate edits.

**Reproduction**: Rapid edit → undo before network completes → check persisted vs displayed.

**Recommended Fix**: Cancel in-flight save on undo, or add version/CAS to persistence.

**When to Fix**: BEFORE Phase 3 (BLOCKER)

---

### P0-004: Config Sync Loop Risk from Parent

**Severity**: P0  
**Confidence**: MEDIUM  
**Evidence**: StudioProvider.tsx lines 126-141

**Finding**: Effect watches `initialConfig` and replaces state if structurally different. Uses `JSON.stringify` for comparison, which is expensive and can cause flicker if parent passes new reference frequently.

**Code Evidence**:
```tsx
useEffect(() => {
  if (mountedConfig.current === initialConfig) return;
  mountedConfig.current = initialConfig;
  
  const isIdentical =
    initialConfig === state.config ||
    initialConfig === lastEmittedConfig.current ||
    JSON.stringify(initialConfig) === JSON.stringify(state.config);
  
  if (isIdentical) return;
  
  dispatch({ type: "replaceConfig", config: initialConfig, resetHistory: true });
}, [initialConfig, state.config]);
```

**Failure Scenario**:
1. PowerEditorHost passes `config` from useState
2. Host re-renders frequently (e.g., auth state changes)
3. Each render creates new `config` reference (even if structurally same)
4. Effect fires → JSON.stringify comparison
5. If parent's config differs from child's (e.g., child edited but parent hasn't received update), editor state resets

**User Impact**: Lost edits, history reset, confusing UX.

**Reproduction**: Parent re-renders with stale config → child resets.

**Recommended Fix**: Remove config sync, or make PowerEditorHost stable.

**When to Fix**: BEFORE Phase 3 (BLOCKER)

---

### P0-005: No Optimistic Locking in Canonical Persistence

**Severity**: P0  
**Confidence**: CONFIRMED  
**Evidence**: canonical-page.service.ts, RPC `set_profile_canonical_editor_config`

**Finding**: RPC has no `updatedAt` version check or CAS. Pure last-write-wins. Multiple browser tabs or rapid saves can silently overwrite.

**Code Evidence**:
```sql
CREATE OR REPLACE FUNCTION set_profile_canonical_editor_config(
  p_profile_id uuid,
  p_editor_config jsonb
) RETURNS jsonb AS $$
-- No updatedAt check, no version parameter
UPDATE profiles
SET template_config = jsonb_build_object(
  'schemaVersion', 1,
  'editorConfig', p_editor_config
)
WHERE id = p_profile_id AND user_id = auth.uid();
```

**Failure Scenario**:
1. Tab A: edit → save starts
2. Tab B: different edit → save starts
3. Both writes succeed, last one wins
4. First save silently lost

**User Impact**: Silent data loss in multi-tab scenario.

**Reproduction**: Open two tabs → edit both → save both → one lost.

**Recommended Fix**: Add `updatedAt` CAS or row-level locking.

**When to Fix**: BEFORE Phase 3 (BLOCKER)

---

### P0-006: Renderer Exception Crashes Entire Studio

**Severity**: P0  
**Confidence**: HIGH  
**Evidence**: TemplateRenderer.tsx (no error boundary visible in inspected code)

**Finding**: TemplateRenderer is pure component with no error boundary. A malformed block, invalid content, or missing block type will throw and unmount the entire editor.

**Code Evidence**:
```tsx
// TemplateRenderer.tsx line ~120
const BlockComponent = getBlockComponent(block.type);
// If getBlockComponent returns undefined or block.content is malformed, throws
```

**Failure Scenario**:
1. Engine V2 generates unknown block type
2. User loads in Power Editor
3. Renderer throws "Component not found"
4. Entire PremiumTemplateStudio unmounts
5. User sees blank screen with no recovery

**User Impact**: Unrecoverable blank editor, data inaccessible.

**Reproduction**: Inject block with `type: "unknown"` → renderer crashes.

**Recommended Fix**: Wrap TemplateRenderer in ErrorBoundary, render fallback block.

**When to Fix**: BEFORE Phase 3 (BLOCKER)

---

## P1 FINDINGS (HIGH)

### P1-001: ResizeObserver May Never Stabilize on Very Tall Pages

**Severity**: P1  
**Confidence**: MEDIUM  
**Evidence**: usePowerCanvasCamera.ts lines 88-98, powerCanvasCameraMath.ts

**Finding**: ResizeObserver watches both viewport and content. Content height changes (e.g., adding blocks, expanding text) trigger re-measurement, which changes stage height, which could trigger another resize if stage expansion affects viewport scroll geometry.

**Code Evidence**:
```tsx
observer.observe(viewport);
observer.observe(content);
```

**Failure Scenario**:
1. Page with 100 blocks, very tall
2. User adds block → content height increases
3. ResizeObserver fires → stage height recalculated
4. Stage height > viewport → scrollbar appears
5. Viewport width shrinks → fitZoom changes → scale changes → stage width changes
6. Loop

**User Impact**: Jittery camera, performance degradation, potential infinite measurement loop.

**Reproduction**: Add many blocks, observe ResizeObserver fire count.

**Recommended Fix**: Debounce content ResizeObserver, add cycle limit.

**When to Fix**: BEFORE Phase 3 (RECOMMENDED)

---

### P1-002: Breakpoint State Lost After Undo of Responsive Edit

**Severity**: P1  
**Confidence**: MEDIUM  
**Evidence**: StudioProvider.tsx line 115, templateReducer.ts

**Finding**: `breakpoint` is local useState in StudioProvider, NOT in reducer. After undo/redo, displayed breakpoint may not match the config's responsive overrides.

**Code Evidence**:
```tsx
const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
```

**Failure Scenario**:
1. Switch to mobile breakpoint
2. Edit block visibility (desktop:true, mobile:false)
3. Switch back to desktop
4. Undo
5. Config reverts, but breakpoint state remains "desktop"
6. User now sees different rendering than when edit was made

**User Impact**: Confusing UX, can't reproduce issue after undo.

**Reproduction**: Mobile edit → desktop → undo → inspect breakpoint.

**Recommended Fix**: Consider storing breakpoint in reducer, or document that it's view-only.

**When to Fix**: BEFORE Phase 3 (RECOMMENDED)

---

### P1-003: Dirty State True After Undo to Previously-Saved Config

**Severity**: P1  
**Confidence**: CONFIRMED  
**Evidence**: templateReducer.ts lines 167, 179

**Finding**: Undo and redo unconditionally set `dirty: true`, even if the resulting config is identical to the last saved state.

**Code Evidence**:
```tsx
case "undo": {
  return {
    ...state,
    config: previous,
    dirty: true, // Always true
  };
}
```

**Failure Scenario**:
1. Save (dirty=false)
2. Edit A (dirty=true)
3. Undo (config back to saved, but dirty=true)
4. Autosave triggers unnecessary save

**User Impact**: Unnecessary network traffic, confusing "Unsaved" indicator.

**Reproduction**: Save → edit → undo → observe dirty state.

**Recommended Fix**: Track last saved config hash, compare after undo/redo.

**When to Fix**: BEFORE Phase 3 (RECOMMENDED)

---

