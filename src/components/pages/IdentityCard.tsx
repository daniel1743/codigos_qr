import { Check, Copy, ExternalLink, Pencil, QrCode } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StatusPill } from "../home/StatusPill";
import type { CanonicalUrl } from "./page-presentation";

const actionClass =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-cq-sm px-3 text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue";
const outlineAction = `${actionClass} bg-white text-cq-ink ring-1 ring-cq-line hover:bg-cq-canvas`;

/**
 * F3 — Mi Página / Identity: the ROOT identity card (`profiles`).
 *
 * This is deliberately separate from the Magic pages list: `profiles` is the owner's
 * identity / root BioLink (edited in the existing Basic/Power editor at `/editor`),
 * while `pages` are independent Magic documents. Only real data is rendered.
 */
export function IdentityCard({
  displayName,
  tagline,
  avatarUrl,
  published,
  canonical,
  scans,
  links,
  createdLabel,
  onCopy,
  copied,
}: {
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  published: boolean;
  canonical: CanonicalUrl | null;
  scans: number;
  links: number;
  createdLabel: string | null;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <section
      aria-labelledby="identity-heading"
      className="min-w-0 rounded-cq-xl border border-cq-line bg-white p-5 shadow-soft sm:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cq-subtle">
            Identidad
          </p>
          <h2 id="identity-heading" className="mt-0.5 text-[15px] font-bold text-cq-ink">
            Perfil principal
          </h2>
        </div>
        <StatusPill published={published} />
      </header>

      <div className="mt-4 flex min-w-0 flex-col gap-5 min-[480px]:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-2 self-center min-[480px]:self-start">
          <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-cq-lg bg-cq-blue-50 text-2xl font-bold text-cq-blue ring-1 ring-cq-line">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-cq-subtle">
            <QrCode className="h-3.5 w-3.5" aria-hidden />
            {scans.toLocaleString("es-CL")} escaneos
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[19px] font-bold leading-tight tracking-[-0.02em] text-cq-ink">
            {displayName}
          </p>
          {tagline ? <p className="mt-1 text-[13px] text-cq-muted">{tagline}</p> : null}

          {canonical ? (
            <button
              type="button"
              onClick={onCopy}
              aria-label={`Copiar enlace ${canonical.label}`}
              className="group mt-4 flex w-full min-w-0 items-center justify-between gap-2 rounded-cq-sm bg-cq-canvas px-3 py-2.5 text-left ring-1 ring-cq-line transition-colors hover:ring-cq-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
            >
              <span className="truncate text-[13px] font-medium text-cq-blue">
                {canonical.label}
              </span>
              {copied ? (
                <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-cq-blue">
                  <Check className="h-4 w-4" aria-hidden /> Copiado
                </span>
              ) : (
                <Copy
                  className="h-4 w-4 shrink-0 text-cq-subtle transition-colors group-hover:text-cq-blue"
                  aria-hidden
                />
              )}
            </button>
          ) : (
            <p className="mt-4 rounded-cq-sm bg-cq-canvas px-3 py-2.5 text-[13px] text-cq-muted ring-1 ring-cq-line">
              Tu identidad todavía no tiene un enlace público.
            </p>
          )}

          <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cq-subtle">
            <div className="flex items-center gap-1.5">
              <dt>Enlaces</dt>
              <dd className="font-semibold text-cq-ink">{links.toLocaleString("es-CL")}</dd>
            </div>
            {createdLabel ? (
              <div className="flex items-center gap-1.5">
                <dt>Creada</dt>
                <dd className="font-semibold text-cq-ink">{createdLabel}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
            <Link to="/editor" className={`${outlineAction} col-span-2 sm:col-span-1`}>
              <Pencil className="h-3.5 w-3.5 text-cq-muted" aria-hidden /> Editar identidad
            </Link>
            {canonical ? (
              <a
                href={canonical.url}
                target="_blank"
                rel="noreferrer"
                className={outlineAction}
                aria-label="Ver perfil público"
              >
                <ExternalLink className="h-3.5 w-3.5 text-cq-muted" aria-hidden /> Ver perfil
              </a>
            ) : null}
            {canonical ? (
              <button type="button" onClick={onCopy} className={outlineAction}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-cq-blue" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-cq-muted" aria-hidden />
                )}
                Compartir
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default IdentityCard;
