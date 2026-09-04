# Cripqer — Engine V2 Copy Handoff

Date: 2026-09-03  
Status: **READY_FOR_ENGINE_V2_COPY**  
Engine V2 copied in this phase: **NO**

## Installed prerequisite

The authoritative Power Editor V2 is installed at:

```text
src/premium-template-studio/
```

Its authoritative source was:

```text
PROYECTO PARA INTEGRA A QR/src/premium-template-studio/
```

`BioTemplateConfig` is defined at:

```text
src/premium-template-studio/types/index.ts
```

The host canonical boundary is type-connected to it through
`src/lib/canonical-page/contract.ts`; persistence remains the existing
`schemaVersion + editorConfig` envelope and no JSON was rewritten.

## Resolved Engine dependencies

The following imports now resolve in the current host:

```text
@/premium-template-studio/types
@/premium-template-studio/constants/layouts
@/premium-template-studio/constants/blockDefinitions
@/premium-template-studio/engine/BlockRegistry
@/premium-template-studio/engine/TemplateValidator
```

Precheck result: **READY_FOR_ENGINE_V2_COPY**.

## Validation evidence

- Power Editor scoped Vitest: **7 files, 63/63 passed**.
- TemplateValidator tests: **PASS**.
- Renderer/component/visual contract tests: **PASS**.
- Module local import closure: **0 unresolved imports**.
- Source parity: **46/46 byte-identical**.
- Cripqer `npm run build`: **PASS**.
- Basic Editor and public routes: **unchanged by this phase**.

The global host `tsc` invocation still has unrelated pre-existing diagnostics
outside the installed module; no diagnostics were emitted for the copied
Power Editor or its canonical type-only integration.

The browser `h2-audit.spec.ts` is present but remains dormant because its
dedicated `/p/v2-contract` route is intentionally not exposed in this phase.

## Exact next-copy source

Copy the Engine V2 source only from:

```text
PROYECTO PARA INTEGRA A QR/src/lib/parametric-engine/
```

The authoritative companion snapshot contains 86 Engine V2 files. The future
copy must be isolated from the existing Engine V1 at:

```text
src/lib/parametric-engine/
```

Do not overwrite, merge into, or rename the Engine V1 namespace.

## Media and AI source paths

The companion Engine V2 source contains these future integration areas:

```text
PROYECTO PARA INTEGRA A QR/src/lib/parametric-engine/media/
PROYECTO PARA INTEGRA A QR/src/lib/parametric-engine/ai/
```

Relevant provider/server paths include:

```text
.../media/curator.ts
.../media/pexels-provider.ts
.../media/unsplash-provider.ts
.../media/server.ts
.../media/types.ts
.../ai/deepseek-provider.ts
.../ai/guardrails.ts
.../ai/server.ts
.../ai/types.ts
.../ai/validation.ts
```

These are source paths only. They are not installed, callable, or authorized
for copying in the present checkpoint.

## Next-phase rules

1. Keep the installed Power Editor contract unchanged.
2. Copy Engine V2 into a new isolated namespace only under an explicit
   checkpoint.
3. Re-run the Engine self-check without changing Engine or Power contracts.
4. Preserve the opaque `BioTemplateConfig` and canonical persistence boundary.
5. Keep `/editor`, public navigation, onboarding, auth, billing, database, and
   production renderer unchanged.
6. Add an internal generation entry point only after Engine validation and a
   feature-flag decision.

This handoff authorizes no Engine copy by itself.
