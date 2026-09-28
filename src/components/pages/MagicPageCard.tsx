import { useState } from "react";
import { BarChart3, Check, Copy, ExternalLink, Loader2, Pencil, QrCode, Rocket, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { editRouteSearch } from "../home/editRouteSearch";
import { StatusPill } from "../home/StatusPill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import type { CanonicalUrl } from "./page-presentation";

const primary =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-cq-sm bg-white px-3 text-[13.5px] font-semibold text-cq-ink ring-1 ring-cq-line transition-colors hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue";
const ghost =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-cq-sm px-3 text-[13px] font-semibold text-cq-muted transition-colors hover:bg-cq-canvas hover:text-cq-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue";

/**
 * F3 — Mi Página / Identity: one Magic page (`pages` row), visually separated from the
 * root identity. All mutations stay in the parent route (`pageCanonicalService` /
 * `pageService`): this component only renders real data and real destinations.
 */
export function MagicPageCard({
  title,
  typeLabel,
  published,
  canonical,
  updatedLabel,
  publishedLabel,
  revision,
  sections,
  pageId,
  busy,
  copied,
  onCopy,
  onTogglePublish,
  onDelete,
}: {
  title: string;
  typeLabel: string;
  published: boolean;
  canonical: CanonicalUrl | null;
  updatedLabel: string | null;
  publishedLabel: string | null;
  revision: number | null;
  sections: number | null;
  pageId: string;
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <article className="min-w-0 rounded-cq-lg border border-cq-line bg-white p-4 shadow-soft sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold leading-tight tracking-[-0.02em] text-cq-ink">
            {title}
          </h3>
          <p className="mt-1 text-[12.5px] text-cq-muted">
            {typeLabel}
            {updatedLabel ? ` · Actualizada ${updatedLabel}` : ""}
          </p>
        </div>
        <StatusPill published={published} />
      </header>

      {canonical ? (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copiar enlace ${canonical.label}`}
          className="group mt-3 flex w-full min-w-0 items-center justify-between gap-2 rounded-cq-sm bg-cq-canvas px-3 py-2.5 text-left ring-1 ring-cq-line transition-colors hover:ring-cq-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
        >
          <span className="truncate text-[13px] font-medium text-cq-blue">{canonical.label}</span>
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
        <p className="mt-3 rounded-cq-sm bg-cq-canvas px-3 py-2.5 text-[12.5px] text-cq-muted ring-1 ring-cq-line">
          Publica esta página para obtener su enlace público.
        </p>
      )}

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cq-subtle">
        {publishedLabel ? (
          <div className="flex items-center gap-1.5">
            <dt>Publicada</dt>
            <dd className="font-semibold text-cq-ink">{publishedLabel}</dd>
          </div>
        ) : null}
        {revision !== null ? (
          <div className="flex items-center gap-1.5">
            <dt>Versión publicada</dt>
            <dd className="font-semibold text-cq-ink">{revision.toLocaleString("es-CL")}</dd>
          </div>
        ) : null}
        {sections !== null ? (
          <div className="flex items-center gap-1.5">
            <dt>Secciones</dt>
            <dd className="font-semibold text-cq-ink">{sections.toLocaleString("es-CL")}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
        <Link
          to="/pages/$pageId/edit"
          params={{ pageId }}
          search={editRouteSearch}
          className={`${primary} col-span-2 sm:col-span-1`}
        >
          <Pencil className="h-3.5 w-3.5 text-cq-muted" aria-hidden /> Editar
        </Link>
        {canonical ? (
          <a href={canonical.url} target="_blank" rel="noreferrer" className={primary}>
            <ExternalLink className="h-3.5 w-3.5 text-cq-muted" aria-hidden /> Ver página
          </a>
        ) : null}
        {canonical ? (
          <button type="button" onClick={onCopy} className={primary}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-cq-blue" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5 text-cq-muted" aria-hidden />
            )}
            Compartir
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-cq-line pt-3">
        <Link to="/pages/$pageId/analytics" params={{ pageId }} className={ghost}>
          <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Analytics
        </Link>
        <Link to="/pages/$pageId" params={{ pageId }} className={ghost}>
          <QrCode className="h-3.5 w-3.5" aria-hidden /> QR
        </Link>
        <button type="button" onClick={onTogglePublish} disabled={busy} className={ghost}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Rocket className="h-3.5 w-3.5" aria-hidden />
          )}
          {published ? "Despublicar" : "Publicar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          className={`${ghost} hover:bg-red-50 hover:text-red-600`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Eliminar
        </button>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!busy) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="rounded-cq-lg border-cq-line">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar página</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará esta página. No podrás recuperarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                onDelete();
                setConfirmOpen(false);
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </article>
  );
}

export default MagicPageCard;
