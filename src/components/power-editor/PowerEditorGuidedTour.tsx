import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";

const STORAGE_KEY = "cripqer.power-editor.guided-onboarding.v1";

type TourStep = {
  title: string;
  message: string;
  target: string;
  requiresInteraction: boolean;
};

const STEPS: TourStep[] = [
  {
    title: "Cambia el diseño",
    message: "Aquí puedes cambiar completamente el diseño de tu página.",
    target: "[data-tour-template-selector]",
    requiresInteraction: true,
  },
  {
    title: "Edita tu página",
    message: "Toca un texto, enlace, botón o imagen para cambiarlo.",
    target: "[data-block-id], [data-editor-target]",
    requiresInteraction: true,
  },
  {
    title: "Añade elementos",
    message: "Desde aquí puedes añadir y organizar elementos de tu página.",
    target: "[data-tour-tools-panel]",
    requiresInteraction: false,
  },
  {
    title: "Ajusta el estilo",
    message: "Aquí cambias colores, letras, botones y apariencia.",
    target: "[data-tour-style-panel]",
    requiresInteraction: false,
  },
  {
    title: "Listo para personalizar",
    message: "Tu página ya está lista para personalizar. Puedes volver a estas herramientas cuando quieras.",
    target: "[data-testid=power-editor]",
    requiresInteraction: false,
  },
];

function isCompleted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

function markCompleted(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "completed");
  } catch {
    // A restricted storage environment must not block editor usage.
  }
}

export function PowerEditorGuidedTour({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (enabled && !isCompleted()) setOpen(true);
  }, [enabled]);

  const current = STEPS[step];
  const selector = useMemo(() => current?.target ?? "", [current]);

  useEffect(() => {
    if (!open || !current) return;
    const update = () => {
      const target = document.querySelector<HTMLElement>(selector);
      setRect(target?.getBoundingClientRect() ?? null);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [current, open, selector]);

  useEffect(() => {
    if (!open || !current?.requiresInteraction) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-tour-overlay]")) return;
      const option = target?.closest<HTMLElement>("[data-tour-template-option]");
      if (
        step === 0 &&
        option &&
        !option.hasAttribute("disabled") &&
        option.getAttribute("aria-disabled") !== "true" &&
        option.getAttribute("data-tour-template-option-active") !== "true"
      ) {
        setStep(1);
      } else if (step === 1 && target?.closest("[data-block-id], [data-editor-target]")) {
        setStep(2);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [open, current, step]);

  if (!enabled || !open || !current) return null;

  const finish = () => {
    markCompleted();
    setOpen(false);
  };
  const next = () => {
    if (current.requiresInteraction) return;
    if (step === STEPS.length - 1) finish();
    else setStep((value) => value + 1);
  };
  const bubbleStyle = rect
    ? {
        top: Math.min(Math.max(rect.bottom + 14, 72), Math.max(72, window.innerHeight - 190)),
        left: Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - 336)),
      }
    : { top: 88, left: 16 };

  return (
    <>
      {rect && (
        <div
          aria-hidden
          data-tour-overlay
          style={{
            position: "fixed",
            top: rect.top - 5,
            left: rect.left - 5,
            width: rect.width + 10,
            height: rect.height + 10,
            zIndex: 90,
            pointerEvents: "none",
            border: "2px solid #d4af37",
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(9,9,9,.28)",
          }}
        />
      )}
      <aside
        role="dialog"
        aria-label="Guía del Power Editor"
        data-tour-overlay
        style={{
          position: "fixed",
          ...bubbleStyle,
          zIndex: 91,
          width: "min(320px, calc(100vw - 32px))",
          borderRadius: 16,
          border: "1px solid rgba(212,175,55,.45)",
          background: "#111111",
          color: "#fff",
          padding: 18,
          boxShadow: "0 16px 40px rgba(0,0,0,.28)",
        }}
      >
        <button
          type="button"
          aria-label="Saltar guía"
          onClick={finish}
          style={{ position: "absolute", right: 10, top: 10, color: "#aaa" }}
        >
          <X size={16} />
        </button>
        <p style={{ color: "#d4af37", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>
          Guía {step + 1} de {STEPS.length}
        </p>
        <h2 style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{current.title}</h2>
        <p style={{ marginTop: 6, color: "#d0d0d0", fontSize: 13, lineHeight: 1.5 }}>{current.message}</p>
        {current.requiresInteraction ? (
          <p style={{ marginTop: 12, color: "#d4af37", fontSize: 12 }}>Prueba esta acción para continuar.</p>
        ) : (
          <button
            type="button"
            onClick={next}
            style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 9, background: "#d4af37", color: "#111", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}
          >
            {step === STEPS.length - 1 ? <Check size={14} /> : <ArrowRight size={14} />}
            {step === STEPS.length - 1 ? "Terminar" : "Siguiente"}
          </button>
        )}
        <button type="button" onClick={finish} style={{ marginLeft: 12, color: "#aaa", fontSize: 12 }}>
          Saltar
        </button>
      </aside>
    </>
  );
}
