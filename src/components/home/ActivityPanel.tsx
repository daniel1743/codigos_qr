import { Activity, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * F2 — Home / Command Center: recent activity panel.
 *
 * There is NO canonical per-event feed for this screen today: the legacy Analytics
 * summary exposes aggregates only (`visits`, clicks, `dailyVisits`), and the canonical
 * event feed belongs to the CRIPQER Intelligent Analytics dashboard (F5). Rather than
 * inventing an activity list, F2 renders this honest empty state with a real shortcut.
 */
export function ActivityPanel({ analyticsPageId }: { analyticsPageId: string | null }) {
  return (
    <section
      aria-labelledby="home-activity-heading"
      className="min-w-0 rounded-cq-xl border border-cq-line bg-white p-5 shadow-soft sm:p-6"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="home-activity-heading" className="text-[15px] font-bold text-cq-ink">
          Actividad reciente
        </h2>
        {analyticsPageId ? (
          <Link
            to="/pages/$pageId/analytics"
            params={{ pageId: analyticsPageId }}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-cq-blue transition-colors hover:text-cq-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue-200"
          >
            Ver Analytics
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </header>

      <div className="mt-4 rounded-cq-md border border-dashed border-cq-line bg-cq-canvas px-4 py-6 text-center">
        <Activity className="mx-auto h-5 w-5 text-cq-subtle" aria-hidden />
        <p className="mt-2 text-[13.5px] font-medium text-cq-ink">
          Aún no hay actividad reciente disponible.
        </p>
        <p className="mt-1 text-[12.5px] text-cq-muted">
          Cuando tu página reciba las primeras visitas, aparecerán aquí.
        </p>
      </div>
    </section>
  );
}

export default ActivityPanel;
