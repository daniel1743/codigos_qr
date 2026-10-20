import React, { useEffect, useRef } from 'react';

interface DraftConflictDialogProps {
  open: boolean;
  busy?: boolean;
  /** "Usar este nuevo diseño" — replaces the existing DRAFT. */
  onUseNewDesign: () => void;
  /** "Abrir mi página actual" — navigates without writing anything. */
  onOpenCurrent: () => void;
  onClose: () => void;
}

/**
 * Phase 9 — confirmation before replacing an existing landing's draft.
 *
 * The conversation never overwrites work that is already there: when the owner
 * already has a landing WITH a draft, this dialog states exactly what would be
 * replaced (the draft) and what would not (anything already published, which is
 * untouched until the user publishes from the real editor).
 */
export function DraftConflictDialog({
  open,
  busy = false,
  onUseNewDesign,
  onOpenCurrent,
  onClose
}: DraftConflictDialogProps) {
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-conflict-title"
        className="relative w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-2xl">

        <h2 id="draft-conflict-title" className="text-[17px] font-semibold text-ink">
          Ya tienes una página
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Vamos a reemplazar el <strong className="font-semibold text-ink">borrador</strong> de tu
          página actual con el diseño que acabas de crear en la conversación. Lo que ya
          publicaste no cambia hasta que pulses Publicar.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onOpenCurrent}
            className="h-10 whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.12)] transition-colors duration-150 hover:bg-canvas disabled:opacity-50">

            Abrir mi página actual
          </button>
          <button
            ref={primaryRef}
            type="button"
            disabled={busy}
            onClick={onUseNewDesign}
            className="h-10 whitespace-nowrap rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white transition-colors duration-150 hover:bg-ink/90 disabled:opacity-50">

            Usar este nuevo diseño
          </button>
        </div>
      </div>
    </div>);

}
