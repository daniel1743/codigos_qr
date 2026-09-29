import type { ReactNode } from "react";
import { Check, Copy, Link2 } from "lucide-react";

/**
 * F4 — Canonical QR URL box.
 *
 * Shows the EXACT URL the QR physically encodes plus, optionally, the final
 * destination it resolves to (secondary information). Both come from the
 * canonical helpers in `src/lib/url.ts`; nothing here is computed locally.
 */
export function QrUrlBox({
  label = "URL del QR",
  url,
  description,
  onCopy,
  copied = false,
  secondary,
  badge,
  className,
}: {
  label?: string;
  url: string;
  description?: string;
  onCopy?: () => void;
  copied?: boolean;
  secondary?: { label: string; url: string; description?: string };
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        className ??
        "min-w-0 rounded-cq-lg border border-cq-line bg-cq-canvas p-4 shadow-soft sm:rounded-cq-xl sm:p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-cq-ink">
            <Link2 className="h-4 w-4 text-cq-muted" aria-hidden />
            {label}
            {badge}
          </p>
          <p className="mt-1 break-all font-mono text-[12.5px] text-cq-ink" data-qr-url={url}>
            {url}
          </p>
          {description ? (
            <p className="mt-1 text-[12px] leading-relaxed text-cq-subtle">{description}</p>
          ) : null}
        </div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-cq-sm border border-cq-line bg-white px-3 text-[13px] font-semibold text-cq-ink transition-colors hover:bg-cq-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200"
          >
            {copied ? (
              <Check className="h-4 w-4 text-cq-blue" aria-hidden />
            ) : (
              <Copy className="h-4 w-4 text-cq-muted" aria-hidden />
            )}
            {copied ? "Copiado" : "Copiar"}
          </button>
        ) : null}
      </div>

      {secondary ? (
        <div className="mt-4 border-t border-cq-line pt-3">
          <p className="text-[12px] font-medium text-cq-subtle">{secondary.label}</p>
          <p className="mt-1 break-all font-mono text-[12px] text-cq-muted" data-qr-destination={secondary.url}>
            {secondary.url}
          </p>
          {secondary.description ? (
            <p className="mt-1 text-[12px] leading-relaxed text-cq-subtle">{secondary.description}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default QrUrlBox;
