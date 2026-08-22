# MOBILE EDITOR - FORENSIC INVESTIGATION ROOT CAUSES

**Date:** 2026-08-22  
**Severity:** P0 CRITICAL UX REGRESSION  
**Branch:** feat/editor-three-panel-restructure-09  
**Commit:** 2f3697d

---

## DEPLOYMENT VERIFICATION

### Branch Status:
- **Current Branch:** `feat/editor-three-panel-restructure-09`
- **HEAD Commit:** `2f3697d4061510ed739a6c0ea3cf58c7a42a998c`
- **Commit Message:** "se aplican ajustes mobiles ui ux 2026 cero friccion"
- **Remote Sync:** Up to date with origin

### Main Branch Status:
- **Main HEAD:** `b8c1998` ("se corrige qr cifrado de extremo a extremo con contraseña")
- **Mobile Features in Main:** ❌ NO (hooks no existen en main)
- **Mobile Features in Feature Branch:** ✅ YES

### Files Verified Present:
- ✅ `src/hooks/usePinchZoom.ts`
- ✅ `src/hooks/useTouchGesture.ts`
- ✅ `src/components/editor/FloatingContextToolbar.tsx`
- ✅ `src/components/editor/DraggableBottomSheet.tsx`
- ✅ `src/components/editor/UndoRedoFAB.tsx`

### Conclusion:
**User is testing the feature branch deployment.**  
All mobile code exists. Failures are implementation bugs, not missing code.

---

## ROOT CAUSE #1: PINCH ZOOM LAG

### Symptom:
Pinch zoom responde pero extremadamente lento. Usuario necesita 5-10 gestos repetidos para cambio apreciable.

### Root Cause Identified:

**File:** `src/routes/editor.tsx`  
**Line:** 1015

```tsx
// PROBLEMA CRÍTICO:
<div
  className="... transition-transform duration-300"  // ❌ 300ms CSS transition
  style={{
    transform: `scale(${zoomLevel})`  // ⚠️ Updated every pointermove
  }}
>
```

### Why This Causes the Issue:

1. **During pinch:**
   - `handlePointerMove` fires on every frame (~60 FPS)
   - `onZoomChange(scale)` called on every frame
   - `setZoomLevel(scale)` updates state on every frame
   - Canvas re-renders with new `transform: scale(${zoomLevel})`

2. **CSS Transition Active:**
   - `transition-transform duration-300` means 300ms interpolation
   - Each new scale value starts a NEW 300ms transition
   - Transform chases the target but is always 300ms behind
   - Fingers move, but canvas lags 300ms behind

3. **Accumulation Effect:**
   - Fast pinch = many rapid scale updates
   - Each starts a new 300ms transition
   - Previous transitions still running
   - Creates "sludgy" feel, requires many repeated gestures

### Expected Behavior:
- **During pinch:** NO CSS transition, immediate transform update
- **After pinch release:** Optional settling transition if desired

### Fix Required:
```tsx
// Option A: Remove transition entirely
className="... transform-gpu"  // No transition

// Option B: Conditional transition
className={`... ${isPinching ? '' : 'transition-transform duration-300'}`}
```

---

## ROOT CAUSE #2: BOTTOM NAVIGATION BROKEN

### Symptom:
Tap "Perfil", "Enlaces", "Apariencia" → no controles visibles  
Tap "QR" → funciona

### Root Cause Identified:

**File:** `src/routes/editor.tsx`  
**Lines:** 640-656, 1127

```typescript
// handleTabClick (línea 640)
const handleTabClick = (id: TabId) => {
  setActiveTab(id);
  setPanelOpen(true);
  setMobilePropertiesOpen(true);  // ❌ WRONG STATE
  setSelectedEditorTarget(/* ... */);
};

// DraggableBottomSheet (línea 1127)
<DraggableBottomSheet
  open={bottomSheetOpen}  // ❌ NEVER SET TO TRUE from tabs
  onOpenChange={setBottomSheetOpen}
>
```

### Why This Causes the Issue:

1. **State Disconnection:**
   - `handleTabClick` sets `mobilePropertiesOpen = true`
   - `DraggableBottomSheet` checks `bottomSheetOpen`
   - These are DIFFERENT state variables
   - Sheet never opens because `bottomSheetOpen` stays `false`

2. **Dead State Variable:**
   - `mobilePropertiesOpen` is updated but not used anywhere
   - Legacy from old implementation before DraggableBottomSheet

3. **Why QR Works:**
   - QR might have different rendering path
   - Or QR doesn't use the sheet

### Fix Required:
```typescript
const handleTabClick = (id: TabId) => {
  setActiveTab(id);
  setPanelOpen(true);
  setBottomSheetOpen(true);  // ✅ CORRECT STATE
  setSelectedEditorTarget(/* ... */);
};
```

---

## ROOT CAUSE #3: TOUCH SELECTION STATUS

### Investigation Results:

**Data Attributes Present:** ✅ YES

```tsx
// PublicProfileView.tsx
Line 665: data-editor-target="profile.photo"
Line 702: data-editor-target="profile.name"
Line 712: data-editor-target="profile.bio"
Line 804: data-editor-target={`link:${link.id}`}
```

### Potential Issues to Verify:

#### Issue 3A: Pointer Events Blocked
**Suspicion:** Parent elements might have `pointer-events-none`

**Need to verify:**
- Canvas wrapper elements
- Transform/scale container
- Overflow containers

#### Issue 3B: Gesture Detection Threshold
**Current threshold:** 10px movement, 300ms time

**Possible problem:**
- Real device touch might have micro-movements
- 10px might be too strict on high-DPI screens
- 300ms might be too short for real touch

#### Issue 3C: Touch-Action Conflict
**Current:** `touch-action: pan-y pinch-zoom` on canvas

**Possible problem:**
- Browser might handle touch before custom handler
- pointercancel might fire
- Native pinch might interfere with tap detection

### Investigation Needed:
- Console log when `handleTapOnElement` is called
- Console log `candidateTarget` in gesture handler
- Verify touch events reach body listener
- Check if `querySelector('[data-editor-target]')` finds elements

---

## ROOT CAUSE #4: FLOATING TOOLBAR STATUS

### Connection Verified:

```typescript
// FloatingContextToolbar renders when:
visible={showFloatingToolbar && !isDesktop}

// showFloatingToolbar set by:
handleTapOnElement → setShowFloatingToolbar(true)
```

### Dependency Chain:
```
User taps element
  ↓
useTouchGesture detects tap
  ↓
onTap(target) callback
  ↓
handleTapOnElement(target)
  ↓
setSelectedMobileTarget(target)
  ↓
setShowFloatingToolbar(true)
  ↓
FloatingContextToolbar visible={true}
```

### If toolbar doesn't appear:
**Root cause is in step 2-3** (gesture detection or tap callback)

Not a toolbar rendering issue, but a selection detection issue.

---

## ROOT CAUSE #5: ZOOM SCALE SYNCHRONIZATION

### Potential Issue Identified:

```typescript
// usePinchZoom maintains internal state:
pinchState.current.currentScale

// editor.tsx has separate state:
const [zoomLevel, setZoomLevel] = useState<number>(1);

// handleFit called during initialization:
const handleFit = () => {
  // ... calculates bestScale
  setZoomLevel(bestScale);  // ❌ Hook doesn't know about this
};
```

### Problem:
- `handleFit` can set `zoomLevel` to 0.5
- `usePinchZoom` still thinks `currentScale` is 1.0
- Next pinch calculates from wrong base

### Fix Required:
After `handleFit`, call hook's `setZoom(bestScale)` if exposed.

**VERIFICATION NEEDED:** Check if `setZoom` from hook is actually used.

---

## DUPLICATE SYSTEMS FOUND

### System 1: OLD (Pre-mobile implementation)
- `ContextualToolbar` (ContextWrapper)
- `ContextualPropertiesPanel`
- `panelOpen` state
- Click handlers on elements

### System 2: NEW (Mobile implementation)
- `useTouchGesture`
- `FloatingContextToolbar`
- `DraggableBottomSheet`
- `selectedMobileTarget` state
- `showFloatingToolbar` state
- `bottomSheetOpen` state
- `data-editor-target` attributes

### System 3: LEGACY MOBILE (Partial)
- `mobilePropertiesOpen` state (UNUSED)

### Problem:
Three overlapping systems cause confusion and broken connections.

### Required:
Consolidate or clearly separate desktop vs mobile flows.

---

## FILES RESPONSIBLE

| File | Issue | Lines |
|------|-------|-------|
| `src/routes/editor.tsx` | Pinch zoom transition | 1015 |
| `src/routes/editor.tsx` | Bottom nav wrong state | 640-656 |
| `src/routes/editor.tsx` | State variable unused | 174, 643 |
| `src/hooks/useTouchGesture.ts` | Potential threshold issue | 25, 30 |
| `src/hooks/usePinchZoom.ts` | Scale sync issue | 46, 167 |
| `src/components/editor/FloatingContextToolbar.tsx` | Depends on selection | All |
| `src/components/editor/DraggableBottomSheet.tsx` | Connection issue | All |

---

## SUMMARY OF ROOT CAUSES

### CRITICAL (P0):

1. **PINCH-01: CSS Transition Lag**
   - **Cause:** `transition-transform duration-300` active during pointermove
   - **Impact:** Canvas 300ms behind fingers, requires 5-10 gestures
   - **Fix:** Remove or conditionally disable transition during pinch
   - **Confidence:** 100% - Code inspection confirms

2. **BOTTOM-NAV-01: State Disconnection**
   - **Cause:** `handleTabClick` sets wrong state variable
   - **Impact:** Sheet never opens for Perfil/Enlaces/Apariencia
   - **Fix:** Change `setMobilePropertiesOpen` to `setBottomSheetOpen`
   - **Confidence:** 100% - Code inspection confirms

### HIGH (P1):

3. **TOUCH-SELECT-01: Gesture Detection Issues**
   - **Cause:** Likely pointer-events blocking or threshold too strict
   - **Impact:** Elements not selectable by tap
   - **Fix:** Debug gesture detection, adjust thresholds, check pointer-events
   - **Confidence:** 80% - Data attributes exist, likely event propagation issue

4. **ZOOM-SYNC-01: Scale Base Mismatch**
   - **Cause:** `handleFit` changes `zoomLevel` without updating hook internal state
   - **Impact:** Next pinch calculates from wrong base scale
   - **Fix:** Sync hook state after programmatic zoom changes
   - **Confidence:** 70% - Logical issue, needs runtime verification

---

## NEXT STEPS

### Phase 1: Fix Critical Blockers
1. Remove `transition-transform duration-300` from canvas
2. Change `setMobilePropertiesOpen(true)` to `setBottomSheetOpen(true)` in `handleTabClick`
3. Test navigation immediately

### Phase 2: Debug Touch Selection
1. Add console logs to `useTouchGesture`
2. Verify pointer events reach handler
3. Check `querySelector('[data-editor-target]')` success
4. Adjust thresholds if needed

### Phase 3: Fix Scale Sync
1. Expose `setZoom` from `usePinchZoom` if not already
2. Call hook's `setZoom` after `handleFit`
3. Verify pinch uses correct base scale

### Phase 4: Cleanup
1. Remove unused `mobilePropertiesOpen` state
2. Document desktop vs mobile paths
3. QA on real device

---

**Investigation Complete: ROOT CAUSES IDENTIFIED**  
**Ready to implement fixes.**
