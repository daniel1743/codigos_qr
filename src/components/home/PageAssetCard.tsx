import { Check, Copy, ExternalLink, Pencil, QrCode } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StatusPill } from "./StatusPill";
import { editRouteSearch } from "./editRouteSearch";

const secondaryClass =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-cq-sm bg-white px-3 text-[13.5px] font-semibold text-cq-ink ring-1 ring-cq-line transition-colors hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue";

/**
 * F2 — Home / Command Center: "Mi página" asset card.
 *
 * Every field is REAL: name/tagline/avatar from the `profiles` row, status from the
 * real `published` flag, URL from the canonical helpers in `lib/url.ts`, and facts
 * from existing counters (`profiles.scan_count`, `profile_links` count, `pages`
 * timestamps). No fabricated `cripqer.com/<slug>`; `profiles` and `pages` identities
 * are never collapsed.
 */
export function PageAssetCard({
  displayName,
  tagline,
  avatarUrl,
  published,
  publicUrl,
  linkLabel,
  updatedLabel,
  createdLabel,
  scans,
  links,
  pageId,
  onCopyShare,
  copied,
}: {
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  published: boolean;
  publicUrl: string | null;
  linkLabel: string | null;
  updatedLabel: string | null;
  createdLabel: string | null;
  scans: number;
  links: number;
  pageId: string | null;
  onCopyShare: () => void;
  copied: boolean;
}) {
  return (
    <section
      aria-labelledby="home-page-heading"
      className="min-w-0 rounded-cq-xl border border-cq-line bg-white p-6 shadow-soft sm:p-7"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="home-page-heading" className="text-[13px] font-semibold text-cq-muted">
          Mi página
        </h2>
        <StatusPill published={published} />
      </header>

      <div className="mt-5 flex min-w-0 flex-col gap-5 min-[480px]:flex-row min-[480px]:gap-6">
        <div className="flex shrink-0 flex-col items-center gap-2 self-center min-[480px]:self-start">
          <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-cq-xl bg-cq-blue-50 text-2xl font-bold text-cq-blue ring-1 ring-cq-line">
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
          {publicUrl && linkLabel ? (
            <button
              type="button"
              onClick={onCopyShare}
              aria-label={`Copiar enlace ${linkLabel}`}
              className="group mt-4 flex w-full min-w-0 items-center justify-between gap-2 rounded-cq-sm bg-cq-canvas px-3 py-2.5 text-left ring-1 ring-cq-line transition-colors hover:ring-cq-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
            >
              <span className="truncate text-[13px] font-medium text-cq-blue">{linkLabel}</span>
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
              Publica tu página para obtener tu enlace público.
            </p>
          )}

          <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cq-subtle">
            <div className="flex items-center gap-1.5">
              <dt>Enlaces activos</dt>
              <dd className="font-semibold text-cq-ink">{links.toLocaleString("es-CL")}</dd>
            </div>
            {updatedLabel ? (
              <div className="flex items-center gap-1.5">
                <dt>Actualizada</dt>
                <dd className="font-semibold text-cq-ink">{updatedLabel}</dd>
              </div>
            ) : null}
            {createdLabel ? (
              <div className="flex items-center gap-1.5">
                <dt>Creada</dt>
                <dd className="font-semibold text-cq-ink">{createdLabel}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
            {pageId ? (
              <Link
                to="/pages/$pageId/edit"
                params={{ pageId }}
                search={editRouteSearch}
                className={`${secondaryClass} col-span-2 sm:col-span-1`}
              >
                <Pencil className="h-3.5 w-3.5 text-cq-muted" aria-hidden /> Editar
              </Link>
            ) : null}
            {publicUrl ? (
              <a href={publicUrl} target="_blank" rel="noreferrer" className={secondaryClass}>
                <ExternalLink className="h-3.5 w-3.5 text-cq-muted" aria-hidden /> Ver página
              </a>
            ) : null}
            {publicUrl ? (
              <button type="button" onClick={onCopyShare} className={secondaryClass}>
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

/** Honest empty state for owners without a page yet (real creation flow, no mock data). */
export function NoPageCard({ onCreate, creating, canCreatePage }: { onCreate: () => void; creating: boolean; canCreatePage: boolean }) {
  return (
    <section
      aria-labelledby="home-no-page-heading"
      className="min-w-0 rounded-cq-xl border border-cq-line bg-white p-7 shadow-soft sm:p-9"
    >
      <span className="grid h-12 w-12 place-items-center rounded-cq-md bg-cq-blue-50 text-cq-blue">
        <QrCode className="h-6 w-6" aria-hidden />
      </span>
      <h2 id="home-no-page-heading" className="mt-4 text-[20px] font-bold text-cq-ink">
        Aún no tienes una página
      </h2>
      <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-cq-muted">
        Crea tu página para publicar tu identidad, tus enlaces y obtener tu QR permanente.
      </p>
      {canCreatePage ? <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-cq-sm bg-cq-blue px-5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(30,86,224,0.6)] transition-colors hover:bg-cq-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cq-blue-200"
      >
        {creating ? "Creando…" : "Crear página"}
      </button> : null}
    </section>
  );
}

export default PageAssetCard;
