import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  CircleAlert,
  Globe2,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { PublicTemplateRenderer } from "@/premium-template-studio/engine/PublicTemplateRenderer";
import type { BioTemplateConfig } from "@/premium-template-studio/types";
import {
  BUSINESS_OPTIONS,
  DENSITY_OPTIONS,
  type OnboardingChoice,
} from "@/lib/onboarding-v2/config";
import {
  addMenuItem,
  addPortfolioItem,
  addProduct,
  addService,
  createEmptyOwnerContentIntake,
  getOwnerContent,
  removeMenuItem,
  removePortfolioItem,
  removeProduct,
  removeService,
  setAvatar,
  setContact,
  setCover,
  setIdentity,
  updateMenuItem,
  updatePortfolioItem,
  updateProduct,
  updateService,
  type OwnerContentIntakeState,
} from "@/lib/onboarding-v2/owner-content-intake";
import {
  generateSmartPageFromOnboardingFn,
  persistPremiumOnboardingGeneratedPageFn,
} from "@/lib/onboarding-v2";
import type { OnboardingSmartPagesGenerationResult } from "@/lib/onboarding-v2/smart-pages-adapter";
import type { PersistPremiumOnboardingGeneratedPageResult } from "@/lib/onboarding-v2/premium-onboarding-persistence";
import {
  OWNER_MEDIA_ACCEPT,
  removeOwnerMediaReference,
  uploadOwnerMediaReference,
  type OwnerMediaSlot,
  type OwnerMediaUploadStatus,
} from "@/lib/onboarding-v2/owner-media-upload";
import { GenerationInspector } from "@/components/generation-inspector/GenerationInspector";
import { generateSmartPageWithTraceFn } from "@/lib/generation-inspector/generation-inspector-server";
import type { GenerationTraceV1 } from "@/lib/generation-inspector/types";
import {
  appendBlackBoxStage,
  canonicalRuntimeSnapshot,
  storeBlackBoxTrace,
} from "@/lib/generation-inspector";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  buildOnboardingIntentV2,
  createEmptyOnboardingV2Draft,
  reconcileOnboardingV2Draft,
  type OnboardingV2Draft,
} from "@/components/onboarding-v2/state";
import type {
  ActionTypeV2,
  BusinessCategoryV2,
  ExperienceIntentV2,
  PrimaryGoalV2,
} from "@/lib/onboarding-v2/types";
import type {
  OwnerMenuItemInput,
  OwnerMediaReference,
  OwnerPortfolioItemInput,
  OwnerProductInput,
  OwnerServiceInput,
} from "@/lib/page-generator/owner-content";
import "./premium-onboarding.css";
import { sanitizeGenerationError } from "./generation-error";

type OfferKind = "services" | "products" | "portfolio" | "menu";
type Phase = "onboarding" | "generating" | "persisting" | "ready" | "failure";
type MediaTarget =
  | { kind: "avatar" }
  | { kind: "cover" }
  | { kind: "product"; localId: string }
  | { kind: "portfolio"; localId: string };
type MediaUploadState = {
  status: OwnerMediaUploadStatus;
  fileName?: string;
  error?: string;
};

const GENERATION_STAGES = [
  "Entendiendo tu negocio",
  "Organizando tu contenido",
  "Preparando la estructura de tu página",
  "Dando forma a tus servicios y acciones",
  "Ajustando la experiencia para tus clientes",
  "Preparando tu primera versión",
];

const GENERATION_NODES = [
  { left: "7%", top: "22%", dx: "24vw", dy: "8vh", delay: "-0.2s", accent: false },
  { left: "14%", top: "66%", dx: "21vw", dy: "-9vh", delay: "-1.5s", accent: false },
  { left: "23%", top: "12%", dx: "13vw", dy: "20vh", delay: "-2.7s", accent: true },
  { left: "30%", top: "84%", dx: "9vw", dy: "-19vh", delay: "-3.2s", accent: false },
  { left: "38%", top: "8%", dx: "4vw", dy: "22vh", delay: "-1.1s", accent: false },
  { left: "48%", top: "88%", dx: "0vw", dy: "-23vh", delay: "-2.4s", accent: true },
  { left: "56%", top: "7%", dx: "-5vw", dy: "22vh", delay: "-0.8s", accent: false },
  { left: "66%", top: "86%", dx: "-10vw", dy: "-20vh", delay: "-1.9s", accent: false },
  { left: "76%", top: "13%", dx: "-15vw", dy: "18vh", delay: "-3.5s", accent: true },
  { left: "88%", top: "28%", dx: "-23vw", dy: "8vh", delay: "-2.1s", accent: false },
  { left: "92%", top: "65%", dx: "-25vw", dy: "-7vh", delay: "-0.5s", accent: false },
  { left: "6%", top: "45%", dx: "24vw", dy: "0vh", delay: "-4s", accent: false },
  { left: "20%", top: "92%", dx: "15vw", dy: "-23vh", delay: "-2.9s", accent: false },
  { left: "82%", top: "92%", dx: "-18vw", dy: "-22vh", delay: "-1.3s", accent: false },
  { left: "96%", top: "47%", dx: "-27vw", dy: "0vh", delay: "-3.8s", accent: true },
  { left: "36%", top: "48%", dx: "10vw", dy: "-1vh", delay: "-1.7s", accent: false },
  { left: "64%", top: "50%", dx: "-10vw", dy: "1vh", delay: "-2.5s", accent: false },
  { left: "50%", top: "18%", dx: "0vw", dy: "17vh", delay: "-3.1s", accent: true },
];

interface GoalPresentation {
  id: string;
  label: string;
  caption: string;
  goal: PrimaryGoalV2;
  experienceHint: ExperienceIntentV2;
  icon: typeof MessageCircle;
  offerKind?: OfferKind;
}

const GOALS: GoalPresentation[] = [
  {
    id: "contact",
    label: "Quiero que me escriban",
    caption: "Un camino directo para conversar contigo.",
    goal: "contacts",
    experienceHint: "professional_landing",
    icon: MessageCircle,
  },
  {
    id: "bookings",
    label: "Quiero recibir reservas",
    caption: "Ideal para citas, clases y atención profesional.",
    goal: "bookings",
    experienceHint: "service_page",
    icon: CalendarCheck,
    offerKind: "services",
  },
  {
    id: "products",
    label: "Quiero mostrar mis productos",
    caption: "Organiza lo que vendes en una vista clara.",
    goal: "sell",
    experienceHint: "catalog",
    icon: Sparkles,
    offerKind: "products",
  },
  {
    id: "portfolio",
    label: "Quiero mostrar mi trabajo",
    caption: "Haz que tus proyectos hablen por ti.",
    goal: "show_portfolio",
    experienceHint: "professional_landing",
    icon: ImageIcon,
    offerKind: "portfolio",
  },
  {
    id: "menu",
    label: "Quiero mostrar mi menú",
    caption: "Platos, precios y categorías en un solo lugar.",
    goal: "show_services",
    experienceHint: "service_page",
    icon: BriefcaseBusiness,
    offerKind: "menu",
  },
  {
    id: "presence",
    label: "Quiero que encuentren mi negocio",
    caption: "Una presencia digital sencilla para empezar.",
    goal: "presence",
    experienceHint: "professional_landing",
    icon: Globe2,
  },
];

const CONTACT_METHODS: Array<{
  type: ActionTypeV2;
  label: string;
  caption: string;
  icon: typeof MessageCircle;
  contactKey: "whatsapp" | "phone" | "email" | "bookingUrl" | "externalUrl";
}> = [
  {
    type: "whatsapp",
    label: "WhatsApp",
    caption: "Mensajes directos",
    icon: MessageCircle,
    contactKey: "whatsapp",
  },
  { type: "call", label: "Teléfono", caption: "Llamadas", icon: Phone, contactKey: "phone" },
  {
    type: "email",
    label: "Email",
    caption: "Consultas por correo",
    icon: Mail,
    contactKey: "email",
  },
  {
    type: "book",
    label: "Reserva",
    caption: "Tu agenda existente",
    icon: CalendarCheck,
    contactKey: "bookingUrl",
  },
  {
    type: "website",
    label: "Sitio web",
    caption: "Un enlace externo",
    icon: Globe2,
    contactKey: "externalUrl",
  },
];

const STEP_LABELS = ["Tu negocio", "Lo que buscas", "Tu contenido", "Contacto", "Imágenes"];
const PREMIUM_TOKENS: CSSProperties = {
  "--premium-blue": "#165dff",
  "--premium-blue-dark": "#0d2a66",
  "--premium-ink": "#15213d",
  "--premium-muted": "#68738a",
  "--premium-line": "#dfe5ef",
  "--premium-surface": "#f6f8fc",
  "--premium-gold": "#d7ad45",
} as CSSProperties;

export function PremiumOnboardingFlow({
  enableInspector = false,
  profileId,
}: {
  enableInspector?: boolean;
  profileId?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingV2Draft>(createEmptyOnboardingV2Draft);
  const [intake, setIntake] = useState<OwnerContentIntakeState>(createEmptyOwnerContentIntake);
  const [selectedGoal, setSelectedGoal] = useState<GoalPresentation | null>(null);
  const [selectedContact, setSelectedContact] = useState<(typeof CONTACT_METHODS)[number] | null>(
    null,
  );
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [generation, setGeneration] = useState<OnboardingSmartPagesGenerationResult | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [mediaUploads, setMediaUploads] = useState<Record<string, MediaUploadState>>({});
  const [trace, setTrace] = useState<GenerationTraceV1 | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorHydrated, setInspectorHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [persistedPage, setPersistedPage] = useState<{
    pageId: string;
    publicId: string;
    editorPath: string;
  } | null>(null);
  const submissionInFlight = useRef(false);
  const finishRef = useRef<() => void>(() => undefined);
  const blackBoxTraceId = useRef<string | null>(null);

  useEffect(() => {
    setInspectorHydrated(true);
  }, []);

  useEffect(() => {
    if (!enableInspector) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && (event.key === "D" || event.key === "d")) {
        event.preventDefault();
        setInspectorOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableInspector]);

  const offerKind = selectedGoal?.offerKind ?? inferredOfferKind(draft.business.category);
  const ownerContent = useMemo(() => getOwnerContent(intake), [intake]);

  const patchDraft = (updater: (current: OnboardingV2Draft) => OnboardingV2Draft) => {
    setDraft((current) => reconcileOnboardingV2Draft(updater(current)));
  };

  const selectGoal = (goal: GoalPresentation) => {
    setSelectedGoal(goal);
    patchDraft((current) => ({
      ...current,
      outcome: { ...current.outcome, primaryGoal: goal.goal },
      contentNeeds: goal.offerKind
        ? {
            items: [
              {
                type:
                  goal.offerKind === "products"
                    ? "products"
                    : goal.offerKind === "portfolio"
                      ? "portfolio"
                      : goal.offerKind === "menu"
                        ? "services"
                        : "services",
              },
            ],
            userHasNoContentYet: false,
          }
        : current.contentNeeds,
    }));
    setFieldError(null);
  };

  const selectContact = (method: (typeof CONTACT_METHODS)[number]) => {
    setSelectedContact(method);
    patchDraft((current) => ({
      ...current,
      actions: {
        ...current.actions,
        primary: { type: method.type, source: "inferred", label: method.label },
      },
    }));
    setFieldError(null);
  };

  const setContactValue = (value: string) => {
    if (!selectedContact) return;
    setIntake((current) => setContact(current, { [selectedContact.contactKey]: value }));
    setFieldError(null);
  };

  const mediaKey = (target: MediaTarget): string =>
    target.kind === "avatar" || target.kind === "cover"
      ? target.kind
      : `${target.kind}-${target.localId}`;

  const mediaSlot = (target: MediaTarget): OwnerMediaSlot =>
    target.kind === "avatar" ? "avatar" : target.kind === "cover" ? "cover" : "item";

  const setMediaUploadState = (target: MediaTarget, state: MediaUploadState) => {
    setMediaUploads((current) => ({ ...current, [mediaKey(target)]: state }));
  };

  const uploadMedia = async (target: MediaTarget, file: File) => {
    setMediaUploadState(target, { status: "uploading", fileName: file.name });
    try {
      const reference = await uploadOwnerMediaReference(
        getBrowserSupabaseClient(),
        file,
        mediaSlot(target),
        file.name,
      );
      setIntake((current) => {
        if (target.kind === "avatar") return setAvatar(current, reference);
        if (target.kind === "cover") return setCover(current, reference);
        if (target.kind === "product")
          return updateProduct(current, target.localId, { media: [reference] });
        return updatePortfolioItem(current, target.localId, { media: [reference] });
      });
      patchDraft((current) => ({ ...current, media: { ...current.media, preference: "own_media" } }));
      setMediaUploadState(target, { status: "uploaded", fileName: file.name });
      setFieldError(null);
    } catch (error: unknown) {
      setMediaUploadState(target, {
        status: "failed",
        fileName: file.name,
        error: error instanceof Error ? error.message : "No se pudo subir la imagen.",
      });
    }
  };

  const removeMedia = async (target: MediaTarget, reference: Parameters<typeof removeOwnerMediaReference>[1]) => {
    setMediaUploadState(target, { status: "uploading", fileName: "Quitando imagen" });
    try {
      await removeOwnerMediaReference(getBrowserSupabaseClient(), reference, mediaSlot(target));
      setIntake((current) => {
        if (target.kind === "avatar") return setAvatar(current, null);
        if (target.kind === "cover") return setCover(current, null);
        if (target.kind === "product")
          return updateProduct(current, target.localId, { media: [] });
        return updatePortfolioItem(current, target.localId, { media: [] });
      });
      setMediaUploadState(target, { status: "idle" });
      setFieldError(null);
    } catch (error: unknown) {
      setMediaUploadState(target, {
        status: "failed",
        error: error instanceof Error ? error.message : "No se pudo quitar la imagen.",
      });
    }
  };

  const updateIdentity = (patch: Partial<OnboardingV2Draft["identity"]>) => {
    patchDraft((current) => ({ ...current, identity: { ...current.identity, ...patch } }));
    setIntake((current) =>
      setIdentity(current, {
        ...(patch.displayName !== undefined ? { businessName: patch.displayName } : {}),
        ...(patch.bio !== undefined ? { shortDescription: patch.bio } : {}),
      }),
    );
    setFieldError(null);
  };

  const goNext = useCallback(() => {
    const error = validateStep(step, draft, intake, selectedGoal, selectedContact, offerKind);
    if (error) {
      setFieldError(error);
      return;
    }
    setFieldError(null);
    setStep((current) => Math.min(STEP_LABELS.length - 1, current + 1));
  }, [draft, intake, offerKind, selectedContact, selectedGoal, step]);

  /**
   * Temporary QA fallback: lets Enter reach the same navigation handler when
   * the fixed CTA is hard to reach. It deliberately excludes textareas and
   * busy/modal states, and never bypasses validateStep inside goNext.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.isComposing || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
        return;
      if (phase !== "onboarding" || inspectorOpen) return;
      if (Object.values(mediaUploads).some((upload) => upload.status === "uploading")) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target !== document.body && !target.closest(".premium-onboarding")) return;
      if (target.closest(".gi-floating-btn, .gi-drawer, [role=dialog], dialog, [aria-modal=true]")) return;
      if (target.closest(".premium-onboarding__footer")) return;
      if (target instanceof HTMLTextAreaElement || target.isContentEditable) return;
      if (target instanceof HTMLInputElement && target.type === "file") return;
      event.preventDefault();
      if (step === STEP_LABELS.length - 1) finishRef.current();
      else goNext();
      window.setTimeout(() => {
        const error = document.querySelector<HTMLElement>('.premium-onboarding__error[role="alert"]');
        error?.focus();
      }, 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, inspectorOpen, mediaUploads, phase, step]);

  const persistGeneratedPage = (
    result: Extract<OnboardingSmartPagesGenerationResult, { ok: true }>,
  ) => {
    submissionInFlight.current = true;
    setPhase("persisting");
    setPersistenceError(null);
    void getBrowserSupabaseClient()
      .auth.getSession()
      .then(
        ({
          data: { session },
        }: {
          data: { session: { access_token?: string } | null };
        }) => {
          if (!session?.access_token) {
            throw new Error("Debes iniciar sesión para guardar tu página.");
          }
          const pageType = result.plan.experienceType;
          if (pageType === "listings") {
            throw new Error("Esta experiencia todavía no puede guardarse como página.");
          }
          return persistPremiumOnboardingGeneratedPageFn({
            data: {
              profileId: profileId?.trim() ?? "",
              editorConfig: result.result.editorConfig,
              title: result.plan.title,
              pageType,
              generation: {
                candidateId: result.result.generation.candidateId,
                score: result.result.generation.score,
                family: result.result.generation.family,
                layout: result.result.generation.layout,
              },
              accessToken: session.access_token,
            },
          });
        },
      )
      .then((persisted: PersistPremiumOnboardingGeneratedPageResult) => {
        if (persisted.status !== "PERSISTED") {
          setPersistenceError(persisted.error);
          setPhase("failure");
          submissionInFlight.current = false;
          return;
        }
        if (blackBoxTraceId.current) {
          const updated = appendBlackBoxStage(blackBoxTraceId.current, {
            id: "E19",
            name: "POST-PERSISTENCE READBACK",
            contract: "authoritative persisted canonical readback",
            status: "ok",
            data: {
              pageId: persisted.pageId,
              ...canonicalRuntimeSnapshot(persisted.editorConfig),
            },
            fields: [],
          });
          if (updated) setTrace(updated);
        }
        setPersistedPage({
          pageId: persisted.pageId,
          publicId: persisted.publicId,
          editorPath: persisted.editorPath,
        });
        setPhase("ready");
        submissionInFlight.current = false;
      })
      .catch((error: unknown) => {
        setPersistenceError(sanitizeGenerationError(error));
        setPhase("failure");
        submissionInFlight.current = false;
      });
  };

  const finish = () => {
    if (submissionInFlight.current || phase === "generating" || phase === "persisting") return;
    if (Object.values(mediaUploads).some((upload) => upload.status === "uploading")) {
      setFieldError("Espera a que termine la carga de imágenes antes de crear tu página.");
      return;
    }
    const error = validateStep(step, draft, intake, selectedGoal, selectedContact, offerKind);
    if (error) {
      setFieldError(error);
      return;
    }
    const built = buildOnboardingIntentV2(draft, new Date().toISOString(), ownerContent);
    if (!built.intent) {
      setFieldError("Revisa la información obligatoria antes de continuar.");
      return;
    }
    if (!profileId?.trim()) {
      setPersistenceError("No encontramos el perfil activo para guardar tu página.");
      setPhase("failure");
      return;
    }
    const nextIntent = selectedGoal
      ? {
          ...built.intent,
          outcome: { ...built.intent.outcome, experienceHint: selectedGoal.experienceHint },
        }
      : built.intent;
    setPhase("generating");
    setGeneration(null);
    setPersistedPage(null);
    setPersistenceError(null);
    setTrace(null);
    submissionInFlight.current = true;
    setTimeout(() => {
      const now = new Date().toISOString();
      const call = enableInspector
          ? generateSmartPageWithTraceFn({ data: { intent: nextIntent, ownerContent, now } }).then(
            (inspector) => {
              blackBoxTraceId.current = inspector.trace.traceId;
              if (!inspector.generation.ok) {
                storeBlackBoxTrace(inspector.trace);
                setTrace(inspector.trace);
                return inspector.generation;
              }
              const withPrePersistence = {
                ...inspector.trace,
                stages: [
                  ...inspector.trace.stages,
                  {
                    id: "E18" as const,
                    name: "PRE-PERSISTENCE SNAPSHOT",
                    contract: "BioTemplateConfig before persistence",
                    status: "ok" as const,
                    data: canonicalRuntimeSnapshot(inspector.generation.result.editorConfig),
                    fields: [],
                  },
                ],
              } satisfies GenerationTraceV1;
              storeBlackBoxTrace(withPrePersistence);
              setTrace(withPrePersistence);
              return inspector.generation;
            },
          )
        : generateSmartPageFromOnboardingFn({ data: { intent: nextIntent, ownerContent, now } });
      void call
        .then((result) => {
          setGeneration(result);
          if (result.ok) persistGeneratedPage(result);
          else {
            setPhase("failure");
            submissionInFlight.current = false;
          }
        })
        .catch((error: unknown) => {
          setGeneration({
            ok: false,
            errors: [sanitizeGenerationError(error)],
            diagnostics: {
              mappedFields: [],
              deferredFields: [],
              unsupportedFields: [],
              missingOwnerFacts: [],
              warnings: [],
            },
          });
          setPhase("failure");
          submissionInFlight.current = false;
        });
    }, 80);
  };

  // Keep the global QA fallback pointed at the exact final CTA handler.
  finishRef.current = finish;

  const restart = () => {
    setStep(0);
    setDraft(createEmptyOnboardingV2Draft());
    setIntake(createEmptyOwnerContentIntake());
    setSelectedGoal(null);
    setSelectedContact(null);
    setPhase("onboarding");
    setGeneration(null);
    setPersistedPage(null);
    setPersistenceError(null);
    setFieldError(null);
    setMediaUploads({});
    setTrace(null);
    setInspectorOpen(false);
  };

  const inspectorControls =
    enableInspector && inspectorHydrated ? (
      <>
        <button
          type="button"
          className="gi-floating-btn"
          onClick={() => setInspectorOpen((current) => !current)}
          title="Diagnóstico de generación (Ctrl+Shift+D)"
        >
          Diagnóstico
        </button>
        {inspectorOpen && trace && (
          <GenerationInspector trace={trace} onClose={() => setInspectorOpen(false)} />
        )}
      </>
    ) : null;

  if (
    phase === "generating" ||
    phase === "persisting" ||
    phase === "ready" ||
    phase === "failure"
  ) {
    return (
      <div className="premium-onboarding" style={PREMIUM_TOKENS}>
        {inspectorControls}
        {(phase === "generating" || phase === "persisting") && <GeneratingScreen phase={phase} />}
        {phase === "failure" && (
          <FailureScreen
            generation={generation}
            persistenceError={persistenceError}
            onRetry={() => {
              if (generation?.ok && !persistedPage) persistGeneratedPage(generation);
              else finish();
            }}
            onBack={() => {
              setPhase("onboarding");
              setStep(4);
              setFieldError(null);
              setPersistenceError(null);
              submissionInFlight.current = false;
            }}
          />
        )}
        {phase === "ready" && generation?.ok && (
          <ReadyScreen
            config={generation.result.editorConfig}
            page={persistedPage}
            onRestart={restart}
          />
        )}
      </div>
    );
  }

  return (
    <div className="premium-onboarding" style={PREMIUM_TOKENS}>
      {inspectorControls}
      <div className="premium-onboarding__shell">
        <header className="premium-onboarding__header">
          <div className="premium-onboarding__brand">
            <span className="premium-onboarding__brand-mark">
              <Sparkles size={16} />
            </span>
            <span>cripqer</span>
          </div>
          <div className="premium-onboarding__header-note">Tu primera página, con intención</div>
        </header>
        <div className="premium-onboarding__progress" aria-label="Progreso del onboarding">
          {STEP_LABELS.map((label, index) => (
            <button
              type="button"
              key={label}
              className={`premium-onboarding__progress-step ${index <= step ? "is-active" : ""}`}
              aria-current={index === step ? "step" : undefined}
              onClick={() => index < step && setStep(index)}
            >
              <span className="premium-onboarding__progress-dot">
                {index < step ? <Check size={12} /> : index + 1}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <main className="premium-onboarding__body">
          <section className="premium-onboarding__main" aria-live="polite">
            <div className="premium-onboarding__step-count">
              Paso {step + 1} de {STEP_LABELS.length}
            </div>
            {step === 0 && (
              <BusinessStep
                draft={draft}
                onIdentityChange={updateIdentity}
                onCategoryChange={(category) =>
                  patchDraft((current) => ({
                    ...current,
                    business: { ...current.business, category },
                  }))
                }
              />
            )}
            {step === 1 && <GoalStep value={selectedGoal?.id ?? null} onSelect={selectGoal} />}
            {step === 2 && (
              <OfferStep
                kind={offerKind}
                intake={intake}
                setIntake={setIntake}
                mediaUploads={mediaUploads}
                onUpload={uploadMedia}
                onRemove={removeMedia}
              />
            )}
            {step === 3 && (
              <ContactStep
                selected={selectedContact}
                intake={intake}
                onSelect={selectContact}
                onValueChange={setContactValue}
              />
            )}
            {step === 4 && (
              <ImagesStep
                draft={draft}
                intake={intake}
                mediaUploads={mediaUploads}
                onUpload={uploadMedia}
                onRemove={removeMedia}
                onPreferenceChange={(preference) =>
                  patchDraft((current) => ({ ...current, media: { ...current.media, preference } }))
                }
                onSkip={() => setFieldError(null)}
              />
            )}
            {fieldError && (
              <div className="premium-onboarding__error" role="alert" tabIndex={-1}>
                <CircleAlert size={17} />
                {fieldError}
              </div>
            )}
          </section>
          <ContextPanel step={step} offerKind={offerKind} selectedGoal={selectedGoal} />
        </main>
        <footer className="premium-onboarding__footer">
          <div className="premium-onboarding__footer-inner">
            {step > 0 ? (
              <button
                type="button"
                className="premium-button premium-button--quiet"
                onClick={() => {
                  setFieldError(null);
                  setStep((current) => current - 1);
                }}
              >
                <ArrowLeft size={17} />
                Atrás
              </button>
            ) : (
              <span />
            )}
            <span className="premium-onboarding__no-save">Tu información queda en esta sesión</span>
            {step < STEP_LABELS.length - 1 ? (
              <button
                type="button"
                className="premium-button premium-button--primary"
                onClick={goNext}
              >
                Continuar
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                className="premium-button premium-button--gold"
                onClick={finish}
              >
                <Sparkles size={17} />
                Crear mi primera versión
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function BusinessStep({
  draft,
  onIdentityChange,
  onCategoryChange,
}: {
  draft: OnboardingV2Draft;
  onIdentityChange: (patch: Partial<OnboardingV2Draft["identity"]>) => void;
  onCategoryChange: (category: BusinessCategoryV2) => void;
}) {
  return (
    <div className="premium-onboarding__content">
      <StepHeading
        eyebrow="Empecemos por lo esencial"
        title="Cuéntanos sobre tu negocio"
        description="Con esto elegimos una estructura que tenga sentido para tus clientes."
      />
      <div className="premium-onboarding__fields">
        <label>
          Nombre o nombre de marca
          <input
            autoFocus
            value={draft.identity.displayName}
            onChange={(event) => onIdentityChange({ displayName: event.target.value })}
            placeholder="Ej. Estudio Norte"
          />
        </label>
        <label>
          ¿A qué te dedicas?
          <input
            value={draft.identity.professionOrActivity}
            onChange={(event) => onIdentityChange({ professionOrActivity: event.target.value })}
            placeholder="Ej. Fotografía de bodas"
          />
        </label>
        <label className="premium-onboarding__field-wide">
          Descripción breve <span className="premium-onboarding__optional">opcional</span>
          <textarea
            value={draft.identity.bio}
            onChange={(event) => onIdentityChange({ bio: event.target.value })}
            placeholder="Una frase sobre lo que haces"
            rows={3}
          />
        </label>
      </div>
      <ChoiceGrid
        label="Categoría aproximada"
        options={BUSINESS_OPTIONS.map((option) => ({
          ...option,
          caption:
            option.id === "other" ? "Puedes escribir tu actividad" : categoryCaption(option.id),
        }))}
        value={draft.business.category}
        onSelect={onCategoryChange}
      />
    </div>
  );
}

function GoalStep({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (goal: GoalPresentation) => void;
}) {
  return (
    <div className="premium-onboarding__content">
      <StepHeading
        eyebrow="La dirección importa"
        title="¿Qué quieres conseguir con tu página?"
        description="Elige el resultado que más importa hoy. Puedes cambiarlo después."
      />
      <div className="premium-onboarding__choice-grid">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          return (
            <button
              type="button"
              key={goal.id}
              className={`premium-choice ${value === goal.id ? "is-selected" : ""}`}
              aria-pressed={value === goal.id}
              onClick={() => onSelect(goal)}
            >
              <span className="premium-choice__icon">
                <Icon size={23} />
              </span>
              <span className="premium-choice__copy">
                <strong>{goal.label}</strong>
                <small>{goal.caption}</small>
              </span>
              <span className="premium-choice__check">
                {value === goal.id ? <Check size={15} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OfferStep({
  kind,
  intake,
  setIntake,
  mediaUploads,
  onUpload,
  onRemove,
}: {
  kind: OfferKind;
  intake: OwnerContentIntakeState;
  setIntake: (updater: (current: OwnerContentIntakeState) => OwnerContentIntakeState) => void;
  mediaUploads: Record<string, MediaUploadState>;
  onUpload: (target: MediaTarget, file: File) => void;
  onRemove: (target: MediaTarget, reference: OwnerMediaReference | undefined) => void;
}) {
  const labels: Record<OfferKind, { title: string; description: string; add: string }> = {
    services: {
      title: "¿Qué servicios ofreces?",
      description: "Agrega los más importantes. Con uno basta para comenzar.",
      add: "Añadir servicio",
    },
    products: {
      title: "¿Qué productos quieres mostrar?",
      description: "Conserva los nombres y precios que tus clientes reconocen.",
      add: "Añadir producto",
    },
    portfolio: {
      title: "¿Qué trabajos quieres mostrar?",
      description: "Agrega proyectos reales. La imagen y el enlace podrán completarse después.",
      add: "Añadir trabajo",
    },
    menu: {
      title: "¿Qué tienes en tu menú?",
      description: "Platos, precios y categorías, sin inventar nada.",
      add: "Añadir plato",
    },
  };
  const config = labels[kind];
  return (
    <div className="premium-onboarding__content">
      <StepHeading
        eyebrow="Tu información real"
        title={config.title}
        description={config.description}
      />
      <div className="premium-offer-list">
        {kind === "services" &&
          intake.services.map((item) => (
            <ServiceCard
              key={item.localId}
              item={item.value}
              onChange={(patch) =>
                setIntake((current) => updateService(current, item.localId, patch))
              }
              onRemove={() => setIntake((current) => removeService(current, item.localId))}
            />
          ))}
        {kind === "products" &&
          intake.products.map((item) => (
            <ProductCard
              key={item.localId}
              item={item.value}
              onChange={(patch) =>
                setIntake((current) => updateProduct(current, item.localId, patch))
              }
              onRemove={() => setIntake((current) => removeProduct(current, item.localId))}
              media={item.value.media?.[0]}
              mediaUpload={mediaUploads[`product-${item.localId}`]}
              mediaTarget={{ kind: "product", localId: item.localId }}
              onUpload={onUpload}
              onMediaRemove={onRemove}
            />
          ))}
        {kind === "portfolio" &&
          intake.portfolioItems.map((item) => (
            <PortfolioCard
              key={item.localId}
              item={item.value}
              onChange={(patch) =>
                setIntake((current) => updatePortfolioItem(current, item.localId, patch))
              }
              onRemove={() => setIntake((current) => removePortfolioItem(current, item.localId))}
              media={item.value.media?.[0]}
              mediaUpload={mediaUploads[`portfolio-${item.localId}`]}
              mediaTarget={{ kind: "portfolio", localId: item.localId }}
              onUpload={onUpload}
              onMediaRemove={onRemove}
            />
          ))}
        {kind === "menu" &&
          intake.menuItems.map((item) => (
            <MenuCard
              key={item.localId}
              item={item.value}
              onChange={(patch) =>
                setIntake((current) => updateMenuItem(current, item.localId, patch))
              }
              onRemove={() => setIntake((current) => removeMenuItem(current, item.localId))}
            />
          ))}
        {intakeCollectionLength(intake, kind) === 0 && (
          <div className="premium-onboarding__empty">
            <ImageIcon size={22} />
            <span>Aún no hay información aquí. Añade al menos una entrada para continuar.</span>
          </div>
        )}
      </div>
      <button
        type="button"
        className="premium-add-button"
        onClick={() => setIntake((current) => addOffer(current, kind))}
      >
        <Plus size={17} />
        {config.add}
      </button>
      <p className="premium-onboarding__truth-note">
        <Check size={15} />
        Los precios y textos son opcionales. Solo usaremos lo que escribas.
      </p>
    </div>
  );
}

function ContactStep({
  selected,
  intake,
  onSelect,
  onValueChange,
}: {
  selected: (typeof CONTACT_METHODS)[number] | null;
  intake: OwnerContentIntakeState;
  onSelect: (method: (typeof CONTACT_METHODS)[number]) => void;
  onValueChange: (value: string) => void;
}) {
  const value = selected ? (intake.contact[selected.contactKey] ?? "") : "";
  return (
    <div className="premium-onboarding__content">
      <StepHeading
        eyebrow="Hazlo fácil para tus clientes"
        title="¿Cómo quieres que te contacten?"
        description="Elegir una intención no inventa un destino: añadiremos solo el dato real que entregues."
      />
      <div className="premium-onboarding__contact-grid">
        {CONTACT_METHODS.map((method) => {
          const Icon = method.icon;
          return (
            <button
              type="button"
              key={method.type}
              className={`premium-choice premium-choice--compact ${selected?.type === method.type ? "is-selected" : ""}`}
              aria-pressed={selected?.type === method.type}
              onClick={() => onSelect(method)}
            >
              <span className="premium-choice__icon">
                <Icon size={21} />
              </span>
              <span className="premium-choice__copy">
                <strong>{method.label}</strong>
                <small>{method.caption}</small>
              </span>
              <span className="premium-choice__check">
                {selected?.type === method.type ? <Check size={15} /> : null}
              </span>
            </button>
          );
        })}
      </div>
      {selected && (
        <label className="premium-onboarding__contact-input">
          {selected.label}
          <input
            autoFocus
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={contactPlaceholder(selected.type)}
            type={
              selected.type === "email"
                ? "email"
                : selected.type === "website" || selected.type === "book"
                  ? "url"
                  : "tel"
            }
          />
        </label>
      )}
    </div>
  );
}

function ImagesStep({
  draft,
  intake,
  mediaUploads,
  onUpload,
  onRemove,
  onPreferenceChange,
  onSkip,
}: {
  draft: OnboardingV2Draft;
  intake: OwnerContentIntakeState;
  mediaUploads: Record<string, MediaUploadState>;
  onUpload: (target: MediaTarget, file: File) => void;
  onRemove: (target: MediaTarget, reference: OwnerMediaReference | undefined) => void;
  onPreferenceChange: (preference: NonNullable<OnboardingV2Draft["media"]["preference"]>) => void;
  onSkip: () => void;
}) {
  return (
    <div className="premium-onboarding__content">
      <StepHeading
        eyebrow="El último toque"
        title="Tu negocio debe sentirse tuyo"
        description="Puedes añadir imágenes duraderas cuando estén listas. Por ahora, no guardaremos archivos temporales."
      />
      <div className="premium-onboarding__media-grid">
        <MediaUploadField
          label="Portada"
          target={{ kind: "cover" }}
          media={intake.media.cover}
          uploadState={mediaUploads["cover"]}
          onUpload={onUpload}
          onRemove={onRemove}
        />
        <MediaUploadField
          label="Avatar"
          target={{ kind: "avatar" }}
          media={intake.media.avatar}
          uploadState={mediaUploads["avatar"]}
          onUpload={onUpload}
          onRemove={onRemove}
        />
      </div>
      <ChoiceGrid
        label="¿Cómo quieres empezar?"
        options={DENSITY_OPTIONS}
        value={
          draft.media.preference === "own_media"
            ? "complete"
            : draft.media.preference === "minimal_media"
              ? "simple"
              : draft.media.preference === "no_preference"
                ? "auto"
                : null
        }
        onSelect={(id) => {
          onPreferenceChange(
            id === "complete" ? "own_media" : id === "simple" ? "minimal_media" : "no_preference",
          );
          onSkip();
        }}
      />
      <p className="premium-onboarding__skip-note">
        <Check size={15} />
        Puedes omitir las imágenes ahora. Las imágenes subidas se guardan en el almacenamiento
        seguro de tu cuenta. No exportaremos `blob:` ni imágenes de muestra.
      </p>
    </div>
  );
}

function MediaUploadField({
  label,
  target,
  media,
  uploadState,
  onUpload,
  onRemove,
}: {
  label: string;
  target: MediaTarget;
  media: OwnerMediaReference | undefined;
  uploadState: MediaUploadState | undefined;
  onUpload: (target: MediaTarget, file: File) => void;
  onRemove: (target: MediaTarget, reference: OwnerMediaReference | undefined) => void;
}) {
  const busy = uploadState?.status === "uploading";
  return (
    <div className="premium-onboarding__media-card">
      <div className="premium-onboarding__media-icon">
        {media ? (
          <img src={media.url} alt={media.alt ?? label} />
        ) : (
          <Upload size={24} />
        )}
      </div>
      <div className="premium-onboarding__media-copy">
        <strong>{label}</strong>
        <p>{media ? "Imagen durable lista para tu página." : "JPG, PNG o WebP · máximo 3–4 MB."}</p>
        {busy && <span role="status">Subiendo imagen…</span>}
        {uploadState?.status === "uploaded" && <span role="status">Imagen subida</span>}
        {uploadState?.status === "failed" && (
          <span className="premium-onboarding__media-error" role="alert">
            {uploadState.error ?? "No se pudo subir la imagen."}
          </span>
        )}
      </div>
      <div className="premium-onboarding__media-actions">
        <label className="premium-button premium-button--quiet premium-file-button">
          <Upload size={16} />
          {media ? "Reemplazar" : uploadState?.status === "failed" ? "Reintentar" : "Elegir archivo"}
          <input
            type="file"
            accept={OWNER_MEDIA_ACCEPT}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(target, file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {media && (
          <button
            type="button"
            className="premium-button premium-button--quiet"
            disabled={busy}
            onClick={() => onRemove(target, media)}
          >
            <Trash2 size={16} />
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

function GeneratingScreen({ phase }: { phase: "generating" | "persisting" }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStage((current) => (current + 1) % GENERATION_STAGES.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="premium-state premium-state--dark premium-generation" data-stage={stage}>
      <div className="premium-generation__visual" aria-hidden="true">
        <svg className="premium-generation__links" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M7 22 C26 18 35 32 50 50" />
          <path d="M14 66 C27 61 37 55 50 50" />
          <path d="M23 12 C31 25 39 38 50 50" />
          <path d="M30 84 C37 70 43 61 50 50" />
          <path d="M76 13 C69 25 60 40 50 50" />
          <path d="M88 28 C74 33 63 42 50 50" />
          <path d="M92 65 C77 62 65 56 50 50" />
          <path d="M82 92 C69 78 60 63 50 50" />
        </svg>
        <div className="premium-generation__page">
          <div className="premium-generation__browser-bar">
            <span />
            <span />
            <span />
            <b>cripqer</b>
          </div>
          <div className="premium-generation__hero-fragment">
            <span className="premium-generation__line premium-generation__line--long" />
            <span className="premium-generation__line premium-generation__line--short" />
            <span className="premium-generation__media-fragment" />
          </div>
          <div className="premium-generation__cards">
            <span />
            <span />
            <span />
          </div>
          <span className="premium-generation__cta-fragment" />
          <span className="premium-generation__sweep" />
        </div>
        <div className="premium-generation__nodes">
          {GENERATION_NODES.map((node, index) => (
            <span
              key={index}
              className={`premium-generation__node${node.accent ? " premium-generation__node--accent" : ""}`}
              style={
                {
                  left: node.left,
                  top: node.top,
                  "--node-dx": node.dx,
                  "--node-dy": node.dy,
                  animationDelay: node.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className="premium-state__mark premium-generation__mark">
          <img src="/brand-assets/cripqer-mark.png" alt="" />
        </div>
      </div>
      <p className="premium-state__eyebrow">
        {phase === "persisting" ? "Guardando tu página" : "Cripqer Page Assembly"}
      </p>
      <h1>
        {phase === "persisting" ? "Estamos guardando tu página" : "Estamos construyendo tu página"}
      </h1>
      <p className="premium-state__description">
        {phase === "persisting"
          ? "La versión validada se está asociando a tu perfil y quedará disponible en tu editor."
          : "Estamos organizando lo que compartiste para preparar una primera versión clara para tus clientes."}
      </p>
      <div
        className="premium-state__status premium-generation__status"
        role="status"
        aria-live="polite"
      >
        <span className="premium-pulse" />
        <span key={stage} className="premium-generation__status-copy">
          {phase === "persisting" ? "Guardando documento canónico" : `${GENERATION_STAGES[stage]}…`}
        </span>
      </div>
      <p className="premium-generation__note">
        La construcción continúa hasta que tu página esté lista.
      </p>
    </div>
  );
}

function FailureScreen({
  generation,
  persistenceError,
  onRetry,
  onBack,
}: {
  generation: OnboardingSmartPagesGenerationResult | null;
  persistenceError: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const message = sanitizeGenerationError(
    persistenceError ?? (generation && !generation.ok ? generation.errors[0] : undefined),
  );
  const missing = generation && !generation.ok ? generation.diagnostics.missingOwnerFacts : [];
  return (
    <div className="premium-state premium-state--failure">
      <div className="premium-state__mark premium-state__mark--error">
        <CircleAlert size={28} />
      </div>
      <p className="premium-state__eyebrow">Necesitamos revisar un dato</p>
      <h1>No pudimos crear tu página todavía</h1>
      <p className="premium-state__description">{message}</p>
      {missing.length > 0 && (
        <div className="premium-state__missing">
          <strong>Falta completar:</strong>
          {missing.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
      <div className="premium-state__actions">
        <button type="button" className="premium-button premium-button--primary" onClick={onBack}>
          <ArrowLeft size={17} />
          Volver a revisar
        </button>
        <button type="button" className="premium-button premium-button--quiet" onClick={onRetry}>
          <RotateCcw size={17} />
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

function ReadyScreen({
  config,
  page,
  onRestart,
}: {
  config: BioTemplateConfig;
  page: { pageId: string; publicId: string; editorPath: string } | null;
  onRestart: () => void;
}) {
  return (
    <div className="premium-ready">
      <div className="premium-ready__intro">
        <div className="premium-state__mark premium-state__mark--success">
          <Check size={28} />
        </div>
        <p className="premium-state__eyebrow">Página creada</p>
        <h1>Tu página está lista</h1>
        <p>La versión validada ya está guardada. Puedes revisarla y cambiarla en el editor.</p>
      </div>
      <div className="premium-ready__preview">
        <div className="premium-ready__preview-label">
          <span>Vista previa real</span>
          <small>BioTemplateConfig · Renderer Cripqer</small>
        </div>
        <div className="premium-ready__canvas">
          <PublicTemplateRenderer config={config} breakpoint="desktop" />
        </div>
      </div>
      <div className="premium-ready__actions">
        {page && (
          <button
            type="button"
            className="premium-button premium-button--primary"
            onClick={() => window.location.assign(page.editorPath)}
          >
            <ArrowRight size={17} />
            Abrir editor
          </button>
        )}
        <button
          type="button"
          className="premium-button premium-button--gold"
          onClick={() =>
            document
              .querySelector(".premium-ready__preview")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <ImageIcon size={17} />
          Ver vista previa
        </button>
        <button type="button" className="premium-button premium-button--quiet" onClick={onRestart}>
          <RotateCcw size={17} />
          Empezar otra vez
        </button>
      </div>
      <p className="premium-ready__truth">
        Tu página está guardada como borrador. Aún no está publicada ni tiene una URL pública.
      </p>
    </div>
  );
}

function ContextPanel({
  step,
  offerKind,
  selectedGoal,
}: {
  step: number;
  offerKind: OfferKind;
  selectedGoal: GoalPresentation | null;
}) {
  const contextItems = [
    {
      eyebrow: "Tu base",
      title: "Una página que parte de ti",
      body: "No necesitas saber de diseño. Cuéntanos lo esencial y organizaremos la primera versión.",
    },
    {
      eyebrow: "Tu objetivo",
      title: selectedGoal?.label ?? "Elige el resultado más importante",
      body: "La estructura se adapta a lo que quieres que tus clientes hagan después.",
    },
    {
      eyebrow: "Datos reales",
      title: offerKind === "portfolio" ? "Tu trabajo merece contexto" : "Con un dato real basta",
      body: "Los nombres, descripciones y precios que escribas pasan al contenido. Lo que falte, queda pendiente.",
    },
    {
      eyebrow: "Siguiente paso",
      title: "La acción y el destino son distintos",
      body: "Decir “WhatsApp” no crea un número. Solo usaremos el contacto que realmente entregues.",
    },
    {
      eyebrow: "Identidad",
      title: "Las imágenes pueden esperar",
      body: "Puedes continuar sin archivos. No convertiremos una previsualización temporal en contenido permanente.",
    },
  ];
  const content = contextItems[step] ?? contextItems[0]!;
  return (
    <aside className="premium-context">
      <div className="premium-context__glow" />
      <div className="premium-context__icon">
        <Sparkles size={19} />
      </div>
      <p className="premium-context__eyebrow">{content.eyebrow}</p>
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <div className="premium-context__points">
        <span>
          <Check size={14} />
          Sin plantillas genéricas
        </span>
        <span>
          <Check size={14} />
          Puedes cambiarlo después
        </span>
      </div>
    </aside>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="premium-step-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{description}</span>
    </div>
  );
}

function ChoiceGrid<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: OnboardingChoice<T>[];
  value: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="premium-choice-section">
      <div className="premium-choice-section__label">{label}</div>
      <div className="premium-onboarding__choice-grid premium-onboarding__choice-grid--business">
        {options.map((option) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === option.id}
            key={option.id}
            className={`premium-choice premium-choice--small ${value === option.id ? "is-selected" : ""}`}
            onClick={() => onSelect(option.id)}
          >
            <span className="premium-choice__copy">
              <strong>{option.label}</strong>
              {option.caption && <small>{option.caption}</small>}
            </span>
            <span className="premium-choice__check">
              {value === option.id ? <Check size={15} /> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ServiceCard({
  item,
  onChange,
  onRemove,
}: {
  item: OwnerServiceInput;
  onChange: (patch: Partial<OwnerServiceInput>) => void;
  onRemove: () => void;
}) {
  return (
    <OfferCard
      title="Servicio"
      name={item.name}
      description={item.description}
      price={item.price}
      onChange={onChange as (patch: OfferPatch) => void}
      onRemove={onRemove}
    />
  );
}
function ProductCard({
  item,
  onChange,
  onRemove,
  media,
  mediaUpload,
  mediaTarget,
  onUpload,
  onMediaRemove,
}: {
  item: OwnerProductInput;
  onChange: (patch: Partial<OwnerProductInput>) => void;
  onRemove: () => void;
  media: OwnerMediaReference | undefined;
  mediaUpload: MediaUploadState | undefined;
  mediaTarget: MediaTarget;
  onUpload: (target: MediaTarget, file: File) => void;
  onMediaRemove: (target: MediaTarget, reference: OwnerMediaReference | undefined) => void;
}) {
  return (
    <OfferCard
      title="Producto"
      name={item.name}
      description={item.description}
      price={item.price}
      destination={item.destination ?? ""}
      media={media}
      mediaUpload={mediaUpload}
      mediaTarget={mediaTarget}
      onUpload={onUpload}
      onMediaRemove={onMediaRemove}
      onChange={onChange as (patch: OfferPatch) => void}
      onRemove={onRemove}
    />
  );
}
function PortfolioCard({
  item,
  onChange,
  onRemove,
  media,
  mediaUpload,
  mediaTarget,
  onUpload,
  onMediaRemove,
}: {
  item: OwnerPortfolioItemInput;
  onChange: (patch: Partial<OwnerPortfolioItemInput>) => void;
  onRemove: () => void;
  media: OwnerMediaReference | undefined;
  mediaUpload: MediaUploadState | undefined;
  mediaTarget: MediaTarget;
  onUpload: (target: MediaTarget, file: File) => void;
  onMediaRemove: (target: MediaTarget, reference: OwnerMediaReference | undefined) => void;
}) {
  return (
    <OfferCard
      title="Trabajo"
      name={item.name}
      description={item.description}
      destination={item.destination ?? ""}
      media={media}
      mediaUpload={mediaUpload}
      mediaTarget={mediaTarget}
      onUpload={onUpload}
      onMediaRemove={onMediaRemove}
      onChange={onChange as (patch: OfferPatch) => void}
      onRemove={onRemove}
    />
  );
}
function MenuCard({
  item,
  onChange,
  onRemove,
}: {
  item: OwnerMenuItemInput;
  onChange: (patch: Partial<OwnerMenuItemInput>) => void;
  onRemove: () => void;
}) {
  return (
    <OfferCard
      title="Plato"
      name={item.name}
      description={item.description}
      price={item.price}
      category={item.category}
      onChange={onChange as (patch: OfferPatch) => void}
      onRemove={onRemove}
    />
  );
}

type OfferPatch = {
  name?: string | undefined;
  description?: string | undefined;
  price?: string | undefined;
  destination?: string | undefined;
  category?: string | undefined;
};
function OfferCard({
  title,
  name,
  description,
  price,
  destination,
  category,
  media,
  mediaUpload,
  mediaTarget,
  onUpload,
  onMediaRemove,
  onChange,
  onRemove,
}: {
  title: string;
  name: string;
  description?: string | undefined;
  price?: string | undefined;
  destination?: string | undefined;
  category?: string | undefined;
  media?: OwnerMediaReference | undefined;
  mediaUpload?: MediaUploadState | undefined;
  mediaTarget?: MediaTarget | undefined;
  onUpload?: ((target: MediaTarget, file: File) => void) | undefined;
  onMediaRemove?: ((target: MediaTarget, reference: OwnerMediaReference | undefined) => void) | undefined;
  onChange: (patch: OfferPatch) => void;
  onRemove: () => void;
}) {
  return (
    <div className="premium-offer-card">
      <div className="premium-offer-card__top">
        <span>{title}</span>
        <button type="button" aria-label={`Eliminar ${title.toLowerCase()}`} onClick={onRemove}>
          <Trash2 size={16} />
        </button>
      </div>
      <div className="premium-offer-card__fields">
        <input
          aria-label={`${title} nombre`}
          value={name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Nombre"
        />
        <input
          aria-label={`${title} precio opcional`}
          value={price ?? ""}
          onChange={(event) => onChange({ price: event.target.value })}
          placeholder="Precio (opcional)"
        />
        <input
          aria-label={`${title} descripción opcional`}
          value={description ?? ""}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Descripción (opcional)"
        />
        {category !== undefined && (
          <input
            aria-label={`${title} categoría opcional`}
            value={category}
            onChange={(event) => onChange({ category: event.target.value })}
            placeholder="Categoría (opcional)"
          />
        )}
        {destination !== undefined && (
          <input
            aria-label={`${title} enlace opcional`}
            value={destination}
            onChange={(event) => onChange({ destination: event.target.value })}
            placeholder="Enlace real (opcional)"
          />
        )}
      </div>
      {mediaTarget && onUpload && onMediaRemove && (
        <MediaUploadField
          label="Imagen del producto"
          target={mediaTarget}
          media={media}
          uploadState={mediaUpload}
          onUpload={onUpload}
          onRemove={onMediaRemove}
        />
      )}
    </div>
  );
}

function inferredOfferKind(category: BusinessCategoryV2 | null): OfferKind {
  return category === "retail"
    ? "products"
    : category === "food"
      ? "menu"
      : category === "creator"
        ? "portfolio"
        : "services";
}
function categoryCaption(id: string): string {
  return id === "retail"
    ? "Productos y catálogo"
    : id === "food"
      ? "Menú y gastronomía"
      : id === "creator"
        ? "Trabajo creativo"
        : "Una base flexible";
}
function intakeCollectionLength(intake: OwnerContentIntakeState, kind: OfferKind): number {
  return kind === "services"
    ? intake.services.length
    : kind === "products"
      ? intake.products.length
      : kind === "portfolio"
        ? intake.portfolioItems.length
        : intake.menuItems.length;
}
function addOffer(state: OwnerContentIntakeState, kind: OfferKind): OwnerContentIntakeState {
  if (kind === "services") return addService(state, { name: "" });
  if (kind === "products") return addProduct(state, { name: "" });
  if (kind === "portfolio") return addPortfolioItem(state, { name: "" });
  return addMenuItem(state, { name: "" });
}
function contactPlaceholder(type: ActionTypeV2): string {
  if (type === "whatsapp" || type === "call") return "+56 9 1234 5678";
  if (type === "email") return "hola@tunegocio.cl";
  if (type === "book") return "https://agenda.tunegocio.cl";
  return "https://tunegocio.cl";
}
function validateStep(
  step: number,
  draft: OnboardingV2Draft,
  intake: OwnerContentIntakeState,
  goal: GoalPresentation | null,
  contact: (typeof CONTACT_METHODS)[number] | null,
  kind: OfferKind,
): string | null {
  if (step === 0) {
    if (draft.identity.displayName.trim().length < 2)
      return "Escribe el nombre con el que te conocen tus clientes.";
    if (draft.identity.professionOrActivity.trim().length < 2)
      return "Cuéntanos brevemente a qué te dedicas.";
    if (!draft.business.category) return "Elige una categoría aproximada.";
  }
  if (step === 1 && !goal) return "Elige el resultado que más te importa.";
  if (step === 2 && intakeCollectionLength(intake, kind) === 0)
    return "Añade al menos una entrada de contenido real.";
  if (step === 2 && !hasNamedItem(intake, kind))
    return "Completa el nombre de al menos una entrada.";
  if (step === 3 && !contact) return "Elige una forma de contacto.";
  if (step === 3 && contact && !String(intake.contact[contact.contactKey] ?? "").trim())
    return `Completa tu ${contact.label.toLowerCase()} para poder mostrarlo.`;
  if (step === 4 && !draft.media.preference)
    return "Elige una opción para las imágenes, aunque sea continuar sin ellas.";
  return null;
}
function hasNamedItem(intake: OwnerContentIntakeState, kind: OfferKind): boolean {
  const values =
    kind === "services"
      ? intake.services
      : kind === "products"
        ? intake.products
        : kind === "portfolio"
          ? intake.portfolioItems
          : intake.menuItems;
  return values.some((item) => item.value.name.trim().length > 0);
}
