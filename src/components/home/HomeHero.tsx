import { ArrowUpRight, Pencil, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { editRouteSearch } from "./editRouteSearch";

/**
 * F2 — Home / Command Center: welcome block.
 *
 * Real data only: the first name comes from the authenticated profile and the
 * visitor line is rendered ONLY when a real 30-day visit count exists. No mocked
 * numbers, no invented comparisons.
 */
export function HomeHero({
  firstName,
  hasPage,
  editPageId,
  visits30d,
  onCreate,
  creating,
  canCreatePage,
}: {
  firstName: string;
  hasPage: boolean;
  editPageId: string | null;
  visits30d: number | null;
  onCreate: () => void;
  creating: boolean;
  canCreatePage: boolean;
}) {
  const audienceLine =
    visits30d !== null && visits30d > 0
      ? `${visits30d.toLocaleString("es-CL")} ${visits30d === 1 ? "persona vio" : "personas vieron"} tu página en los últimos 30 días.`
      : "Comparte tu enlace para empezar a recibir visitas.";

  const primaryClass =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-cq-sm bg-cq-blue px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(30,86,224,0.6)] transition-[background-color,transform] hover:bg-cq-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cq-blue-200";

  return (
    <section className="relative isolate min-w-0">
      {/* Purely decorative organic shape (Magic parity) — no interaction, no data.
          Clipped by its own layer so it never affects scroll or focus rings. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <svg
          focusable="false"
          className="absolute -right-32 -top-40 hidden w-[520px] sm:block"
          viewBox="0 0 520 440"
          fill="none"
        >
          <path
            d="M421 64c63 40 97 125 77 199-21 76-99 133-180 147-83 15-171-15-214-82C61 262 52 169 97 107 143 44 243 10 314 18c40 4 76 23 107 46z"
            fill="#F3F7FF"
          />
        </svg>
      </div>

      <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-cq-blue">
        Centro de control
      </p>
      <h1 className="mt-3 break-words text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-cq-ink sm:text-[52px]">
        Hola, {firstName}
      </h1>
      <p className="mt-4 max-w-[560px] text-[15.5px] leading-relaxed text-cq-muted">
        {hasPage
          ? "Este es el estado real de tu página: identidad pública, rendimiento y accesos rápidos."
          : "Aún no tienes una página. Créala para publicar tu identidad, tus enlaces y tu QR."}
      </p>
      <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-cq-subtle">{audienceLine}</p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {editPageId ? (
          <Link
            to="/pages/$pageId/edit"
            params={{ pageId: editPageId }}
            search={editRouteSearch}
            className={primaryClass}
          >
            <Pencil className="h-[17px] w-[17px]" aria-hidden />
            Editar página
          </Link>
        ) : null}
        {!editPageId && canCreatePage ? (
          <button type="button" onClick={onCreate} disabled={creating} className={primaryClass}>
            {creating ? (
              "Creando…"
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden />
                Crear página
              </>
            )}
          </button>
        ) : null}
        {editPageId ? (
          <Link
            to="/pages/$pageId/analytics"
            params={{ pageId: editPageId }}
            className="inline-flex min-h-12 items-center gap-2 rounded-cq-sm bg-white px-5 text-[14.5px] font-semibold text-cq-ink ring-1 ring-cq-line transition-colors hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cq-blue-200"
          >
            Ver Analytics
            <ArrowUpRight className="h-4 w-4 text-cq-subtle" aria-hidden />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export default HomeHero;
