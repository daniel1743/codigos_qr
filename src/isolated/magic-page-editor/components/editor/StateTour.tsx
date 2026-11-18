import React, { useEffect, useState } from 'react';
import { RouteIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { templates } from '../../data/templates';
import { cx } from '../../utils/cx';
import type { TourStep } from '../../types/editor';

const steps: {id: TourStep;label: string;mobileOnly?: boolean;}[] = [
{ id: 'normal', label: 'Página normal' },
{ id: 'text', label: 'Texto' },
{ id: 'hero', label: 'Portada' },
{ id: 'avatar', label: 'Avatar' },
{ id: 'cta', label: 'Botón' },
{ id: 'card', label: 'Card' },
{ id: 'gallery', label: 'Galería' },
{ id: 'section', label: 'Sección y fondo' },
{ id: 'add', label: 'Añadir bloque' },
{ id: 'advanced', label: 'Opciones avanzadas' },
{ id: 'sheet-compact', label: 'Sheet compacto', mobileOnly: true },
{ id: 'sheet-expanded', label: 'Sheet expandido', mobileOnly: true },
{ id: 'keyboard', label: 'Teclado', mobileOnly: true }];


/**
 * QA activation check for StateTour:
 * - Production: ALWAYS false.
 * - Development: HIDDEN by default.
 * - Explicit opt-in only in DEV via localStorage ("cripqer_qa_tour" === "true" | "1")
 *   or window.__CRIPQER_QA_TOUR__ === true.
 * - Never enabled via public URL params (like `?debug=true`).
 */
export function isStateTourActive(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem("cripqer_qa_tour") === "true" ||
      window.localStorage.getItem("cripqer_qa_tour") === "1" ||
      Boolean((window as unknown as { __CRIPQER_QA_TOUR__?: boolean }).__CRIPQER_QA_TOUR__)
    );
  } catch {
    return false;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { toggleCripqerQaTour?: () => void }).toggleCripqerQaTour = () => {
    const next = !(window.localStorage.getItem("cripqer_qa_tour") === "true");
    window.localStorage.setItem("cripqer_qa_tour", next.toString());
    console.info(`[CRIPQER QA] StateTour ${next ? "ACTIVADA" : "DESACTIVADA"}. Recarga para aplicar.`);
  };
}

/** Review aid: jumps straight to each required editing state so the system can be evaluated quickly. */
export function StateTour() {
  const ed = useEditor();
  const [active, setActive] = useState<TourStep>('normal');

  useEffect(() => {
    setActive('normal');
  }, [ed.templateId, ed.device]);

  useEffect(() => {
    if (!ed.selection && !ed.picker.open) setActive((a) => a === 'add' ? a : 'normal');
  }, [ed.selection, ed.picker.open]);

  if (!isStateTourActive()) return null;
  if (ed.mode !== 'edit') return null;

  const run = (step: TourStep) => {
    setActive(step);
    const tour = templates[ed.templateId].tour;
    ed.closePicker();
    ed.setSettingsOpen(false);
    switch (step) {
      case 'normal':
        ed.clearSelection();
        break;
      case 'add':
        ed.clearSelection();
        ed.openPicker(tour.section.replace('block:', ''));
        break;
      case 'advanced':
        ed.select(tour.cta, { reveal: true });
        if (ed.isMobile) ed.setSheet('expanded');else
        ed.setMoreOpen(true);
        break;
      case 'sheet-compact':
        ed.select(tour.card, { reveal: true });
        break;
      case 'sheet-expanded':
        ed.select(tour.card, { reveal: true });
        ed.setSheet('expanded');
        break;
      case 'keyboard':
        ed.select(tour.text, { reveal: true });
        ed.setEditingId(tour.text);
        ed.setKeyboard(true);
        break;
      default:
        ed.select(tour[step], { reveal: true });
    }
  };

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-white/90 px-3 lg:px-4">
      {/*
        The bar keeps a visible identifier at every width. Below 640px the word
        does not fit next to the chips, so the icon stays and carries the
        accessible name "Estados" (measured: label hidden, steps still present).
      */}
      <span
        className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-mute"
        aria-label="Estados"
        title="Estados">
        <RouteIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline" aria-hidden="true">Estados</span>
      </span>
      <div className="cq-scroll-none flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {steps.
        filter((s) => !s.mobileOnly || ed.isMobile).
        map((s) =>
        <button
          key={s.id}
          type="button"
          onClick={() => run(s.id)}
          className={cx(
            'h-7 shrink-0 whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-colors duration-150',
            active === s.id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-[#F2F3F5]'
          )}>
          
              {s.label}
            </button>
        )}
      </div>
    </div>);

}