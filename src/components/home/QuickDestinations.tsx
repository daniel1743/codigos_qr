import { BarChart3, FileLock2, Globe2, Plus, QrCode, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";

const itemClass =
  "flex min-w-0 flex-col items-center gap-2 rounded-cq-md bg-white px-3 py-4 text-center ring-1 ring-cq-line transition-colors hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200";
const labelClass = "text-[12.5px] font-semibold text-cq-ink";

/**
 * F2 — Home / Command Center: quick access row.
 *
 * Only REAL destinations that already exist in the application are listed, gated by
 * the same real state the shell uses (`pageId` from the owned pages query). No invented
 * modules, no dead links.
 */
export function QuickDestinations({ pageId, canCreatePage }: { pageId: string | null; canCreatePage: boolean }) {
  return (
    <section aria-labelledby="home-quick-heading" className="min-w-0">
      <h2 id="home-quick-heading" className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-cq-subtle">
        Accesos rápidos
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {pageId ? (
          <Link to="/pages/$pageId" params={{ pageId }} className={itemClass}>
            <Globe2 className="h-5 w-5 text-cq-blue" aria-hidden />
            <span className={labelClass}>Mi página</span>
          </Link>
        ) : canCreatePage ? (
          <Link to="/pages/new" className={itemClass}>
            <Plus className="h-5 w-5 text-cq-blue" aria-hidden />
            <span className={labelClass}>Crear página</span>
          </Link>
        ) : null}
        <Link to="/qr" className={itemClass}>
          <QrCode className="h-5 w-5 text-cq-blue" aria-hidden />
          <span className={labelClass}>QR</span>
        </Link>
        {pageId ? (
          <Link to="/pages/$pageId/analytics" params={{ pageId }} className={itemClass}>
            <BarChart3 className="h-5 w-5 text-cq-blue" aria-hidden />
            <span className={labelClass}>Analytics</span>
          </Link>
        ) : null}
        <Link to="/encrypted-documents" className={itemClass}>
          <FileLock2 className="h-5 w-5 text-cq-blue" aria-hidden />
          <span className={labelClass}>Documentos</span>
        </Link>
        <Link to="/account" className={itemClass}>
          <Settings className="h-5 w-5 text-cq-blue" aria-hidden />
          <span className={labelClass}>Cuenta</span>
        </Link>
      </div>
    </section>
  );
}

export default QuickDestinations;
