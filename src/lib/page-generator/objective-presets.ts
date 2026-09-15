import type { PageType } from "@/types/database";
import type {
  ContentNeedV2,
  DensityV2,
  ExperienceIntentV2,
  PrimaryGoalV2,
} from "@/lib/onboarding-v2/types";
import type { GeneratedItemKind, GeneratedPageObjective } from "./types";

export interface GeneratedPageObjectivePreset {
  objective: GeneratedPageObjective;
  /** Owner-facing label. Never internal jargon. */
  label: string;
  hint: string;
  /** Canonical `pages.page_type` for this objective. */
  pageType: PageType;
  goal: PrimaryGoalV2;
  experienceHint: ExperienceIntentV2;
  contentNeeds: readonly ContentNeedV2[];
  density: DensityV2;
  itemKind: GeneratedItemKind;
  /**
   * Media-led experiences need the owner's cover image for the engine to plan its
   * product / portfolio blocks. Never a fabricated asset.
   */
  requiresCover: boolean;
  /** Item section copy for the creation form. */
  itemsLabel: string;
  itemsHelp: string;
  maxItems: number;
}

export const GENERATED_PAGE_OBJECTIVE_PRESETS: Record<
  GeneratedPageObjective,
  GeneratedPageObjectivePreset
> = {
  services: {
    objective: "services",
    label: "Servicios",
    hint: "Muestra lo que ofreces y cómo te contactan",
    pageType: "services",
    goal: "show_services",
    experienceHint: "service_page",
    contentNeeds: ["services", "contact"],
    density: "complete",
    itemKind: "service",
    requiresCover: false,
    itemsLabel: "Tus servicios",
    itemsHelp: "Añade el nombre de cada servicio. Descripción y precio son opcionales.",
    maxItems: 6,
  },
  catalog: {
    objective: "catalog",
    label: "Catálogo",
    hint: "Presenta tus productos con imagen y precio",
    pageType: "catalog",
    goal: "sell",
    experienceHint: "catalog",
    contentNeeds: ["products", "contact"],
    density: "complete",
    itemKind: "product",
    requiresCover: true,
    itemsLabel: "Tus productos",
    itemsHelp:
      "Cada producto necesita una imagen (enlace https). Precio y enlace de compra son opcionales.",
    maxItems: 8,
  },
  portfolio: {
    objective: "portfolio",
    label: "Portafolio",
    hint: "Muestra tus trabajos y proyectos",
    pageType: "portfolio",
    goal: "show_portfolio",
    experienceHint: "professional_landing",
    contentNeeds: ["portfolio", "contact"],
    density: "complete",
    itemKind: "project",
    requiresCover: true,
    itemsLabel: "Tus trabajos",
    itemsHelp: "Cada trabajo necesita una imagen y un enlace (https) para poder abrirse.",
    maxItems: 6,
  },
  menu: {
    objective: "menu",
    label: "Menú",
    hint: "Tu carta o lista de precios",
    pageType: "menu",
    goal: "show_services",
    experienceHint: "service_page",
    contentNeeds: ["services", "contact"],
    density: "complete",
    itemKind: "service",
    requiresCover: false,
    itemsLabel: "Tu carta",
    itemsHelp: "Añade cada plato o servicio. El precio es opcional.",
    maxItems: 6,
  },
  promotion: {
    objective: "promotion",
    label: "Promoción",
    hint: "Una oferta o campaña concreta",
    pageType: "promotion",
    goal: "sell",
    experienceHint: "professional_landing",
    contentNeeds: ["services", "contact"],
    density: "simple",
    itemKind: "service",
    requiresCover: false,
    itemsLabel: "Lo que incluye",
    itemsHelp: "Añade cada beneficio o servicio promocionado. El precio es opcional.",
    maxItems: 6,
  },
  event: {
    objective: "event",
    label: "Evento",
    hint: "Una fecha y cómo participar",
    pageType: "event",
    goal: "bookings",
    experienceHint: "professional_landing",
    contentNeeds: ["contact"],
    density: "simple",
    itemKind: "event",
    requiresCover: false,
    itemsLabel: "Tus eventos",
    itemsHelp: "Añade el nombre de cada evento. La fecha es opcional.",
    maxItems: 6,
  },
};
