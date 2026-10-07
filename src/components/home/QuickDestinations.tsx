import { BarChart3, FileLock2, Globe2, QrCode, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";

const itemClass =
  "flex min-h-[92px] min-w-0 flex-col items-center justify-center gap-2.5 rounded-cq-lg bg-white px-4 py-5 text-center ring-1 ring-cq-line transition-colors hover:bg-cq-canvas hover:ring-cq-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200";
const labelClass = "text-[13px] font-semibold text-cq-ink";

/**
 * F2 — Home / Command Center: quick access row.
 *
 * Only REAL destinations that already exist in the application are listed, gated by
 * the same real state the shell uses (`pageId` from the owned pages query). No invented
 * modules, no dead links.
 */
export function QuickDestinations({ pageId }: { pageId: string | null }) {
  return (
    <section aria-labelledby="home-quick-heading" className="min-w-0">
      <h2
        id="home-quick-heading"
        className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-cq-subtle"
      >
        Accesos rápidos
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {pageId ? (
          <Link to="/pages/$pageId" params={{ pageId }} className={itemClass}>
            <Globe2 className="h-5 w-5 text-cq-blue" aria-hidden />
            <span className={labelClass}>Mi página</span>
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
