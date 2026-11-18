/*
 * "Combinar colores con mi portada" — the panel face of utils/coverPalette.
 *
 * Everything the owner sees here is local state. Analysing the cover, switching
 * between the three proposals and looking at the preview mutate nothing: the
 * document is only written when "Aplicar colores" is pressed, and that write is
 * a single `updateDoc` — the seven tokens plus the three provenance props — so it
 * costs exactly one undo entry. "Cancelar" and "Mantener mis colores" simply drop
 * the local state.
 *
 * Nothing here is automatic. A changed cover only produces a notice, and the
 * notice only ever offers; the owner decides. Restoration reuses the document
 * history the editor already keeps — there is no second snapshot system.
 *
 * The preview is deliberately a miniature of this page's own anatomy — page
 * background, a surface card, title and body text, the accent button and a
 * secondary button — rather than a page render: it must show the seven tokens
 * doing their real jobs without the editor having to re-render the page on every
 * hover.
 *
 * The feature is Premium, but reading the cover is not. `analyzeCoverImage` runs
 * locally on a canvas — it spends no API call and no quota — so the analysis is
 * the teaser: everyone gets it, and what Free cannot do is MUTATE. The gate sits
 * on the write, not on the read.
 *
 * So Free sees that a combination was found, a partial sample of the tones it
 * read, and the three modes named but locked; the seven-token preview, the
 * per-mode swatches and "Aplicar colores" are Premium, and Free never reaches
 * `updateDoc`. The plan itself comes from the canonical billing boundary
 * (`getMyPlanFn`) — never from a table and never from a hardcoded plan name —
 * and while it is unresolved the owner is treated as Free, which is safe
 * precisely because Free's ceiling is "you can look".
 *
 * Everything that does not mutate stays open to everyone: the palette already
 * applied, the change notice, "Mantener colores actuales", "Recalcular" and
 * "Restaurar colores anteriores" — because locking a capability must never
 * remove what the document already holds.
 */
import React, { useEffect, useState } from "react";
import { CrownIcon, LockIcon, SparklesIcon, UndoIcon } from "lucide-react";
import { toast } from "sonner";
import { getMyPlanFn } from "../../../../../lib/billing/plan-server";
import { useEditor } from "../../../contexts/EditorContext";
import { templates } from "../../../data/templates";
import type { PageDoc } from "../../../types/editor";
import { cx } from "../../../utils/cx";
import {
  analyzeCoverImage,
  COVER_ANALYSIS_MESSAGES,
  CoverPaletteError,
  coverPaletteIsStale,
  coverPaletteProvenance,
  type CoverAnalysisErrorCode,
  type CoverPaletteKind,
  type CoverPaletteProposal,
  type CoverPaletteTokens,
} from "../../../utils/coverPalette";

type Status = "idle" | "analyzing" | "confirm" | "ready" | "error";

/**
 * Page props that are an explicit colour decision. If any is present the owner
 * (or the template that generated the page) already chose colours, so the panel
 * asks before proposing its own instead of overwriting them silently.
 */
const EXPLICIT_COLOR_KEYS = [
  "bg",
  "bgOverride",
  "palette",
  "textColor",
  "mutedColor",
  "surfaceColor",
  "lineColor",
  "accent",
  "accentFg",
] as const;

/**
 * The upsell. The product has no upgrade route yet (the checkout adapters are
 * still pending), so this reuses the pattern the product actually ships today —
 * a toast — instead of inventing a destination. One headline, one sentence, both
 * about THIS feature: nothing here promises a page that does not exist.
 */
export const COVER_PALETTE_PREMIUM_NOTICE = {
  headline: "Esta función está disponible en Cripqer Pro.",
  description: "Combina automáticamente los colores de tu página con tu portada.",
} as const;

/**
 * Is the current owner entitled to this feature?
 *
 * The initial state is `false` and it only ever flips to `true` when the billing
 * boundary answers `isPro === true`. That ordering is the whole point: there is
 * no window in which the owner can press the control before the plan is known,
 * and a rejected or failed lookup leaves them exactly where an anonymous visitor
 * is — Free. Fail-closed, same as the boundary itself.
 */
function useIsPremium(): boolean {
  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    let active = true;
    getMyPlanFn()
      .then((decision) => {
        if (active) setIsPremium(decision.isPro === true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return isPremium;
}

/** The "Pro" marker, matching how the editor already labels Pro-only fields. */
function ProBadge() {
  return (
    <span
      data-testid="cover-palette-pro-badge"
      className="shrink-0 rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700"
    >
      PRO
    </span>
  );
}

/**
 * Which of the five swatches the Free teaser is allowed to paint, and why it is
 * not simply the first three.
 *
 * `swatches` is ordered [bg, surfaceColor, accent, mutedColor, textColor], and
 * the first two are the near-white base and the card — a leading slice would
 * paint a strip that says nothing about the cover. These three (base, accent,
 * dark tone) are the ones that carry its identity, and they are still only three
 * of the seven tokens the page would use: `surfaceColor`, `mutedColor`,
 * `lineColor` and `accentFg` never reach the DOM in the teaser, and no token is
 * ever shown in the role it will actually play. That is the difference between a
 * sample and the feature.
 */
const TEASER_SWATCH_INDEXES = [0, 2, 4] as const;

function teaserTones(swatches: string[]): string[] {
  return TEASER_SWATCH_INDEXES
    .map((index) => swatches[index])
    .filter((color): color is string => typeof color === "string" && color.length > 0);
}

/** The miniature: every token rendered in the role it actually plays. */
function PalettePreview({ tokens }: { tokens: CoverPaletteTokens }) {
  return (
    <div
      data-testid="cover-palette-preview"
      className="overflow-hidden rounded-2xl border border-line"
      style={{ background: tokens.bg }}
    >
      <div className="p-3">
        <p className="text-[13px] font-semibold" style={{ color: tokens.textColor }}>
          Tu negocio
        </p>
        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: tokens.mutedColor }}>
          Una línea sobre lo que haces.
        </p>
        <div
          className="mt-3 rounded-xl p-2.5"
          style={{ background: tokens.surfaceColor, border: `1px solid ${tokens.lineColor}` }}
        >
          <p className="text-[11px] font-semibold" style={{ color: tokens.textColor }}>
            Tarjeta
          </p>
          <p className="mt-0.5 text-[10px]" style={{ color: tokens.mutedColor }}>
            Contenido de apoyo
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: tokens.accent, color: tokens.accentFg }}
          >
            Escríbenos
          </span>
          <span
            className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
            style={{ borderColor: tokens.lineColor, color: tokens.textColor }}
          >
            Cómo llegar
          </span>
        </div>
      </div>
      <div className="flex" aria-hidden="true">
        {[tokens.bg, tokens.surfaceColor, tokens.accent, tokens.mutedColor, tokens.textColor].map(
          (color, index) => (
            <span key={`${color}-${index}`} className="h-3 flex-1" style={{ background: color }} />
          ),
        )}
      </div>
    </div>
  );
}

export function CoverPalettePanel() {
  const ed = useEditor();
  const isPremium = useIsPremium();
  const page = ed.doc.props["page"] ?? {};
  const [status, setStatus] = useState<Status>("idle");
  const [proposals, setProposals] = useState<CoverPaletteProposal[]>([]);
  const [selected, setSelected] = useState<CoverPaletteKind | null>(null);
  const [errorCode, setErrorCode] = useState<CoverAnalysisErrorCode>("load");
  /** The exact document object this panel wrote — see `canRestore`. */
  const [appliedDoc, setAppliedDoc] = useState<PageDoc | null>(null);
  /** The cover the owner said to ignore the change notice for. */
  const [dismissedSrc, setDismissedSrc] = useState<string | null>(null);

  const heroKey = ed.doc.blocks.find((block) => block.type === "hero")?.key ?? "hero";
  // The generator writes no `src`, so an untouched page shows the template's own
  // cover. Analysing that is correct: it is the image the owner is looking at.
  const coverSrc = ed.doc.props[`block:${heroKey}`]?.["src"] || templates[ed.templateId].preview;
  const hasExplicitColors = EXPLICIT_COLOR_KEYS.some((key) => (page[key] ?? "") !== "");
  const chosen = proposals.find((item) => item.kind === selected) ?? proposals[0];
  // Derived, not stored: applying a palette rewrites the recorded src, which is
  // what makes this notice go away on its own.
  const coverChanged = coverPaletteIsStale(page, coverSrc);
  const showChangeNotice = coverChanged && dismissedSrc !== coverSrc && status === "idle";
  // Undo is only offered while the document is still the exact object this panel
  // handed to the history. The editor's history keeps document *references*, so
  // reference equality proves our apply is still the top entry: one undo then
  // restores the previous palette and can never revert an unrelated later edit.
  // No copy of the document is kept, and no second history exists.
  const canRestore = appliedDoc !== null && ed.doc === appliedDoc && ed.canUndo;
  const message = COVER_ANALYSIS_MESSAGES[errorCode];

  const reset = () => {
    setStatus("idle");
    setProposals([]);
    setSelected(null);
  };

  const offerUpgrade = () =>
    toast(COVER_PALETTE_PREMIUM_NOTICE.headline, {
      description: COVER_PALETTE_PREMIUM_NOTICE.description,
    });

  /**
   * `confirmed` is set when the owner asked for this from the change notice: that
   * request IS the deliberate confirmation, so asking again would be a second
   * prompt for the same decision.
   *
   * Analysing is deliberately NOT gated. `analyzeCoverImage` reads the cover on a
   * canvas in this tab: no API call, no tokens, no quota. Its result is the
   * teaser, so Free is allowed to reach it — what Free cannot do is apply it, and
   * that guard lives on `apply`, the only path to `updateDoc`.
   */
  const run = async (options?: { confirmed?: boolean }) => {
    setStatus("analyzing");
    try {
      const found = await analyzeCoverImage(coverSrc);
      setProposals(found);
      setSelected(found[0]?.kind ?? null);
      // Free never reaches "confirm": that prompt exists to ask permission before
      // overwriting colours the owner chose, and Free has nothing to overwrite
      // them with. It lands on "ready", where `isPremium` picks the full flow or
      // the teaser — which also means a plan that resolves to Pro after the
      // analysis upgrades the view by itself, with no extra state.
      setStatus(isPremium && hasExplicitColors && !options?.confirmed ? "confirm" : "ready");
    } catch (error) {
      setErrorCode(error instanceof CoverPaletteError ? error.code : "load");
      setStatus("error");
    }
  };

  /**
   * THE gate — the only path in this panel that writes.
   *
   * Everything upstream is observation; this is the mutation, so this is where
   * entitlement is enforced. It is checked here rather than only on the button so
   * that no future caller can reach `updateDoc` by another route, and it is
   * checked on `isPremium` rather than on a resolved-plan flag so that an
   * unresolved or failed lookup refuses too: while the plan is unknown the owner
   * is Free, and Free's ceiling is "you may look". There is therefore no window
   * in which a palette can be applied before entitlement is known.
   */
  const apply = () => {
    if (!isPremium) {
      offerUpgrade();
      return;
    }
    if (!chosen) return;
    // Built here and handed to `updateDoc` unchanged, so the object that becomes
    // the history's present is exactly this one. That identity is what makes
    // "Restaurar" safe (see `canRestore`) without keeping any copy.
    const next: PageDoc = {
      ...ed.doc,
      props: {
        ...ed.doc.props,
        page: {
          ...(ed.doc.props["page"] ?? {}),
          ...chosen.tokens,
          // Where this palette came from. Strings only, in the same patch, so the
          // document stays valid and the undo entry stays single.
          ...coverPaletteProvenance(chosen.kind, coverSrc),
          // A named palette and a tonal override both outrank the explicit
          // tokens in useThemeTokens, so they are cleared in this SAME patch.
          // One updateDoc call, therefore one undo entry.
          palette: "",
          bgOverride: "",
        },
      },
    };
    ed.updateDoc(() => next);
    setAppliedDoc(next);
    toast("Colores aplicados", { description: `Combinación ${chosen.label} desde tu portada.` });
    reset();
  };

  /** The existing document history is the only restore mechanism — no snapshots. */
  const restore = () => {
    ed.undo();
    setAppliedDoc(null);
  };

  return (
    <div className="space-y-2.5">
      {showChangeNotice && (
        <div className="space-y-2.5 rounded-xl border border-select/40 bg-select-soft p-3">
          <p className="text-[12.5px] font-medium leading-snug text-ink">
            Tu portada cambió. ¿Quieres volver a combinar los colores?
          </p>
          <p className="text-[11.5px] leading-snug text-mute">
            Tus colores actuales siguen puestos. Nada cambia hasta que lo decidas.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void run({ confirmed: true })}
              className="rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-white"
            >
              Recalcular
            </button>
            <button
              type="button"
              onClick={() => setDismissedSrc(coverSrc)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-mute hover:text-ink"
            >
              Mantener colores actuales
            </button>
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className="space-y-2">
          {/*
           * No PRO badge here, deliberately. Free can press this — the analysis is
           * the teaser — so marking it Premium would be a claim the control does
           * not keep. The badge lives where the lock actually is: on the three
           * modes and on the apply CTA, inside the teaser below.
           */}
          <button
            type="button"
            data-testid="cover-palette-trigger"
            onClick={() => void run()}
            className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left transition-colors duration-150 hover:bg-[#F7F8FA]"
          >
            <SparklesIcon className="h-4 w-4 text-mute" />
            <span className="flex-1 text-[13px] font-medium">Combinar colores con mi portada</span>
          </button>
          {canRestore && (
            <button
              type="button"
              onClick={restore}
              className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F7F8FA]"
            >
              <UndoIcon className="h-4 w-4 text-mute" />
              <span className="text-[12.5px] font-medium">Restaurar colores anteriores</span>
            </button>
          )}
        </div>
      )}

      {status === "analyzing" && (
        <p className="rounded-xl border border-line px-3 py-3 text-[12.5px] text-mute">
          Analizando tu portada…
        </p>
      )}

      {status === "error" && (
        <div className="space-y-2 rounded-xl border border-line bg-[#FBF7F4] px-3 py-3">
          <p className="text-[12.5px] leading-snug text-ink">{message.headline}</p>
          <p className="text-[11.5px] leading-snug text-mute">{message.detail}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-2.5 py-1.5 text-[12px] text-mute hover:text-ink"
          >
            Cerrar
          </button>
        </div>
      )}

      {status === "confirm" && (
        <div className="space-y-2.5 rounded-xl border border-line bg-[#F7F8FA] p-3">
          <p className="text-[12.5px] leading-snug text-ink">
            Encontramos una combinación que encaja con tu portada.
          </p>
          <p className="text-[11.5px] leading-snug text-mute">
            Tu página ya tiene colores propios. Nada cambia hasta que lo apliques.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("ready")}
              className="rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-white"
            >
              Probar paleta
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-mute hover:text-ink"
            >
              Mantener mis colores
            </button>
          </div>
        </div>
      )}

      {/*
       * The teaser. The analysis really did run, so Free gets the finding — but
       * not the result. Deliberately absent here: `chosen.tokens`,
       * `<PalettePreview>`, `item.swatches` and `chosen.description`. `swatches`
       * is five of the seven final token values (`swatchesOf` in
       * utils/coverPalette) and the preview renders all seven in the roles they
       * will actually play, so rendering either would hand Free the exact palette
       * it is not entitled to apply. What is shown instead is a partial strip of
       * three tones — enough to prove the cover was read, not enough to be the
       * palette — and the three modes by name, locked.
       */}
      {status === "ready" && chosen && !isPremium && (
        <div className="space-y-3" data-testid="cover-palette-teaser">
          <div className="space-y-1">
            <p className="text-[12.5px] font-medium leading-snug text-ink">
              Encontramos una combinación para tu portada.
            </p>
            <p className="text-[11.5px] leading-snug text-mute">
              Cripqer Pro puede adaptar automáticamente los colores de tu página a esta portada.
            </p>
          </div>

          {/* Partial sample: three of the tones read, not the seven the page would use. */}
          <span className="flex overflow-hidden rounded-xl" aria-hidden="true">
            {teaserTones(chosen.swatches).map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-8 flex-1"
                style={{ background: color }}
              />
            ))}
          </span>

          <ul className="space-y-1.5">
            {proposals.map((item) => (
              <li
                key={item.kind}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <LockIcon className="h-3.5 w-3.5 text-mute" />
                  <span className="text-[12.5px] font-medium text-mute">{item.label}</span>
                </span>
                <ProBadge />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg px-2.5 py-1.5 text-[12px] text-mute hover:text-ink"
            >
              Cerrar
            </button>
            <button
              type="button"
              data-testid="cover-palette-premium-cta"
              onClick={offerUpgrade}
              className="flex items-center gap-2 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-medium text-white"
            >
              <CrownIcon className="h-3.5 w-3.5" />
              Usar combinación con Cripqer Pro
            </button>
          </div>
        </div>
      )}

      {status === "ready" && chosen && isPremium && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {proposals.map((item) => {
              const active = chosen.kind === item.kind;
              return (
                <button
                  key={item.kind}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Combinación ${item.label}`}
                  onClick={() => setSelected(item.kind)}
                  className={cx(
                    "rounded-xl border p-2 text-left transition-colors duration-150",
                    active ? "border-select bg-select-soft" : "border-line hover:bg-[#F7F8FA]",
                  )}
                >
                  <span className="mb-2 flex overflow-hidden rounded-lg">
                    {item.swatches.map((color, index) => (
                      <span
                        key={`${color}-${index}`}
                        className="h-6 flex-1"
                        style={{ background: color }}
                      />
                    ))}
                  </span>
                  <span className="text-[12px] font-semibold text-ink">{item.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[11.5px] leading-snug text-mute">{chosen.description}</p>

          <PalettePreview tokens={chosen.tokens} />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg px-2.5 py-1.5 text-[12px] text-mute hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-medium text-white"
            >
              Aplicar colores
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
