# Cripqer Premium Onboarding V1 — Integration Pack

Minimal set of files to drop into the Cripqer repository. Nothing else from the
Lovable sandbox is part of the deliverable.

## Files

```
src/components/onboarding/OnboardingShell.tsx      flow controller (steps, progress, state)
src/components/onboarding/StepBusiness.tsx
src/components/onboarding/StepGoal.tsx
src/components/onboarding/StepPersonality.tsx
src/components/onboarding/StepIdentity.tsx
src/components/onboarding/StepPrimaryAction.tsx
src/components/onboarding/StepSummary.tsx
src/components/onboarding/CompletionScreen.tsx
src/components/onboarding/primitives.tsx           local UI primitives (button, field, radiogroup)
src/components/onboarding/index.ts                 barrel
src/lib/onboarding/types.ts                        OnboardingIntentV1 contract
src/lib/onboarding/config.ts                       option catalogues + copy
src/lib/onboarding/validation.ts                   invariants + persistence helpers
```

Explicitly **not** part of the pack: `package.json`, lockfiles, `vite.config.ts`,
`server.ts`, `router.tsx`, `__root.tsx`, `routeTree.gen.ts`, shadcn component
library, unused UI, infrastructure or any new dependency.

## Runtime dependencies

- `react` (hooks only)
- `cn` helper from `@/lib/utils` (clsx + tailwind-merge). Swap the import if the
  host repo exposes it elsewhere.
- `CripqerLogo` from `@/components/brand` (Brand System V1 centralized logo).
- Tailwind for layout utilities only. No new UI library, no animation library,
  no form library, no router dependency inside the components.

## Brand System V1 tokens consumed (read-only)

Colors: `--brand-primary`, `--brand-primary-hover`, `--brand-primary-soft`,
`--brand-primary-contrast`, `--brand-gold`, `--brand-gold-soft`,
`--brand-gold-contrast`, `--surface-primary`, `--surface-secondary`,
`--surface-inverse`, `--text-primary`, `--text-secondary`, `--text-inverse`,
`--border-default`, `--border-strong`, `--state-error`.

Type: `--text-h1-size/-leading`, `--text-body-size/-leading`,
`--text-ui-size/-leading`, `--text-caption-size/-leading`, `--text-label-size`,
`--tracking-label`, and the `font-brand` utility (Montserrat 400/500/600/700).

Geometry / motion: `--brand-radius-sm|md|lg|pill`, `--space-1..16`,
`--duration-fast|base|slow`, `--ease-standard`, `--touch-target-min`.

No token values are modified. Gold appears only as the restrained completion
badge.

## Mounting

```tsx
import { OnboardingShell } from "@/components/onboarding";

<OnboardingShell />          // production
<OnboardingShell debug />    // exposes the payload inspector on completion
```

Any route wrapper works; the components have no router imports.

## Contract

`buildIntent(draft)` in `lib/onboarding/validation.ts` is the only producer of
`OnboardingIntentV1`. It re-validates every invariant (business type and the
`otro` free text, goal, personality, identity name/profession, action type and
destination via `validateActionValue`) and returns `null` when anything fails,
so the contract never depends on UI step gating.

## State and persistence

- Draft is stored in `sessionStorage` under `cripqer.onboarding.draft.v1`, so
  contact data does not survive the browser session. It is cleared on
  completion and on restart.
- `identity.avatar_preview` is an **in-memory** `URL.createObjectURL` handle
  owned by `OnboardingShell`: stripped by `toPersistedDraft`, never restored by
  `fromPersistedDraft`, and revoked only when replaced, removed, on restart, or
  when the shell unmounts. `StepIdentity` never revokes it, so the preview stays
  valid from step 4 through the summary and completion screens.
- No Supabase writes, no uploads, no publishing, no QR, no analytics.

## Accessibility

- Option lists are true `radiogroup`s with roving tabindex and
  Arrow/Home/End/Space/Enter handling.
- Selection is signalled by border weight + check icon, never color alone.
- Explicit `:focus-visible` rings everywhere; 48px minimum touch targets.
- Motion is limited to a cross-fade plus 8px translate and is disabled under
  `prefers-reduced-motion: reduce`.
