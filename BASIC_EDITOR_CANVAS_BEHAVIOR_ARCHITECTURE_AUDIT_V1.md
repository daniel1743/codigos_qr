# CRIPQER — Basic Editor Canvas Behavior & Architecture Forensic Audit V1

> **Mode:** READ-ONLY / RUNTIME-FIRST / MINIMUM-CONTEXT. **Production files modified: 0.**
> The Basic Editor is treated as a *proven behavioral reference*. This audit reverse-engineers **why** its canvas interaction feels correct, without changing anything, for later reuse in the Power Editor viewport/camera.

---

## Executive Verdict

The Basic Editor's reported "correct" feel comes from a **deliberate separation of four independently-owned surfaces** plus a **real-dimension, pointer-anchored camera math model**:

1. **Canvas viewport** = one native `overflow-auto` scroll container with `touch-action: none` and `overscroll-contain`. It owns *native scroll* plus a *custom CSS-transform pan/zoom* that never writes document data.
2. **Tools panel** (desktop `aside`, mobile bottom sheet) = a **separate sibling** `overflow-y-auto` container — it never shares scroll state with the canvas.
3. **Zoom** = CSS `transform: scale()` with `transform-origin: top left`, anchored under the pointer/gesture focal point via explicit world-point compensation. Scale is bounded and derived from a `fitZoom` recomputed from **real measured template dimensions** (`ResizeObserver`).
4. **Selection** = one canonical `selectedTarget` id (host-owned), synchronized both ways through a **DOM registry** (`Map<targetId, HTMLElement>`) populated by renderer ref callbacks — not `querySelector` in the hot path, and not shared scroll state.

Stability sources: (a) `touch-action: none` applied *narrowly* to the canvas only; (b) `overscroll-contain` preventing scroll chaining; (c) pan bounds clamped against real content size; (d) viewport state (`zoom`/`translate`) fully separated from document state and from browser scroll position; (e) the mobile canvas height is **dynamically reduced** to leave room for the bottom sheet so the sheet never covers the selected element.

**Runtime status:** the `/editor` route requires an authenticated session; no session was available, so interaction behaviors are **SOURCE-TRACED** and every runtime-only check is marked **NOT_VERIFIED**. No credentials were fabricated; no user data was touched.

---

## Runtime Environment

| Item | Result |
|---|---|
| Dev server | Running at `http://localhost:8080` |
| `GET /editor` | Renders SSR loading ("Cargando…") then gates on auth (`loading → !session → Auth → canonical? PowerEditorHost : BasicEditorShell`) |
| Authenticated Basic Editor session | **Unavailable** (no QA credentials) |
| Canvas interactions (zoom/pan/pinch/selection/scroll) | **NOT_VERIFIED** — not fabricated |
| Conclusion | Source-led audit after runtime limitation |

---

## Current Basic Editor Architecture

Three layers:

1. **Host** — `src/routes/editor.tsx`: owns document data (`profile`, `links`), the canonical `selectedTarget`, `activeSection`, panel-open state, the `EditTargetRegistry` (`targetsRef: Map<targetId, HTMLElement>`), and `canvasViewportRef`. Renders `BasicEditorShell`.
2. **Shell** — `src/components/basic-editor-shell/BasicEditorShell.tsx`: owns the **camera** (`fitZoom`, `userZoom`, `translate`, `templateSize`, `viewportSize`, `isInteracting`) and the tool-panel scroll containers (`desktopToolsRef`, `mobileToolsRef`) + mobile sheet state.
3. **Renderer** — `src/components/basic-template/*`: family renderers wrap editable elements in `EditableTarget`, which registers DOM elements into the host registry.

The camera is **entirely local to `CanvasWorkspace`**; the host never reads/writes zoom/pan state. This is the single most important decision behind the editor's stability.

---

## Canvas DOM / Container Map

```
BasicEditorShell (root)
├── PlatformNavbar                        (sticky top, z-40) — app chrome
├── <main>
│   ├── <section> CanvasWorkspace         (relative, overflow-hidden)
│   │   │   desktop h-[calc(100dvh-9rem)]
│   │   │   mobile  h-[var(--mobile-canvas-height)]   ← shrinks with sheet
│   │   └── <div ref=viewportRef>         ★ CANVAS SCROLL CONTAINER
│   │         className: overflow-auto overscroll-contain select-none
│   │         style: touch-action: none   ★ touch owned by canvas only
│   │         handlers: pointerdown/move/up/cancel, clickCapture, wheel(ctrl)
│   │         └── <div> stage             (width/height = stageWidth/Height)
│   │               └── <div ref=templateRef>  ★ THE DOCUMENT
│   │                     absolute left/top = originX/originY
│   │                     transform: translate3d(tx,ty,0) scale(zoom)
│   │                     transform-origin: top left
│   │                     w-[360px] (lg 500px) min-h-[620px]
│   │                     └── {canvas} = BasicTemplateRenderer → EditableTarget*
│   │
│   └── <aside ref=desktopToolsRef>       ★ DESKTOP TOOLS SCROLL CONTAINER
│         className: overflow-y-auto (hidden below lg)
│         └── DesktopSectionNav + desktopPanel (data-tool-target controls)
│
└── (mobile) <section> bottom sheet       (fixed, bottom, max-h-[50dvh])
      └── <div ref=mobileToolsRef>        ★ MOBILE TOOLS SCROLL CONTAINER
            className: overflow-y-auto overscroll-contain
            └── mobilePanel (data-tool-target controls)
```

**Key facts:**
- **Viewport = scroll container = pointer/gesture owner** (`viewportRef`).
- **Document = `templateRef`** (a single absolutely-positioned, CSS-transformed element).
- `overflow` is owned by the viewport (`overflow-auto`); the workspace section is `overflow-hidden` to clip.
- `touch-action: none` is applied **only** to the viewport, not to the tools panels.
- Scale + pan are applied as a **single transform** on the template; the "stage" div carries explicit `stageWidth/stageHeight` so the transform does **not** collapse layout bounds.
- Clipping is prevented by `CANVAS_OVERSCAN = 48px` padding when scaled content exceeds the viewport.

## State Ownership Map

| State | Owner | Purpose |
|---|---|---|
| `profile`, `links` (document data) | `editor.tsx` | Domain data; saved via services |
| `selectedTarget` | `editor.tsx` | Canonical selected-element id (single source of truth) |
| `activeSection`, `isContextPanelOpen`, `isPreviewMode`, `isGalleryOpen` | `editor.tsx` | Tool routing / panels |
| `targetsRef: Map<targetId, HTMLElement>` | `editor.tsx` | id → live DOM element (from `EditableTarget` ref callbacks) |
| `fitZoom`, `userZoom`, `translate` | `CanvasWorkspace` (local) | Camera — never touches document |
| `templateSize`, `viewportSize` | `CanvasWorkspace` (local) | Measured geometry (ResizeObserver) |
| `isInteracting`, `panStart`, `pinchStart`, `activePointers` | `CanvasWorkspace` (refs) | Transient gesture state |
| Tools-panel scroll position | Browser (DOM) | Native `overflow-y-auto` scroll |
| Canvas scroll position | Browser (DOM) | Native viewport `overflow-auto` scroll |
| `mobileSheetState` | `BasicEditorShell` | Sheet height state |

**Critical:** document data, selection, camera, and both scroll positions are four independent owners.

---

## Event Ownership Map

| Event | Element | Handler | Effect | Document? | Canvas? | Tools? |
|---|---|---|---|---|---|---|
| `wheel` (plain) | viewport | browser default | native scroll | No | Yes | No |
| `wheel` + Ctrl/Cmd | viewport | `onWheel` (non-passive) | focal zoom | No | Yes | No |
| `pointerdown` (mouse bg) | viewport | `onPointerDown` | start pan (capture) | No | Yes | No |
| `pointerdown` (touch) | viewport | `onPointerDown` | track / pinch at 2 | No | Yes | No |
| `pointermove` | viewport | `onPointerMove` | pan (6px) / pinch | No | Yes | No |
| `pointerup`/`pointercancel` | viewport | `onPointerEnd` | end, release | No | No | No |
| `click` (editable target) | `EditableTarget` | `onClickCapture` → `registry.select` | select + center | No | Yes | Yes |
| `click` (after pan) | viewport | `onClickCapture` | swallow | No | No | No |
| `scroll` | tools/viewport | browser | independent | No | No | No |
| tool focus/click | tools panel | `onSelectTarget`/`onFocusTarget` | select | Yes (edit) | Yes | No |

**Key:** the canvas's custom handlers only mutate camera state; they never write document data. Only editable-target clicks route to `handleTargetSelect` (selection), not a direct data write.

---

## Zoom Behavior

**State:** `zoom = clamp(fitZoom * userZoom, minScale, maxScale)`.

- `fitZoom = clamp(min(availW/measuredW, availH/measuredH, 1), 0.35, 1)` — recomputed by `ResizeObserver`.
- `userZoom ∈ [0.6, 3]`; `minScale = max(0.35, fitZoom*0.6)`; `maxScale = max(minScale, fitZoom*3)`.
- Constants: `MIN_ZOOM=0.35`, `MIN_USER_ZOOM=0.6`, `MAX_USER_ZOOM=3`, `ZOOM_STEP=1.05`, `CANVAS_OVERSCAN=48`, `MIN_VISIBLE_CANVAS=48`, padding 40/88, `TEMPLATE_WIDTH=360`, `TEMPLATE_MIN_HEIGHT=620`.

**Anchor math (`applyZoomAt`):** `worldPoint = (focal − rect.topLeft)/currentScale`; `nextTranslate = currentTranslate + (currentOrigin − nextOrigin) + worldPoint*(currentScale − nextScale)`, then clamped. With `transformOrigin: "top left"` + absolute origin offset, the point under the cursor stays approximately anchored.

**Controls:** Minus/Plus (`ZOOM_STEP`), live `%` (`aria-live`), "Recentrar" reset (`userZoom=1`, `translate=0`, smooth-scroll top-left), Ctrl/Cmd+wheel (`exp(-deltaY*0.001)` focal), touch pinch (midpoint anchored).

**Why stable:** fixed top-left origin; pointer-anchored compensation; hard clamping; reset returns to a known baseline when `userZoom === 1`; stage layout size tracks scaled content so scrollbars stay valid.

---

## Pan Behavior

- `canvasNeedsPan()` = `userZoom > 1.01 || scaledWidth > vw || scaledHeight > vh`.
- Pan starts only when target is **not** `[data-edit-target], button, input, textarea, a`, and pan is needed.
- `pointerdown` → `setPointerCapture` → `pointermove` (6px threshold) → `setTranslate(clampTranslation(start + delta))`.
- Bounds: `getTranslationBounds` derives min/max from `scroll + MIN_VISIBLE_CANVAS(48) − origin − scaledSize`, so ≥48px of canvas always stays visible — nothing becomes unreachable.
- `suppressClick` swallows post-pan click; `pointerup`/`pointercancel` clear state + release capture.
- **Pan never writes document data** — only `translate`.

---

## Touch / Gesture Behavior

- **Pointer Events** (not legacy Touch Events) on the viewport.
- `touch-action: none` on the viewport (canvas) **only** — tools panels keep native touch scrolling.
- `activePointers: Map` tracks touch points.
- **Pinch:** 2 pointers → `pinchRatio = dist/startDist` → clamped scale with focal-midpoint + world-point anchored translate.
- **Pan:** single pointer, 6px threshold (tap-vs-drag).
- **Tap selection:** `onPointerDown` returns early on editable targets, so taps don't become pans.
- `pointercancel` → `onPointerEnd` cleanup; `resetGestureState` releases all captures on template change.
- **Key:** the editor *does not* own every gesture — it preserves native scroll as primary "pan" for non-overflowing short templates (`canvasNeedsPan()` false at fit), switching to custom transform pan/pinch only when content overflows or user zoom > 1.

## Selection Model

- Elements become selected via `EditableTarget` (canvas click / Enter / Space) or tool `onSelectTarget`/`onFocusTarget`.
- **One canonical state:** `selectedTarget` in `editor.tsx` — no duplicated selection state.
- **Stable IDs:** `EDIT_TARGETS` constants (`profile-avatar`, `profile-name`, `profile-bio`, `profile-footer`, `hero`, …) + `linkEditTarget/cardEditTarget/socialEditTarget`.
- **DOM lookup:** `targetsRef: Map<targetId, HTMLElement>` populated by `EditableTarget` ref callbacks — no `querySelector` in the hot path.
- **Visual state:** 2px outline when `active` + `role=button` + `tabIndex=0` + `aria-pressed`.
- **Survives zoom/pan** (id-based, camera independent).

---

## Tools → Canvas Auto-Focus Behavior

Both directions share `selectedTarget`:

1. `handleTargetSelect(targetId)` → `setSelectedTarget(targetId)` + set section + open panel.
2. `useEffect([selectedTarget])`: `target = targetsRef.get(id)` → `viewport.scrollTo({ top: scrollTop + targetRect.top − viewportRect.top − clientHeight/2 + targetRect.height/2, behavior: "smooth" })` → **vertically centers** the element.

**Direction coverage (verified):**
- **Canvas → centering:** full (any `EditableTarget` click).
- **Tools → centering:** **PARTIAL** — `LinksSection` wires `selectedTarget` + `onSelectTarget={handleTargetSelect}`; `ProfileSection`/`DesignSection` are rendered **without** selection callbacks in the Basic Editor route, so profile-field tools do not center the canvas element.
- **Template Lab** (`TemplateLabEditor.tsx`) wires `onFocusTarget` across all controls — a fuller bidirectional model not fully replicated in the Basic Editor route.

**Positioning:** vertical center; respects `prefers-reduced-motion`; custom offset `− clientHeight/2 + targetRect.height/2`.

---

## Canvas → Tools Synchronization

- Host computes `toolFocusTarget = getToolFocusTarget(selectedTarget, activeSection)` (returns target id, or `"button-style"` for `link-*` in appearance section).
- `BasicEditorShell` effect: `findTarget(container)` = `querySelectorAll("[data-tool-target]")` matching `dataset.toolTarget`; `target.scrollIntoView({ block: "center", behavior: smooth })`.
- Tool controls carry `data-tool-target={EDIT_TARGETS.*}` (ProfileSection/LinksSection/DesignSection).
- So selecting a canvas element scrolls the **tools panel** to the matching control, centered.

---

## Independent Scroll Architecture

- **Two sibling scroll containers, never nested:**
  - Canvas: `<div ref=viewportRef class="overflow-auto overscroll-contain select-none" style="touch-action:none">`.
  - Desktop tools: `<aside ref=desktopToolsRef class="overflow-y-auto">`.
  - Mobile tools: `<div ref=mobileToolsRef class="overflow-y-auto overscroll-contain">`.
- **`overscroll-contain`** prevents scroll chaining.
- **`touch-action: none`** only on the canvas → tools panel keeps native touch scroll.
- Desktop outer `lg:overflow-hidden`; mobile normal flow + bottom nav.
- **Result:** tool-panel scroll and canvas scroll/pan are fully independent (no shared state, no propagation).

---

## Responsive Behavior

- Desktop: canvas `h-[calc(100dvh-9rem)]`; tools `aside` beside it.
- Mobile: canvas height = `calc(100dvh − 3.5rem − 2rem − 78px − env(safe-area-inset-bottom) − sheetHeight)` — **dynamically shrinks so the sheet (max 48dvh) never covers the selected element**.
- Sheet states: `collapsed 18dvh / medium 34dvh / expanded 48dvh`.
- **Safe-area handled** via `env(safe-area-inset-bottom)` in canvas height, sheet offset, and root padding.
- `ResizeObserver` recalculates `fitZoom`/`viewportSize`; when `userZoom === 1`, resets translate + scroll top-left.
- Template `w-[360px]` → `lg:w-[500px]`.

---

## History vs Viewport State

- **No undo/redo** in the Basic Editor route.
- Camera state (`fitZoom`, `userZoom`, `translate`) is **local, resettable** state — never part of document history.
- Save is explicit (`onSaveDraft`/`onPublish`) with `beforeunload` guard; navigation does not mark document dirty.

---

## Real Content Measurement / Bounds

- `ResizeObserver` on workspace + template.
- `measuredW = max(360, scrollWidth, offsetWidth)`; `measuredH = max(620, scrollHeight, offsetHeight)`.
- `availableW = clientWidth − 40`; `availableH = clientHeight − 88`.
- `fitZoom = min(availW/measuredW, availH/measuredH, 1)` clamped to `[0.35, 1]`.
- Stage = scaled content + `CANVAS_OVERSCAN*2` when overflow; `originX/Y` centered when fits, else overscan.
- Pan bounds from real `scrollLeft/scrollTop` + `MIN_VISIBLE_CANVAS` − `origin` − `scaledSize` — always real dimensions.

---

## Performance / Perceived Quality

- **NOT_VERIFIED** (no runtime session).
- Static signals: transform-based (GPU-compositable, no reflow); `ResizeObserver`; `transition-transform` off during interaction; `motion-reduce` respected; memoized registry; `select-none`. No FPS/latency claimed.

---

## Behavioral Invariants (with code mechanism)

| Invariant | Exact mechanism |
|---|---|
| Tool scroll never drives canvas scroll | Sibling scroll containers + `overscroll-contain` |
| Canvas navigation never drives tool scroll | Sibling separation; no shared scroll state |
| Selecting a tool target makes canvas target reachable | `selectedTarget` → `viewport.scrollTo(...)` centers (links wired; profile fields not) |
| Zoom never changes document data | `applyZoomAt` only sets `userZoom`/`translate` |
| Pan never changes document data | `onPointerMove` only sets `translate` |
| Selection stable during navigation | id-based `selectedTarget`; camera independent |
| All content remains reachable | `MIN_VISIBLE_CANVAS` clamp + `CANVAS_OVERSCAN` stage |
| Long templates not clipped | `scrollHeight`-based fit + overscan stage |
| Navigation independent from document | camera is local `CanvasWorkspace` state |

## Reusable Architecture Patterns (for Power Editor evaluation)

| Pattern | Classification | Notes |
|---|---|---|
| Separate scroll containers (canvas vs tools) + `overscroll-contain` | DIRECTLY_REUSABLE | Most important scroll-isolation decision |
| `touch-action: none` scoped narrowly to canvas only | DIRECTLY_REUSABLE | Keeps native touch scroll on tools |
| Pointer-Events gesture state (single pointer map, pinch/pan one handler) | DIRECTLY_REUSABLE | Avoids Touch Events pitfalls |
| `fitZoom × userZoom` decomposition + scale clamping | DIRECTLY_REUSABLE | Clean "auto-fit" vs "user intent" |
| Pointer-anchored zoom (world-point compensation, `transform-origin: top left`) | DIRECTLY_REUSABLE | The anchor math preventing "jump" |
| Real-dimension measurement via `ResizeObserver` + `scrollWidth/Height` | DIRECTLY_REUSABLE | Bounds match real content |
| Stage element carrying scaled size (overscan) so transform doesn't collapse layout | DIRECTLY_REUSABLE | Keeps scrollbars valid under transform |
| Pan bounds clamped to `MIN_VISIBLE_CANVAS` floor | DIRECTLY_REUSABLE | Guarantees reachability |
| Canonical `selectedTarget` id via `Map<id, HTMLElement>` registry (ref callbacks) | CONCEPTUALLY_REUSABLE | Power: block ids + registry |
| `scrollIntoView`/`scrollTo(center)` for tool↔canvas focus, honoring reduced-motion | CONCEPTUALLY_REUSABLE | Simple, native |
| Camera state local, separate from document/history | DIRECTLY_REUSABLE | Core stability principle |
| Mobile canvas height dynamically reduced to reserve sheet space | CONCEPTUALLY_REUSABLE | Power uses 75vh overlay sheet that can cover content |

---

## Basic-Specific Patterns (not general)

- `TEMPLATE_WIDTH=360` / `TEMPLATE_MIN_HEIGHT=620` fixed phone frame.
- `EditableTarget` per-element `data-edit-target` wrapper (Power uses block frames).
- `resetKey` re-initializing camera on template switch.
- `getToolFocusTarget` section-aware mapping.

---

## Patterns That Must NOT Be Ported

- **Do NOT** copy fixed phone-frame width as a camera assumption — Power blocks are content-driven.
- **Do NOT** port "no undo/redo" — Power has reducer history; keep camera out of it.
- **Do NOT** port partial tool→canvas wiring (profile fields unwired); use a complete bidirectional registry.
- **Do NOT** assume `touch-action: none` everywhere — keep it narrowly scoped.

---

## Not Verified

- Authenticated Basic Editor runtime rendering and any actual zoom/pan/pinch/scroll interaction.
- Real-device touch/pinch/pointer-capture on iOS/Android.
- Mouse pan, Ctrl/Cmd-wheel focal zoom, reset/controls at runtime.
- Long-template bottom reachability at every zoom level.
- Real scroll-isolation / scroll-chaining behavior live.
- Selection auto-focus latency and perceived performance.
- Accessibility with real assistive technology.

## Required Summary Table

| Behavior | Runtime result | Implementation mechanism | State owner | Event owner | Reusable for Power? |
|---|---|---|---|---|---|
| Zoom | NOT_VERIFIED | `fitZoom × userZoom` + focal-anchor transform | CanvasWorkspace | wheel(ctrl)/buttons/pinch | Yes |
| Pan | NOT_VERIFIED | Pointer translation, clamped to real bounds | CanvasWorkspace | viewport pointer | Yes |
| Touch gestures | NOT_VERIFIED | `touch-action:none`, pointer map, pinch + 6px pan | CanvasWorkspace | viewport pointer | Yes (validate) |
| Canvas scroll | NOT_VERIFIED | `overflow-auto` stage sized from scaled content | browser + geometry | browser | Yes |
| Tools-panel scroll | NOT_VERIFIED | Separate `overflow-y-auto` containers | browser | browser | Yes |
| Scroll isolation | NOT_VERIFIED | Sibling containers + `overscroll-contain` | layout/browser | browser | Yes |
| Selection | NOT_VERIFIED | `EditableTarget`, stable ids, registry map | `editor.tsx` | click/keyboard | Yes (block registry) |
| Tool → canvas focus | NOT_VERIFIED | `selectedTarget` → `scrollTo(center)` (links wired, profile not) | `editor.tsx` | selection effect | Partial |
| Canvas → tools sync | NOT_VERIFIED | `toolFocusTarget` + `[data-tool-target]` + `scrollIntoView` | route + shell | selection effect | Yes |
| Responsive resizing | NOT_VERIFIED | `ResizeObserver` + dynamic mobile canvas height | CanvasWorkspace | ResizeObserver | Yes |
| Undo/redo separation | NOT_VERIFIED | No history; camera local/resettable | CanvasWorkspace/route | n/a | Yes (principle) |
| Content bounds | NOT_VERIFIED | Real scroll/offset measurement + overscan stage | CanvasWorkspace | ResizeObserver/gesture | Yes |

---

## Mandatory Questions — Answers

1. **Why does zoom feel stable?** Fixed `transform-origin: top left` + absolute origin + pointer-anchored world-point compensation + hard scale clamping + `fitZoom` reset baseline.
2. **Why does pan keep the document reachable?** Pan bounds clamped against real measured dimensions with a `MIN_VISIBLE_CANVAS` floor + `CANVAS_OVERSCAN` stage padding.
3. **What gesture model is active on mobile?** Pointer Events; `touch-action: none` on canvas; single-pointer pan (6px) + two-pointer pinch (focal-anchored); native scroll preserved for non-overflowing content.
4. **Exact `touch-action` and on which element?** `touch-action: none` on the canvas viewport `<div>` only; tools panels have no override (native scroll).
5. **Native vs custom?** Native: browser scroll (plain wheel, one-finger scroll, tools panel). Custom: Ctrl/Cmd-wheel zoom, transform pan, pinch.
6. **Why are canvas and tools scroll independent?** Separate sibling scroll containers with `overscroll-contain`; no shared state or propagation.
7. **How does a tool/config action locate and reveal the canvas element?** `onSelectTarget`/`onFocusTarget` → `handleTargetSelect` → `selectedTarget` effect → `targetsRef.get(id)` → `viewport.scrollTo(top=center)`.
8. **Stable IDs / refs / scrollIntoView / camera math?** Stable id constants + `targetsRef` ref registry (not `querySelector` in hot path) + native `scrollTo` centering (tool→canvas) and `scrollIntoView` (canvas→tools). No custom camera math for focusing — uses the viewport's native scroll.
9. **How is the selected element kept visible after tool interaction?** Centered via `scrollTo`; mobile canvas height dynamically shrinks so the sheet doesn't cover it.
10. **How are real dimensions measured?** `ResizeObserver` + `scrollWidth/offsetWidth` and `scrollHeight/offsetHeight`.
11. **How are pan/scroll bounds derived?** Real `scrollLeft/scrollTop` + `MIN_VISIBLE_CANVAS` − origin − scaled size.
12. **Is viewport state separated from document history?** Yes — camera is local `CanvasWorkspace` state; no document undo/redo to contaminate.
13. **Which mechanisms should be adapted to Power?** Separate scroll containers + `overscroll-contain`; narrowly-scoped `touch-action: none`; Pointer-Events gesture state; `fitZoom × userZoom` + anchored transform; real-dimension `ResizeObserver`; stage-with-overscan; `MIN_VISIBLE_CANVAS` clamp; id-based selection registry; camera-out-of-history; dynamic mobile canvas height reserving sheet space.
14. **Which should NOT be copied?** Fixed phone-frame size; missing undo/redo; partial tool→canvas wiring; single-fixed-width document assumption.

---

## Exact Files Inspected

- `src/components/basic-editor-shell/BasicEditorShell.tsx` (primary — camera, zoom/pan/pinch, scroll containers, mobile sheet).
- `src/routes/editor.tsx` (host — selection, registry, `toolFocusTarget`, scroll-to-element effect; Basic mounting portions only).
- `src/components/basic-template/BasicTemplateRenderer.tsx`, `EditTarget.tsx` (renderer + selection bridge).
- `src/types/basic-templates.ts` (`EditTargetRegistry`, `EDIT_TARGETS`, id helpers).
- Referenced (to confirm `EditableTarget`/`data-tool-target` contract): `basic-template/primitives/*`, `renderers/*`, `editor/ProfileSection.tsx`, `LinksSection.tsx`, `DesignSection.tsx`, `template-lab/TemplateLabEditor.tsx`.

---

## Scope Evidence

| Scope item | Result |
|---|---|
| Production files modified | **0** |
| Dependencies modified | **0** |
| Routes modified | **0** |
| DB modified | **0** |
| Power Editor modified | **0** |
| Frozen violations | **0** |
| Report created | `BASIC_EDITOR_CANVAS_BEHAVIOR_ARCHITECTURE_AUDIT_V1.md` |

**Final status: AUDIT COMPLETE — SOURCE-TRACED ARCHITECTURE DOCUMENTED; RUNTIME INTERACTIONS NOT_VERIFIED.**




