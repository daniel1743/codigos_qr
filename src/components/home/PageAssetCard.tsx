import { ArrowRight, QrCode } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StatusPill } from "./StatusPill";

const secondaryClass =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-cq-sm bg-white px-3 text-[13.5px] font-semibold text-cq-ink ring-1 ring-cq-line transition-colors hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue";

/**
 * F2 — Home / Command Center: "presence summary" card.
 *
 * F4.5 (information architecture): this block is a SUMMARY, not the asset admin
 * surface. It keeps only real presence signals (identity, publication state,
 * `profiles.scan_count`, `profile_links` count) and hands every administrative
 * action (edit, view, share, link/alias, QR, dates) to `/pages/$pageId`, which
 * owns the asset. Nothing is fabricated and no identity is collapsed.
 */
export function PageAssetCard({
  displayName,
  tagline,
  avatarUrl,
  published,
  scans,
  links,
  pageId,
}: {
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  published: boolean;
  scans: number;
  links: number;
  pageId: string | null;
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
        <div className="flex shrink-0 items-center justify-center self-center min-[480px]:self-start">
          <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-cq-xl bg-cq-blue-50 text-2xl font-bold text-cq-blue ring-1 ring-cq-line">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[19px] font-bold leading-tight tracking-[-0.02em] text-cq-ink">
            {displayName}
          </p>
          {tagline ? <p className="mt-1 text-[13px] text-cq-muted">{tagline}</p> : null}

          <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-cq-subtle">
            <div className="flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-cq-subtle" aria-hidden />
              <dt>Escaneos</dt>
              <dd className="font-semibold text-cq-ink">{scans.toLocaleString("es-CL")}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt>Enlaces activos</dt>
              <dd className="font-semibold text-cq-ink">{links.toLocaleString("es-CL")}</dd>
            </div>
          </dl>

          {pageId ? (
            <div className="mt-5 sm:mt-auto sm:pt-5">
              <Link
                to="/pages/$pageId"
                params={{ pageId }}
                className={`${secondaryClass} w-full no-underline sm:w-auto`}
              >
                Administrar página
                <ArrowRight className="h-3.5 w-3.5 text-cq-muted" aria-hidden />
              </Link>
            </div>
          ) : null}
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
