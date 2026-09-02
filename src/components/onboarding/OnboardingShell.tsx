/**
 * CRIPQER PREMIUM ONBOARDING V1 — flow shell.
 * Frontend only: no Supabase writes, no publishing, no AI, no template
 * generation. Produces exactly one deterministic OnboardingIntentV1.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import Logo from "@/components/brand/Logo";
import { STORAGE_KEY, TOTAL_STEPS } from "@/lib/onboarding/config";
import {
  EMPTY_DRAFT,
  type OnboardingDraft,
  type OnboardingIntentV1,
  type PrimaryActionType,
} from "@/lib/onboarding/types";
import {
  buildIntent,
  fromPersistedDraft,
  toPersistedDraft,
  validateActionValue,
  validateDraft,
} from "@/lib/onboarding/validation";
import { CompletionScreen } from "./CompletionScreen";
import { BrandButton, MotionStyles, surface } from "./primitives";
import { StepBusiness } from "./StepBusiness";
import { StepGoal } from "./StepGoal";
import { StepIdentity } from "./StepIdentity";
import { StepPersonality } from "./StepPersonality";
import { StepPrimaryAction } from "./StepPrimaryAction";
import { StepSummary } from "./StepSummary";

export function OnboardingShell({ debug = false }: { debug?: boolean }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [intent, setIntent] = useState<OnboardingIntentV1 | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  // The avatar object URL is owned by the shell: it must stay valid from
  // step 4 until the flow ends, long after StepIdentity unmounts.
  const avatarUrlRef = useRef<string | null>(null);
  // After an explicit restart, storage must stay removed until the user
  // actually edits the draft again — otherwise the persistence effect would
  // immediately rewrite the empty draft it just cleared.
  const clearedRef = useRef(false);

  useEffect(
    () => () => {
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
      avatarUrlRef.current = null;
    },
    [],
  );

  const setAvatar = (url: string | null) => {
    clearedRef.current = false;
    const previous = avatarUrlRef.current;
    if (previous && previous !== url) URL.revokeObjectURL(previous);
    avatarUrlRef.current = url;
    setDraft((d) => ({ ...d, identity: { ...d.identity, avatar_preview: url } }));
  };

  // Session/local frontend state only — no backend writes, no blob URLs.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setDraft(fromPersistedDraft(JSON.parse(raw), EMPTY_DRAFT));
    } catch {
      /* ignore corrupt drafts */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (clearedRef.current && draft === EMPTY_DRAFT) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedDraft(draft)));
    } catch {
      /* storage unavailable */
    }
  }, [draft, hydrated]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const update = (patch: Partial<OnboardingDraft>) => {
    clearedRef.current = false;
    setDraft((d) => ({ ...d, ...patch }));
  };

  const canContinue = useMemo(() => {
    const errors = validateDraft(draft);
    switch (step) {
      case 1:
        return !errors.includes("business_type") && !errors.includes("business_other");
      case 2:
        return !errors.includes("primary_goal");
      case 3:
        return !errors.includes("visual_personality");
      case 4:
        return !errors.includes("identity.name") && !errors.includes("identity.profession");
      case 5:
        return !errors.includes("primary_action.type") && !errors.includes("primary_action.value");
      default:
        return errors.length === 0;
    }
  }, [step, draft]);

  const goNext = () => {
    if (step === 5 && draft.primary_action.type) {
      const err = validateActionValue(draft.primary_action.type, draft.primary_action.value);
      setActionError(err);
      if (err) return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const finish = () => {
    const built = buildIntent(draft);
    if (!built) return;
    setFinishing(true);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    // Brief, deterministic transition — no fake AI generation.
    window.setTimeout(() => setIntent(built), 1400);
  };

  const restart = () => {
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    avatarUrlRef.current = null;
    clearedRef.current = true;
    setIntent(null);
    setFinishing(false);
    setDraft(EMPTY_DRAFT);
    setStep(1);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  };

  if (finishing) {
    return (
      <CompletionScreen
        intent={intent}
        debug={debug}
        showPayload={showPayload}
        onTogglePayload={() => setShowPayload((v) => !v)}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col" style={surface}>
      <TopBar step={step} />

      <main className="mx-auto w-full max-w-[640px] flex-1 px-[var(--space-4)] pb-[132px] pt-[var(--space-6)] sm:px-[var(--space-6)]">
        <div key={step} ref={headingRef} tabIndex={-1} className="cq-step outline-none">
          {step === 1 && (
            <StepBusiness
              businessType={draft.business_type}
              businessOther={draft.business_other}
              onChangeType={(id) => update({ business_type: id })}
              onChangeOther={(value) => update({ business_other: value })}
            />
          )}
          {step === 2 && (
            <StepGoal value={draft.primary_goal} onChange={(g) => update({ primary_goal: g })} />
          )}
          {step === 3 && (
            <StepPersonality
              value={draft.visual_personality}
              onChange={(p) => update({ visual_personality: p })}
            />
          )}
          {step === 4 && (
            <StepIdentity
              identity={draft.identity}
              onChange={(identity) => {
                if (identity.avatar_preview !== draft.identity.avatar_preview) {
                  setAvatar(identity.avatar_preview);
                }
                update({ identity: { ...identity, avatar_preview: avatarUrlRef.current } });
              }}
            />
          )}
          {step === 5 && (
            <StepPrimaryAction
              action={draft.primary_action}
              error={actionError}
              onChangeType={(type: PrimaryActionType) => {
                setActionError(null);
                update({ primary_action: { type, value: "" } });
              }}
              onChangeValue={(value) => {
                setActionError(null);
                update({ primary_action: { ...draft.primary_action, value } });
              }}
              onValidate={setActionError}
            />
          )}
          {step === 6 && <StepSummary draft={draft} onEdit={setStep} />}
        </div>
      </main>

      <footer
        className="sticky bottom-0 border-t"
        style={{
          borderColor: "var(--border-default)",
          backgroundColor: "var(--surface-primary)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[640px] items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] sm:px-[var(--space-6)]">
          {step > 1 && (
            <BrandButton variant="secondary" onClick={goBack} className="shrink-0">
              Atrás
            </BrandButton>
          )}
          {step < TOTAL_STEPS ? (
            <BrandButton onClick={goNext} disabled={!canContinue} className="flex-1">
              Continuar
            </BrandButton>
          ) : (
            <BrandButton onClick={finish} disabled={!canContinue} className="flex-1">
              Crear mi página
            </BrandButton>
          )}
        </div>
      </footer>

      <MotionStyles />
    </div>
  );
}

function TopBar({ step }: { step: number }) {
  const pct = (step / TOTAL_STEPS) * 100;
  return (
    <header
      className="sticky top-0 z-10 border-b"
      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] sm:px-[var(--space-6)]">
        <Logo variant="symbol" width={28} height={28} title="Cripqer" />
        <span
          className="font-brand"
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-label-size)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Paso {step} de {TOTAL_STEPS}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        aria-label="Progreso del onboarding"
        style={{ height: 3, backgroundColor: "var(--border-default)" }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: "var(--brand-primary)",
            transition: "width var(--duration-base) var(--ease-standard)",
          }}
        />
      </div>
    </header>
  );
}
