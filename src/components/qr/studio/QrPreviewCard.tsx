import type { ReactNode } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { StatusPill } from "../../home/StatusPill";

const actionButton =
  "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-cq-sm border border-cq-line bg-white px-3 text-[13px] font-semibold text-cq-ink transition-colors hover:bg-cq-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 disabled:opacity-60";
const actionButtonMagic =
  "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-cq-md border border-cq-line bg-white px-3 text-[13px] font-semibold text-cq-ink transition-colors hover:bg-cq-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200 disabled:opacity-60";

/**
 * F4 — Magic-style QR preview panel.
 *
 * Owns ONLY presentation: the real renderer (qrcode.react / qr-code-styling)
 * is passed as `children`, and every action is a real handler owned by the
 * caller (copy to clipboard, open canonical URL, regenerate pattern).
 */
export function QrPreviewCard({
  title = "Tu código QR",
  displayUrl,
  published,
  activeLabel,
  inactiveLabel,
  onCopy,
  copied = false,
  onOpen,
  openLabel = "Abrir página",
  onRegenerate,
  regenerateHint,
  note,
  visual = "default",
  children,
}: {
  title?: string;
  displayUrl: string;
  published?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  onCopy?: () => void;
  copied?: boolean;
  onOpen?: string;
  openLabel?: string;
  onRegenerate?: () => void;
  regenerateHint?: string;
  note?: string;
  visual?: "default" | "magic";
  children: ReactNode;
}) {
  const actionClass = visual === "magic" ? actionButtonMagic : actionButton;

  return (
    <section
      aria-labelledby="qr-preview-heading"
      className={
        visual === "magic"
          ? "w-full min-w-0 overflow-hidden rounded-cq-2xl bg-cq-blue-50 p-5 sm:p-7"
          : "w-full min-w-0 overflow-hidden rounded-cq-xl bg-cq-blue-50 p-4 sm:rounded-cq-2xl sm:p-6"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="qr-preview-heading" className="text-[15px] font-semibold text-cq-ink">
          {title}
        </h2>
        {typeof published === "boolean" ? (
          <StatusPill
            published={published}
            activeLabel={activeLabel ?? "Publicada"}
            inactiveLabel={inactiveLabel ?? "Borrador"}
          />
        ) : null}
      </div>

      <div
        className={
          visual === "magic"
            ? "mt-5 flex w-full justify-center rounded-cq-xl bg-white p-5 shadow-float ring-1 ring-cq-line sm:p-7"
            : "mt-4 flex w-full justify-center rounded-cq-lg bg-white p-5 shadow-float ring-1 ring-cq-line sm:rounded-cq-xl sm:p-7"
        }
      >
        <div
          className={
            visual === "magic"
              ? "flex w-full max-w-[320px] justify-center [&_canvas]:max-w-full [&_svg]:max-w-full"
              : "flex w-full max-w-[300px] justify-center [&_canvas]:max-w-full [&_svg]:max-w-full"
          }
        >
          {children}
        </div>
      </div>

      <p className="mt-4 truncate text-center text-[13px] text-cq-muted">
        Lleva a <span className="font-semibold text-cq-ink">{displayUrl}</span>
      </p>
      {note ? <p className="mt-1 text-center text-[12px] text-cq-subtle">{note}</p> : null}

      {(onRegenerate || onCopy || onOpen) && (
        <div className="mt-5 flex flex-col gap-2">
          {onRegenerate ? (
            <>
              <button type="button" onClick={onRegenerate} className={`${actionClass} w-full`}>
                <RefreshCw className="h-4 w-4 text-cq-muted" aria-hidden />
                Regenerar patrón
              </button>
              {regenerateHint ? (
                <p className="text-center text-[12px] text-cq-subtle">{regenerateHint}</p>
              ) : null}
            </>
          ) : null}
          <div className="mt-1 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {onCopy ? (
              <button type="button" onClick={onCopy} className={actionClass}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-cq-blue" aria-hidden /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-cq-muted" aria-hidden /> Copiar enlace
                  </>
                )}
              </button>
            ) : null}
            {onOpen ? (
              <a href={onOpen} target="_blank" rel="noreferrer" className={actionClass}>
                <ExternalLink className="h-4 w-4 text-cq-muted" aria-hidden />
                {openLabel}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

export default QrPreviewCard;
