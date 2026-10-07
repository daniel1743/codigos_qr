import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Crown,
  FileLock2,
  LayoutTemplate,
  Mail,
  Palette,
  QrCode,
  Rocket,
  Search,
  SearchX,
  UserRound,
} from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { CqPageHeader } from "../components/cq-ui/CqPageHeader";
import { CqPanel } from "../components/cq-ui/CqPanel";
import { cqPrimaryButton, cqSecondaryButton } from "../components/cq-ui/buttonStyles";
import { SupportAssistantChat } from "../components/help/SupportAssistantChat";
import { MySupportTickets } from "../components/help/MySupportTickets";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchHelpArticles,
  type HelpArticle,
} from "../lib/help-content";

/**
 * Ayuda y soporte V1 — centro de ayuda autenticado.
 *
 * Auditoría previa (EMPTY): el acceso "Ayuda y soporte" de DesktopSidebar y
 * MobileDrawer apuntaba a /account, que no tenía ninguna sección de ayuda.
 *
 * Esta V1 reutiliza exclusivamente el lenguaje cq-* aprobado (CqPageHeader,
 * CqPanel, buttonStyles) dentro del AppShell existente. El buscador filtra los
 * artículos reales de `help-content.ts`; las categorías filtran la misma lista.
 * El canal de soporte NO está confirmado en el repo (no hay email/WhatsApp
 * oficial de Cripqer), así que la acción de contacto se presenta deshabilitada
 * con la razón visible — sin destinos inventados.
 */

const CATEGORY_ICONS: Record<string, typeof Rocket> = {
  rocket: Rocket,
  layout: LayoutTemplate,
  qr: QrCode,
  palette: Palette,
  chart: BarChart3,
  lock: FileLock2,
  user: UserRound,
  alert: AlertTriangle,
};

function FaqItem({ article }: { article: HelpArticle }) {
  return (
    <details className="group border-b border-cq-line last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[14px] font-semibold text-cq-ink [&::-webkit-details-marker]:hidden">
        {article.question}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-cq-subtle transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className="pb-4 pr-8 text-[13.5px] leading-relaxed text-cq-muted">{article.answer}</p>
    </details>
  );
}

function HelpPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // Se incrementa al crear un ticket para que «Mis tickets» vuelva a consultar.
  const [ticketsVersion, setTicketsVersion] = useState(0);

  const results = useMemo(() => searchHelpArticles(query), [query]);
  const visible = useMemo(
    () => (activeCategory ? results.filter((a) => a.category === activeCategory) : results),
    [results, activeCategory],
  );
  const searching = query.trim().length > 0;

  const categoriesWithCounts = useMemo(
    () =>
      HELP_CATEGORIES.map((category) => ({
        ...category,
        count: HELP_ARTICLES.filter((a) => a.category === category.id).length,
      })).filter((category) => category.count > 0),
    [],
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
        {/* A. Encabezado */}
        <CqPageHeader
          title="Ayuda y soporte"
          description="¿En qué podemos ayudarte? Encuentra respuestas sobre tu página, tus códigos QR y tu cuenta."
        />

        {/* B. Buscador real sobre los artículos de la V1 */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-cq-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en la ayuda… (p. ej. «publicar», «QR», «colores»)"
            aria-label="Buscar en la ayuda"
            className="min-h-12 w-full rounded-cq-sm border border-cq-line bg-white pl-11 pr-4 text-[14px] text-cq-ink placeholder:text-cq-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue"
          />
        </div>

        {/* C. Categorías */}
        {!searching && (
          <nav
            aria-label="Categorías de ayuda"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {categoriesWithCounts.map((category) => {
              const Icon = CATEGORY_ICONS[category.icon] ?? Rocket;
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(active ? null : category.id)}
                  aria-pressed={active}
                  className={`flex min-h-16 items-center gap-3 rounded-cq-lg border bg-white p-4 text-left shadow-soft transition-colors ${
                    active ? "border-cq-blue bg-cq-blue-50" : "border-cq-line hover:bg-cq-canvas"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-cq-md ${
                      active ? "bg-white text-cq-blue" : "bg-cq-blue-50 text-cq-blue"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-cq-ink">
                      {category.label}
                    </span>
                    <span className="block truncate text-[12.5px] text-cq-muted">
                      {category.description} · {category.count}{" "}
                      {category.count === 1 ? "artículo" : "artículos"}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Resultado de búsqueda vacío (estado honesto, no buscador falso) */}
        {searching && visible.length === 0 && (
          <CqPanel className="p-8 text-center">
            <SearchX className="mx-auto h-8 w-8 text-cq-subtle" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold text-cq-ink">
              Sin resultados para “{query.trim()}”
            </p>
            <p className="mx-auto mt-1 max-w-[420px] text-[13.5px] leading-relaxed text-cq-muted">
              Prueba con otras palabras o contacta soporte más abajo.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory(null);
              }}
              className={`${cqSecondaryButton} mt-4`}
            >
              Limpiar búsqueda
            </button>
          </CqPanel>
        )}

        {/* D. FAQ / artículos */}
        {(activeCategory || searching || visible.length > 0) && (
          <CqPanel
            headingId="help-articles-heading"
            title={
              searching
                ? `${visible.length} ${visible.length === 1 ? "resultado" : "resultados"} para “${query.trim()}”`
                : activeCategory
                  ? (categoriesWithCounts.find((c) => c.id === activeCategory)?.label ??
                    "Artículos")
                  : "Preguntas frecuentes"
            }
            actions={
              activeCategory ? (
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-cq-blue hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Ver todo
                </button>
              ) : undefined
            }
          >
            <div>
              {visible.map((article) => (
                <FaqItem key={article.id} article={article} />
              ))}
            </div>
          </CqPanel>
        )}

        {/* Transición: de la FAQ al asistente */}
        <div className="text-center">
          <h2 className="text-[17px] font-semibold text-cq-ink">
            ¿No encontraste lo que buscabas?
          </h2>
          <p className="mx-auto mt-1.5 max-w-[520px] text-[13.5px] leading-relaxed text-cq-muted">
            Pregúntale al asistente de Cripqer. Cuéntale qué necesitas y te ayudará a encontrar la
            respuesta.
          </p>
        </div>

        {/* E. Asistente de ayuda (chat IA server-side) + seguimiento de tickets */}
        <SupportAssistantChat onTicketCreated={() => setTicketsVersion((v) => v + 1)} />

        <MySupportTickets refreshToken={ticketsVersion} />

        <CqPanel
          headingId="help-contact-heading"
          title="Contactar soporte"
          description="¿No encontraste lo que buscabas? El asistente puede escalar tu consulta creando un ticket; el canal directo por correo está en preparación."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled
              aria-describedby="support-channel-pending"
              className={`${cqPrimaryButton} cursor-not-allowed opacity-60 sm:w-auto`}
              title="Canal de soporte aún no disponible"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Escribir a soporte
            </button>
            <p id="support-channel-pending" className="text-[12.5px] leading-relaxed text-cq-muted">
              El canal directo de soporte se está habilitando. Mientras tanto, todas las respuestas
              de esta sección están actualizadas.
            </p>
          </div>
        </CqPanel>

        {/* F. Volver (navegación de regreso real) */}
        <div>
          <Link to="/account" className={cqSecondaryButton}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a Cuenta
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/help")({
  component: HelpPage,
});
