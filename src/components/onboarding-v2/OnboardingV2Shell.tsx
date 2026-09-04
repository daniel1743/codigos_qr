import { useEffect, useMemo, useRef, useState } from "react";

import Logo from "@/components/brand/Logo";
import {
  ACTION_OPTIONS,
  BUSINESS_OPTIONS,
  COMMERCIAL_OPTIONS,
  CONTENT_OPTIONS,
  DENSITY_OPTIONS,
  GOAL_OPTIONS,
  MEDIA_OPTIONS,
  ONBOARDING_V2_STORAGE_KEY,
  SEMANTIC_ACTIONS_WITH_OPTIONAL_DESTINATION,
  VISUAL_OPTIONS,
} from "@/lib/onboarding-v2/config";
import type {
  ActionIntentV2,
  ActionTypeV2,
  ContentNeedV2,
  OnboardingIntentV2,
} from "@/lib/onboarding-v2";
import {
  buildOnboardingIntentV2,
  createEmptyOnboardingV2Draft,
  fromPersistedDraftV2,
  isCommercialRelevant,
  reconcileOnboardingV2Draft,
  toPersistedDraftV2,
  type OnboardingV2Draft,
} from "./state";
import {
  BrandButton,
  Field,
  MotionStyles,
  OptionGroup,
  StepHeading,
  controlStyle,
  focusRing,
  surface,
} from "@/components/onboarding/primitives";

const TOTAL_STEPS = 8;
const OPTIONAL_DESTINATION_TYPES = new Set<ActionTypeV2>(
  SEMANTIC_ACTIONS_WITH_OPTIONAL_DESTINATION,
);

export function OnboardingV2Shell({ debug = false }: { debug?: boolean }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<OnboardingV2Draft>(createEmptyOnboardingV2Draft);
  const [hydrated, setHydrated] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [intent, setIntent] = useState<OnboardingIntentV2 | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const avatarUrlRef = useRef<string | null>(null);
  const clearedRef = useRef(false);

  useEffect(
    () => () => {
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(ONBOARDING_V2_STORAGE_KEY);
      if (raw) setDraft(fromPersistedDraftV2(JSON.parse(raw)));
    } catch {
      /* Ignore an unavailable or corrupt browser draft. */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || (clearedRef.current && step === 1 && !draft.identity.displayName)) return;
    try {
      window.sessionStorage.setItem(
        ONBOARDING_V2_STORAGE_KEY,
        JSON.stringify(toPersistedDraftV2(draft)),
      );
    } catch {
      /* Session storage is an optional convenience. */
    }
  }, [draft, hydrated, step]);

  useEffect(() => {
    headingRef.current?.focus();
    setStepError(null);
  }, [step]);

  const update = (updater: (current: OnboardingV2Draft) => OnboardingV2Draft) => {
    clearedRef.current = false;
    setDraft((current) => reconcileOnboardingV2Draft(updater(current)));
  };

  const canContinue = useMemo(() => isStepComplete(step, draft), [draft, step]);

  const goNext = () => {
    if (!canContinue) {
      setStepError(errorForStep(step, draft));
      return;
    }
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  };

  const finish = () => {
    const built = buildOnboardingIntentV2(draft);
    if (!built.intent) {
      setStepError("Revisa las respuestas obligatorias antes de terminar.");
      return;
    }
    setFinishing(true);
    try {
      window.sessionStorage.removeItem(ONBOARDING_V2_STORAGE_KEY);
    } catch {
      /* Ignore unavailable storage. */
    }
    window.setTimeout(() => setIntent(built.intent), 350);
  };

  const restart = () => {
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    avatarUrlRef.current = null;
    clearedRef.current = true;
    setDraft(createEmptyOnboardingV2Draft());
    setIntent(null);
    setFinishing(false);
    setShowPayload(false);
    setStepError(null);
    setStep(1);
    try {
      window.sessionStorage.removeItem(ONBOARDING_V2_STORAGE_KEY);
    } catch {
      /* Ignore unavailable storage. */
    }
  };

  if (finishing) {
    return (
      <CompletionV2
        intent={intent}
        debug={debug}
        showPayload={showPayload}
        onTogglePayload={() => setShowPayload((current) => !current)}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col" style={surface}>
      <TopBar step={step} />
      <main className="mx-auto w-full max-w-[680px] flex-1 px-[var(--space-4)] pb-[132px] pt-[var(--space-6)] sm:px-[var(--space-6)]">
        <div key={step} ref={headingRef} tabIndex={-1} className="cq-step outline-none">
          {step === 1 && <IdentityStep draft={draft} update={update} avatarUrlRef={avatarUrlRef} />}
          {step === 2 && <BusinessStep draft={draft} update={update} />}
          {step === 3 && <GoalStep draft={draft} update={update} />}
          {step === 4 && <VisualStep draft={draft} update={update} />}
          {step === 5 && <ContentStep draft={draft} update={update} />}
          {step === 6 && <ActionsStep draft={draft} update={update} />}
          {step === 7 && <MediaStep draft={draft} update={update} />}
          {step === 8 && <ReviewStep draft={draft} setStep={setStep} update={update} />}
          {stepError && (
            <p className="mt-[var(--space-4)]" role="alert" style={{ color: "var(--state-error)" }}>
              {stepError}
            </p>
          )}
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
        <div className="mx-auto flex w-full max-w-[680px] items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] sm:px-[var(--space-6)]">
          {step > 1 && (
            <BrandButton variant="secondary" onClick={() => setStep((current) => current - 1)}>
              Atrás
            </BrandButton>
          )}
          {step < TOTAL_STEPS ? (
            <BrandButton onClick={goNext} className="flex-1">
              Continuar
            </BrandButton>
          ) : (
            <BrandButton onClick={finish} className="flex-1">
              Guardar mis respuestas
            </BrandButton>
          )}
        </div>
      </footer>
      <MotionStyles />
    </div>
  );
}

function TopBar({ step }: { step: number }) {
  return (
    <header
      className="sticky top-0 z-10 border-b"
      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-[680px] items-center justify-between gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] sm:px-[var(--space-6)]">
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
          Onboarding V2 · Paso {step} de {TOTAL_STEPS}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        aria-label="Progreso del onboarding V2"
        style={{ height: 3, backgroundColor: "var(--border-default)" }}
      >
        <div
          style={{
            width: `${(step / TOTAL_STEPS) * 100}%`,
            height: "100%",
            backgroundColor: "var(--brand-primary)",
            transition: "width var(--duration-base) var(--ease-standard)",
          }}
        />
      </div>
    </header>
  );
}

function IdentityStep({
  draft,
  update,
  avatarUrlRef,
}: {
  draft: OnboardingV2Draft;
  update: (updater: (current: OnboardingV2Draft) => OnboardingV2Draft) => void;
  avatarUrlRef: React.MutableRefObject<string | null>;
}) {
  return (
    <section className="grid gap-[var(--space-5)]">
      <StepHeading
        title="¿Quién eres y a qué te dedicas?"
        note="Cuéntanos lo esencial. Esto guía la primera propuesta, no define el diseño final."
      />
      <Field
        label="Nombre o nombre de marca"
        error={
          draft.identity.displayName && draft.identity.displayName.trim().length < 2
            ? "Escribe al menos 2 caracteres."
            : null
        }
      >
        <input
          aria-label="Nombre o nombre de marca"
          value={draft.identity.displayName}
          onChange={(event) =>
            update((current) => ({
              ...current,
              identity: { ...current.identity, displayName: event.target.value },
            }))
          }
          style={controlStyle(
            Boolean(draft.identity.displayName && draft.identity.displayName.trim().length < 2),
          )}
        />
      </Field>
      <Field
        label="Actividad o profesión"
        error={
          draft.identity.professionOrActivity &&
          draft.identity.professionOrActivity.trim().length < 2
            ? "Escribe al menos 2 caracteres."
            : null
        }
      >
        <input
          aria-label="Actividad o profesión"
          value={draft.identity.professionOrActivity}
          onChange={(event) =>
            update((current) => ({
              ...current,
              identity: { ...current.identity, professionOrActivity: event.target.value },
            }))
          }
          style={controlStyle(
            Boolean(
              draft.identity.professionOrActivity &&
              draft.identity.professionOrActivity.trim().length < 2,
            ),
          )}
        />
      </Field>
      <Field label="Descripción breve (opcional)" counter={`${draft.identity.bio.length}/160`}>
        <textarea
          aria-label="Descripción breve"
          maxLength={160}
          rows={3}
          value={draft.identity.bio}
          onChange={(event) =>
            update((current) => ({
              ...current,
              identity: { ...current.identity, bio: event.target.value },
            }))
          }
          style={{ ...controlStyle(), resize: "vertical" }}
        />
      </Field>
      <Field
        label="Logo o avatar (opcional)"
        hint="Solo se muestra como vista previa local en este flujo; no se sube ni se guarda todavía."
      >
        <input
          aria-label="Logo o avatar opcional"
          type="file"
          accept="image/*"
          className={`${focusRing} w-full text-sm`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const next = URL.createObjectURL(file);
            if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
            avatarUrlRef.current = next;
            update((current) => ({
              ...current,
              identity: { ...current.identity, avatarPreview: next },
            }));
          }}
        />
      </Field>
    </section>
  );
}

function BusinessStep({ draft, update }: StepProps) {
  return (
    <section>
      <StepHeading
        title="¿En qué categoría encaja mejor tu actividad?"
        note="Elige una opción aproximada. Puedes usar Otro si no encuentras una coincidencia."
      />
      <OptionGroup
        label="Categoría de actividad"
        options={BUSINESS_OPTIONS}
        value={draft.business.category}
        onChange={(id) =>
          update((current) => ({ ...current, business: { ...current.business, category: id } }))
        }
      />
      {draft.business.category === "other" && (
        <div className="mt-[var(--space-5)]">
          <Field label="Tu actividad">
            <input
              aria-label="Tu actividad personalizada"
              value={draft.business.customCategory}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  business: { ...current.business, customCategory: event.target.value },
                }))
              }
              style={controlStyle()}
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function GoalStep({ draft, update }: StepProps) {
  return (
    <section>
      <StepHeading
        title="¿Qué quieres conseguir con tu página?"
        note="Escoge el resultado más importante para ti ahora."
      />
      <OptionGroup
        label="Objetivo principal"
        options={GOAL_OPTIONS}
        value={draft.outcome.primaryGoal}
        onChange={(id) =>
          update((current) => ({ ...current, outcome: { ...current.outcome, primaryGoal: id } }))
        }
      />
      {draft.outcome.primaryGoal === "other" && (
        <div className="mt-[var(--space-5)]">
          <Field label="Tu objetivo">
            <input
              aria-label="Tu objetivo personalizado"
              value={draft.outcome.customGoal}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  outcome: { ...current.outcome, customGoal: event.target.value },
                }))
              }
              style={controlStyle()}
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function VisualStep({ draft, update }: StepProps) {
  return (
    <section>
      <StepHeading
        title="¿Qué sensación quieres transmitir?"
        note="Solo es una dirección general. Cripqer se encarga de los detalles visuales."
      />
      <OptionGroup
        label="Dirección visual"
        options={VISUAL_OPTIONS}
        value={draft.visualDirection.preference}
        onChange={(id) =>
          update((current) => ({
            ...current,
            visualDirection: { ...current.visualDirection, preference: id },
          }))
        }
      />
      {draft.visualDirection.preference === "other" && (
        <div className="mt-[var(--space-5)]">
          <Field label="Describe la sensación">
            <input
              aria-label="Descripción visual personalizada"
              value={draft.visualDirection.customDescription}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  visualDirection: {
                    ...current.visualDirection,
                    customDescription: event.target.value,
                  },
                }))
              }
              style={controlStyle()}
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function ContentStep({ draft, update }: StepProps) {
  const toggle = (type: ContentNeedV2) =>
    update((current) => {
      const items = current.contentNeeds.items.some((item) => item.type === type)
        ? current.contentNeeds.items.filter((item) => item.type !== type)
        : [...current.contentNeeds.items, { type }];
      return { ...current, contentNeeds: { items, userHasNoContentYet: false } };
    });
  return (
    <section>
      <StepHeading
        title="¿Qué quieres mostrar o facilitar?"
        note="Puedes elegir varias opciones. No son secciones ni controles del editor."
      />
      <div
        className="grid gap-[var(--space-3)] sm:grid-cols-2"
        role="group"
        aria-label="Necesidades de contenido"
      >
        {CONTENT_OPTIONS.map((option) => {
          const selected = draft.contentNeeds.items.some((item) => item.type === option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option.id)}
              className={`font-brand ${focusRing} flex min-h-[var(--touch-target-min)] items-center justify-between border px-[var(--space-4)] text-left`}
              style={{
                borderRadius: "var(--brand-radius-md)",
                borderColor: selected ? "var(--border-strong)" : "var(--border-default)",
                borderWidth: selected ? 2 : 1,
                backgroundColor: selected ? "var(--brand-primary-soft)" : "var(--surface-primary)",
                color: "var(--text-primary)",
              }}
            >
              <span>{option.label}</span>
              <span aria-hidden="true">{selected ? "✓" : "＋"}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={draft.contentNeeds.userHasNoContentYet}
        onClick={() =>
          update((current) => ({
            ...current,
            contentNeeds: {
              items: [],
              userHasNoContentYet: !current.contentNeeds.userHasNoContentYet,
            },
          }))
        }
        className={`font-brand ${focusRing} mt-[var(--space-4)] w-full border px-[var(--space-4)] py-[var(--space-4)] text-left`}
        style={{
          borderRadius: "var(--brand-radius-md)",
          borderColor: draft.contentNeeds.userHasNoContentYet
            ? "var(--border-strong)"
            : "var(--border-default)",
          backgroundColor: draft.contentNeeds.userHasNoContentYet
            ? "var(--brand-primary-soft)"
            : "var(--surface-primary)",
          color: "var(--text-primary)",
        }}
      >
        Aún no sé / dejar que Cripqer decida
      </button>
      {draft.contentNeeds.items.some((item) => item.type === "other") && (
        <div className="mt-[var(--space-5)]">
          <Field label="¿Qué más quieres incluir?">
            <input
              aria-label="Contenido adicional"
              value={
                draft.contentNeeds.items.find((item) => item.type === "other")?.customLabel ?? ""
              }
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  contentNeeds: {
                    ...current.contentNeeds,
                    items: current.contentNeeds.items.map((item) =>
                      item.type === "other" ? { ...item, customLabel: event.target.value } : item,
                    ),
                  },
                }))
              }
              style={controlStyle()}
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function ActionsStep({ draft, update }: StepProps) {
  const [secondaryType, setSecondaryType] = useState<ActionTypeV2>("whatsapp");
  const [secondaryValue, setSecondaryValue] = useState("");
  const primary = draft.actions.primary;
  const setPrimaryType = (type: ActionTypeV2 | null) =>
    update((current) => ({
      ...current,
      actions: { ...current.actions, primary: type ? { type, source: "user" } : null },
    }));
  const setPrimaryValue = (value: string) =>
    update((current) =>
      current.actions.primary
        ? {
            ...current,
            actions: {
              ...current.actions,
              primary: { ...current.actions.primary, ...(value ? { value } : {}) },
            },
          }
        : current,
    );
  const addSecondary = () => {
    if (!secondaryValue.trim() && !OPTIONAL_DESTINATION_TYPES.has(secondaryType)) return;
    const action: ActionIntentV2 = {
      type: secondaryType,
      source: "user",
      ...(secondaryValue.trim() ? { value: secondaryValue.trim() } : {}),
    };
    update((current) => ({
      ...current,
      actions: { ...current.actions, secondary: [...current.actions.secondary, action] },
    }));
    setSecondaryValue("");
  };
  return (
    <section className="grid gap-[var(--space-5)]">
      <StepHeading
        title="¿Cómo quieres que te contacten?"
        note="Define una acción principal y, si quieres, añade otras en orden de importancia."
      />
      <OptionGroup
        label="Acción principal"
        options={[
          {
            id: "none",
            label: "Prefiero empezar sin acción principal",
            caption: "Puedes añadirla más adelante.",
          },
          ...ACTION_OPTIONS,
        ]}
        value={primary?.type ?? "none"}
        onChange={(id) => setPrimaryType(id === "none" ? null : id)}
      />
      {primary && (
        <Field
          label="Destino de la acción principal"
          hint={
            OPTIONAL_DESTINATION_TYPES.has(primary.type)
              ? "Opcional por ahora: guardaremos la intención semántica."
              : "Usa un formato válido para este tipo de acción."
          }
        >
          <input
            aria-label="Destino de la acción principal"
            value={primary.value ?? ""}
            onChange={(event) => setPrimaryValue(event.target.value)}
            style={controlStyle()}
          />
        </Field>
      )}
      <div
        className="border-t pt-[var(--space-5)]"
        style={{ borderColor: "var(--border-default)" }}
      >
        <h2 className="font-brand font-semibold" style={{ color: "var(--text-primary)" }}>
          Acciones secundarias (opcional)
        </h2>
        <div className="mt-[var(--space-3)] grid gap-[var(--space-3)] sm:grid-cols-[1fr_1fr_auto]">
          <select
            aria-label="Tipo de acción secundaria"
            value={secondaryType}
            onChange={(event) => setSecondaryType(event.target.value as ActionTypeV2)}
            style={controlStyle()}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            aria-label="Destino de acción secundaria"
            value={secondaryValue}
            onChange={(event) => setSecondaryValue(event.target.value)}
            placeholder="Destino (opcional según acción)"
            style={controlStyle()}
          />
          <BrandButton variant="secondary" onClick={addSecondary}>
            Añadir
          </BrandButton>
        </div>
        {draft.actions.secondary.length > 0 && (
          <ol className="mt-[var(--space-3)] grid gap-2">
            {draft.actions.secondary.map((action, index) => (
              <li
                key={`${action.type}-${index}`}
                className="flex items-center justify-between gap-2 rounded border px-3 py-2"
                style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              >
                <span>
                  {index + 1}. {actionLabel(action)}
                  {action.value ? ` · ${action.value}` : ""}
                </span>
                <button
                  type="button"
                  className={`${focusRing} p-2`}
                  aria-label={`Quitar acción secundaria ${index + 1}`}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      actions: {
                        ...current.actions,
                        secondary: current.actions.secondary.filter(
                          (_, actionIndex) => actionIndex !== index,
                        ),
                      },
                    }))
                  }
                >
                  Quitar
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function MediaStep({ draft, update }: StepProps) {
  return (
    <section>
      <StepHeading
        title="¿Qué material tienes disponible?"
        note="Esto ayuda a preparar una propuesta realista. Los archivos no se suben en este paso."
      />
      <OptionGroup
        label="Preferencia de material"
        options={MEDIA_OPTIONS}
        value={draft.media.preference}
        onChange={(id) =>
          update((current) => ({ ...current, media: { ...current.media, preference: id } }))
        }
      />
      <div className="mt-[var(--space-5)] grid gap-3">
        <Toggle
          label="Tengo fotos propias"
          checked={draft.media.hasOwnPhotos === true}
          onChange={(checked) =>
            update((current) => ({
              ...current,
              media: { ...current.media, hasOwnPhotos: checked },
            }))
          }
        />
        <Toggle
          label="Tengo videos"
          checked={draft.media.hasVideos === true}
          onChange={(checked) =>
            update((current) => ({ ...current, media: { ...current.media, hasVideos: checked } }))
          }
        />
        <Toggle
          label="Tengo logo o avatar"
          checked={draft.media.hasLogoOrAvatar === true}
          onChange={(checked) =>
            update((current) => ({
              ...current,
              media: { ...current.media, hasLogoOrAvatar: checked },
            }))
          }
        />
        <Toggle
          label="Tengo material para portafolio o galería"
          checked={draft.media.hasPortfolioOrGalleryAssets === true}
          onChange={(checked) =>
            update((current) => ({
              ...current,
              media: { ...current.media, hasPortfolioOrGalleryAssets: checked },
            }))
          }
        />
        <Toggle
          label="Necesito ayuda con el material"
          checked={draft.media.needsMediaHelp === true}
          onChange={(checked) =>
            update((current) => ({
              ...current,
              media: { ...current.media, needsMediaHelp: checked },
            }))
          }
        />
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`font-brand ${focusRing} flex min-h-[var(--touch-target-min)] cursor-pointer items-center gap-3 rounded border px-4`}
      style={{
        borderColor: "var(--border-default)",
        backgroundColor: checked ? "var(--brand-primary-soft)" : "var(--surface-primary)",
        color: "var(--text-primary)",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function ReviewStep({ draft, setStep, update }: StepProps & { setStep: (step: number) => void }) {
  const commercialRelevant = isCommercialRelevant(draft);
  return (
    <section className="grid gap-[var(--space-5)]">
      <StepHeading
        title="Revisa tus respuestas"
        note="Aquí confirmas una intención semántica. La generación y los editores ocurren en una fase posterior."
      />
      <div className="grid gap-3">
        {reviewRow(
          "Identidad",
          `${draft.identity.displayName || "—"} · ${draft.identity.professionOrActivity || "—"}`,
          1,
          setStep,
        )}
        {reviewRow("Objetivo", draft.outcome.primaryGoal ?? "—", 3, setStep)}
        {reviewRow("Dirección visual", draft.visualDirection.preference ?? "—", 4, setStep)}
        {reviewRow(
          "Qué incluir",
          draft.contentNeeds.userHasNoContentYet
            ? "Cripqer decide"
            : draft.contentNeeds.items.map((item) => item.type).join(", ") || "Nada específico",
          5,
          setStep,
        )}
        {reviewRow(
          "Acción principal",
          draft.actions.primary ? actionLabel(draft.actions.primary) : "Sin acción principal",
          6,
          setStep,
        )}
        {reviewRow(
          "Acciones secundarias",
          draft.actions.secondary.length
            ? draft.actions.secondary.map(actionLabel).join(" → ")
            : "Ninguna",
          6,
          setStep,
        )}
        {reviewRow("Material", draft.media.preference ?? "—", 7, setStep)}
        {reviewRow("Alcance", draft.scope.density, 8, setStep)}
        {commercialRelevant && (
          <div>
            {reviewRow("Señal comercial", draft.commercial.mode ?? "Elige una opción", 8, setStep)}
            <div className="mt-3">
              <OptionGroup
                label="Intención comercial general"
                options={COMMERCIAL_OPTIONS}
                value={draft.commercial.mode}
                onChange={(id) =>
                  update((current) => ({
                    ...current,
                    commercial: { ...current.commercial, mode: id, relevant: true },
                  }))
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function reviewRow(label: string, value: string, step: number, setStep: (step: number) => void) {
  return (
    <div
      className="flex items-start justify-between gap-3 border-b py-3"
      style={{ borderColor: "var(--border-default)" }}
    >
      <div>
        <dt className="font-brand text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {label}
        </dt>
        <dd
          className="font-brand mt-1 break-words text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {value}
        </dd>
      </div>
      <button
        type="button"
        className={`${focusRing} shrink-0 p-2 text-sm underline`}
        onClick={() => setStep(step)}
      >
        Editar
      </button>
    </div>
  );
}

function CompletionV2({
  intent,
  debug,
  showPayload,
  onTogglePayload,
  onRestart,
}: {
  intent: OnboardingIntentV2 | null;
  debug: boolean;
  showPayload: boolean;
  onTogglePayload: () => void;
  onRestart: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[680px] flex-col justify-center px-4 py-10 sm:px-6">
      <div
        className="grid gap-5 rounded-[var(--brand-radius-lg)] border p-6"
        style={{ ...surface, borderColor: "var(--border-default)" }}
      >
        <StepHeading
          title="Tus respuestas están listas"
          note="La intención semántica quedó validada para la siguiente fase. Esta vista interna no genera ni publica una página."
        />
        {intent && (
          <div className="grid gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>
              <strong>Identidad:</strong> {intent.identity.displayName}
            </p>
            <p>
              <strong>Objetivo:</strong> {intent.outcome.primaryGoal}
            </p>
            <p>
              <strong>Contenido:</strong>{" "}
              {intent.contentNeeds.items.length || "Sin selección específica"}
            </p>
            <p>
              <strong>Acción principal:</strong>{" "}
              {intent.actions.primary ? actionLabel(intent.actions.primary) : "Sin CTA"}
            </p>
          </div>
        )}
        {debug && (
          <>
            <BrandButton variant="secondary" onClick={onTogglePayload}>
              {showPayload ? "Ocultar payload interno" : "Ver payload interno"}
            </BrandButton>
            {showPayload && (
              <pre
                className="max-h-[360px] overflow-auto rounded border p-3 text-xs"
                style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              >
                {JSON.stringify(intent, null, 2)}
              </pre>
            )}
          </>
        )}
        <BrandButton variant="ghost" onClick={onRestart}>
          Reiniciar onboarding
        </BrandButton>
      </div>
    </main>
  );
}

type StepProps = {
  draft: OnboardingV2Draft;
  update: (updater: (current: OnboardingV2Draft) => OnboardingV2Draft) => void;
};

function actionLabel(action: ActionIntentV2): string {
  return ACTION_OPTIONS.find((option) => option.id === action.type)?.label ?? action.type;
}

function isActionComplete(action: ActionIntentV2 | null): boolean {
  if (!action) return true;
  return OPTIONAL_DESTINATION_TYPES.has(action.type) || Boolean(action.value?.trim());
}

function isStepComplete(step: number, draft: OnboardingV2Draft): boolean {
  switch (step) {
    case 1:
      return (
        draft.identity.displayName.trim().length >= 2 &&
        draft.identity.professionOrActivity.trim().length >= 2
      );
    case 2:
      return (
        Boolean(draft.business.category) &&
        (draft.business.category !== "other" || draft.business.customCategory.trim().length >= 2)
      );
    case 3:
      return (
        Boolean(draft.outcome.primaryGoal) &&
        (draft.outcome.primaryGoal !== "other" || draft.outcome.customGoal.trim().length >= 2)
      );
    case 4:
      return (
        Boolean(draft.visualDirection.preference) &&
        (draft.visualDirection.preference !== "other" ||
          draft.visualDirection.customDescription.trim().length >= 2)
      );
    case 5:
      return draft.contentNeeds.userHasNoContentYet || draft.contentNeeds.items.length > 0;
    case 6:
      return (
        isActionComplete(draft.actions.primary) && draft.actions.secondary.every(isActionComplete)
      );
    case 7:
      return Boolean(draft.media.preference);
    case 8:
      return (
        Boolean(buildOnboardingIntentV2(draft).intent) &&
        (!isCommercialRelevant(draft) || Boolean(draft.commercial.mode))
      );
    default:
      return false;
  }
}

function errorForStep(step: number, draft: OnboardingV2Draft): string {
  if (step === 1) return "Completa tu nombre y actividad con al menos 2 caracteres.";
  if (step === 2) return "Selecciona una categoría y completa tu actividad si elegiste Otro.";
  if (step === 3) return "Selecciona un objetivo y descríbelo si elegiste Otro.";
  if (step === 4) return "Selecciona una dirección visual y descríbela si elegiste Otra.";
  if (step === 5) return "Selecciona al menos una opción o indica que todavía no lo sabes.";
  if (step === 6) return "Completa los destinos obligatorios de tus acciones.";
  if (step === 7) return "Selecciona una preferencia de material, aunque sea Todavía no lo sé.";
  return isCommercialRelevant(draft) && !draft.commercial.mode
    ? "Selecciona una intención comercial general."
    : "Revisa las respuestas obligatorias.";
}
