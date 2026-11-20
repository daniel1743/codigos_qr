import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { markCreationIntent } from "../landing-lite/creationIntent";

/**
 * Guest Editor V1 - the contextual signup gate (G5).
 *
 * Shown ONLY when the visitor asks for something that needs an account (save,
 * publish, share, QR, permanent media). It never blocks free editing: closing it
 * returns to the editor with the draft intact, and the copy promises nothing
 * premium and mentions no payment.
 */
export interface GuestSignupModalProps {
  open: boolean;
  /** Which action asked for the account; drives the copy of the blocker line. */
  reason?: "save" | "publish" | "share" | "qr" | "media";
  /** Called before leaving so the caller can persist the draft first. */
  onBeforeLeave: () => void;
  onClose: () => void;
}

export const GUEST_SIGNUP_COPY = {
  title: "Tu tarjeta está tomando forma",
  message:
    "Crea una cuenta gratuita para guardar tu diseño y continuar cuando quieras. No necesitas pagar nada.",
  primary: "Crear cuenta gratis",
  secondary: "Seguir diseñando",
  existingUser: "Ya tengo una cuenta",
} as const;

const REASON_LINE: Record<NonNullable<GuestSignupModalProps["reason"]>, string> = {
  save: "Para guardar tu tarjeta en tu cuenta.",
  publish: "Para publicar tu tarjeta y compartir su enlace.",
  share: "Para compartir tu tarjeta con un enlace propio.",
  qr: "Para generar el QR permanente de tu tarjeta.",
  media: "Para guardar tus fotos de forma permanente.",
};

export function GuestSignupModal({
  open,
  reason = "save",
  onBeforeLeave,
  onClose,
}: GuestSignupModalProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  /**
   * Leaving for the registration flow: the intent is recorded first and the caller
   * persists the draft, so the work is not lost while the visitor authenticates.
   */
  const goToAuth = (mode: "register" | undefined) => {
    onBeforeLeave();
    markCreationIntent();
    void navigate({ to: "/login", search: { mode } });
  };

  return (
    <div
      role="presentation"
      data-testid="guest-signup-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(9,9,12,0.55)] p-4 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-signup-title"
        aria-describedby="guest-signup-message"
        data-testid="guest-signup-modal"
        className="w-full max-w-[420px] rounded-2xl bg-white p-5 text-[#111111] shadow-[0_30px_70px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="guest-signup-title" className="text-[19px] font-semibold leading-tight">
            {GUEST_SIGNUP_COPY.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Cerrar"
            data-testid="guest-signup-close"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F4F5F7] text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        <p id="guest-signup-message" className="mt-2 text-[14px] leading-relaxed text-[#4c4c4a]">
          {GUEST_SIGNUP_COPY.message}
        </p>
        <p
          data-testid="guest-signup-reason"
          className="mt-2 text-[13px] font-medium text-[#3a3d45]"
        >
          {REASON_LINE[reason]}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            data-testid="guest-signup-primary"
            onClick={() => goToAuth("register")}
            className="w-full rounded-xl bg-[#15171c] px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {GUEST_SIGNUP_COPY.primary}
          </button>
          <button
            type="button"
            data-testid="guest-signup-secondary"
            onClick={onClose}
            className="w-full rounded-xl border border-[#e6e8ec] px-4 py-3 text-[14px] font-medium text-[#111111] hover:border-[#CDD1D7]"
          >
            {GUEST_SIGNUP_COPY.secondary}
          </button>
          <button
            type="button"
            data-testid="guest-signup-existing"
            onClick={() => goToAuth(undefined)}
            className="w-full rounded-xl px-4 py-2 text-[13px] font-medium text-[#1e4fd8]"
          >
            {GUEST_SIGNUP_COPY.existingUser}
          </button>
        </div>

        <p className="mt-3 text-[12px] leading-snug text-[#6b7079]">
          Tu borrador se queda en este navegador: al cerrar esto sigues editando donde estabas.
        </p>
      </div>
    </div>
  );
}
