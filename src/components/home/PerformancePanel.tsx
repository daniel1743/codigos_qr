import { Activity, Eye, Link2, MessageCircle, Sparkles } from "lucide-react";
import type { HomeAnalyticsStatus } from "./useHomeAnalytics";

/**
 * F2 — Home / Command Center: performance panel.
 *
 * Consumes ONLY the existing legacy Analytics page summary (read-only, same contract
 * as the Analytics screen's legacy view). Rules:
 *  - no metric is rendered without a real source;
 *  - an all-zero summary renders an honest empty state instead of a fake grid;
 *  - the optional chart is fed by the summary's own `dailyVisits` (no new pipeline).
 */
export function PerformancePanel({
  status,
  days,
  visits,
  buttonClicks,
  whatsappClicks,
  interest,
  daily,
}: {
  status: HomeAnalyticsStatus;
  days: number;
  visits: number;
  buttonClicks: number;
  whatsappClicks: number;
  interest: number;
  daily: Array<{ date: string; count: number }>;
}) {
  const hasActivity = visits + buttonClicks + whatsappClicks + interest > 0;
  const kpis = [
    { id: "visits", label: "Visitas", value: visits, hint: "páginas vistas", icon: Eye },
    {
      id: "clicks",
      label: "Clics en botones",
      value: buttonClicks,
      hint: "en tus enlaces y botones",
      icon: Link2,
    },
    {
      id: "whatsapp",
      label: "Clics en WhatsApp",
      value: whatsappClicks,
      hint: "personas tocaron tu WhatsApp",
      icon: MessageCircle,
    },
    ...(interest > 0
      ? [
          {
            id: "interest",
            label: "Interés",
            value: interest,
            hint: "en productos o servicios",
            icon: Sparkles,
          },
        ]
      : []),
  ];

  const points = daily.filter((item) => item.count >= 0);
  const max = points.reduce((acc, item) => (item.count > acc ? item.count : acc), 0);
  const best = points.reduce<{ date: string; count: number } | null>(
    (acc, item) => (acc === null || item.count > acc.count ? item : acc),
    null,
  );

  return (
    <section
      aria-labelledby="home-performance-heading"
      className="min-w-0 rounded-cq-xl border border-cq-line bg-white p-5 shadow-soft sm:p-6"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="home-performance-heading" className="text-[15px] font-bold text-cq-ink">
          Rendimiento
        </h2>
        <p className="text-[12.5px] text-cq-subtle">Últimos {days} días · datos reales</p>
      </header>

      {status === "loading" ? (
        <p className="mt-4 text-[13.5px] text-cq-muted">Cargando tu rendimiento…</p>
      ) : status === "error" ? (
        <p className="mt-4 text-[13.5px] text-cq-muted">
          No pudimos cargar tu rendimiento ahora mismo.
        </p>
      ) : !hasActivity ? (
        <div className="mt-4 rounded-cq-md border border-dashed border-cq-line bg-cq-canvas px-4 py-6 text-center">
          <Activity className="mx-auto h-5 w-5 text-cq-subtle" aria-hidden />
          <p className="mt-2 text-[13.5px] font-medium text-cq-ink">
            Aún no hay actividad registrada en los últimos {days} días.
          </p>
          <p className="mt-1 text-[12.5px] text-cq-muted">
            Comparte tu enlace o tu QR y aquí verás visitas y clics reales.
          </p>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-cq-md border border-cq-line bg-cq-line sm:grid-cols-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.id} className="min-w-0 bg-white px-4 py-3.5">
                  <dt className="flex items-center gap-1.5 text-[11.5px] font-medium text-cq-muted">
                    <Icon className="h-3.5 w-3.5 text-cq-blue" aria-hidden />
                    {kpi.label}
                  </dt>
                  <dd className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.03em] text-cq-ink tabular-nums">
                    {kpi.value.toLocaleString("es-CL")}
                  </dd>
                  <dd className="mt-1 truncate text-[11.5px] text-cq-subtle">{kpi.hint}</dd>
                </div>
              );
            })}
          </dl>

          {points.length > 1 && max > 0 ? (
            <div className="mt-5">
              <div
                role="img"
                aria-label={`Visitas por día en los últimos ${days} días. Mejor día: ${best?.date ?? "—"} con ${best?.count ?? 0} visitas.`}
                className="h-[110px] w-full"
              >
                <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-full w-full">
                  <polyline
                    points={points
                      .map((item, index) => {
                        const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 0;
                        const y = 30 - (item.count / max) * 26;
                        return `${x.toFixed(2)},${y.toFixed(2)}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#1E56E0"
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              {best ? (
                <p className="mt-2 text-[12px] text-cq-subtle">
                  Mejor día: {best.date} con {best.count.toLocaleString("es-CL")} visitas.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default PerformancePanel;
