import { AlertTriangle, Check, Download, Loader2, RotateCcw } from "lucide-react";
import { QrStudioSection } from "./QrStudioSection";

export type QrExportState = "idle" | "working" | "done" | "error";

export interface QrExportSizeOption {
  value: number;
  label: string;
  hint?: string;
}

const primaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-cq-sm bg-cq-blue px-4 text-[14px] font-semibold text-white transition-colors hover:bg-cq-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-cq-blue-200 disabled:cursor-not-allowed disabled:opacity-60";
const ghostButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-cq-sm border border-cq-line bg-white px-4 text-[13px] font-semibold text-cq-ink transition-colors hover:bg-cq-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200";

/**
 * F4 — Export section (Magic ExportPanel UX).
 *
 * Reuses the REAL exporters owned by the caller (`downloadQR` /
 * `downloadSVG` / `downloadAdvancedQR`). Job states mirror real promises:
 * `working` while the exporter runs, `done`/`error` once it settles. There are
 * no fake timers and no invented jobs.
 */
export function QrExportPanel({
  format,
  formats,
  onFormatChange,
  size,
  sizes,
  onSizeChange,
  onDownload,
  state = "idle",
  errorMessage,
  onReset,
  resetLabel = "Restaurar QR clásico",
  note,
}: {
  format: "png" | "svg";
  formats: ReadonlyArray<{ value: "png" | "svg"; label: string; hint?: string }>;
  onFormatChange: (format: "png" | "svg") => void;
  size: number;
  sizes: ReadonlyArray<QrExportSizeOption>;
  onSizeChange: (size: number) => void;
  onDownload: () => void;
  state?: QrExportState;
  errorMessage?: string | null;
  onReset?: () => void;
  resetLabel?: string;
  note?: string;
}) {
  const working = state === "working";

  return (
    <QrStudioSection
      title="Exportar"
      description="Archivos generados con el motor de QR real de Cripqer."
      icon={<Download className="h-4 w-4 text-cq-blue" aria-hidden />}
    >
      <fieldset className="min-w-0">
        <legend className="text-[12.5px] font-medium text-cq-muted">Formato</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {formats.map((option) => {
            const selected = option.value === format;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onFormatChange(option.value)}
                className={`flex min-h-14 min-w-0 flex-col items-start justify-center rounded-cq-sm px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 ${
                  selected
                    ? "bg-cq-blue-50 ring-2 ring-cq-blue"
                    : "bg-white ring-1 ring-cq-line hover:ring-cq-blue-200"
                }`}
              >
                <span className="text-[14px] font-semibold uppercase text-cq-ink">{option.label}</span>
                {option.hint ? <span className="text-[11.5px] text-cq-subtle">{option.hint}</span> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      {format === "png" ? (
        <fieldset className="mt-5 min-w-0">
          <legend className="text-[12.5px] font-medium text-cq-muted">Tamaño del PNG</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            {sizes.map((option) => {
              const selected = option.value === size;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSizeChange(option.value)}
                  className={`flex min-h-14 min-w-0 flex-col items-start justify-center rounded-cq-sm px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 ${
                    selected
                      ? "bg-cq-blue-50 ring-2 ring-cq-blue"
                      : "bg-white ring-1 ring-cq-line hover:ring-cq-blue-200"
                  }`}
                >
                  <span className="text-[14px] font-semibold text-cq-ink tabular-nums">
                    {option.value} × {option.value}
                  </span>
                  {option.hint ? <span className="text-[11.5px] text-cq-subtle">{option.hint}</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={working}
          className={primaryButton}
          data-qr-export-state={state}
        >
          {working ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Preparando…
            </>
          ) : state === "done" ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Descargado
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden />
              Descargar {format.toUpperCase()}
            </>
          )}
        </button>

        {onReset ? (
          <button type="button" onClick={onReset} disabled={working} className={ghostButton}>
            <RotateCcw className="h-4 w-4 text-cq-muted" aria-hidden />
            {resetLabel}
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-cq-subtle" aria-live="polite">
        {state === "error" ? (
          <span className="inline-flex items-start gap-2 text-red-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {errorMessage ?? "No pudimos preparar el archivo. Inténtalo de nuevo."}
          </span>
        ) : (
          (note ?? "El SVG es vectorial: se ve perfecto a cualquier tamaño, ideal para imprenta.")
        )}
      </p>
    </QrStudioSection>
  );
}

export default QrExportPanel;

