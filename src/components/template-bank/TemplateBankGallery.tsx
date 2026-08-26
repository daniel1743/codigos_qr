import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Eye,
  Heart,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { getPremiumOverrideByEmail, getUserEntitlements } from "@/lib/entitlements";
import { CleanTemplatePreview } from "../admin/CleanTemplatePreview";
import {
  getPublicTemplates,
  incrementTemplateUsage,
  type PublicTemplateViewModel,
} from "@/services/template.service";

const FALLBACK_IMG =
  "https://placehold.co/720x1280/1E1E1E/9CA3AF?text=Vista+previa+no+disponible";

const ADVANCED_TAGS = [
  "WhatsApp",
  "Reservas",
  "Catálogo",
  "Menú",
  "Portafolio",
  "Agenda",
  "Redes",
  "Mapa",
];

type PlanFilter = "all" | "free" | "premium" | "favorites";
type SortFilter = "popular" | "recent" | "trend";

interface Filters {
  search: string;
  plan: PlanFilter;
  industry: string;
  category: string;
  style: string;
  palette: string;
  themeMode: "all" | "light" | "dark";
  activeTags: string[];
  sort: SortFilter;
}

function validatePreviewUrl(url: string): string {
  if (!url) return FALLBACK_IMG;

  try {
    if (url.startsWith("/")) return url;
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return FALLBACK_IMG;
    return parsed.href;
  } catch {
    return FALLBACK_IMG;
  }
}

function getFavoriteStorageKey(userId?: string) {
  return `cripqer-template-favorites:${userId || "anonymous"}`;
}

export function TemplateBankGallery() {
  const navigate = useNavigate();
  const supabase = getBrowserSupabaseClient();
  const [templates, setTemplates] = useState<PublicTemplateViewModel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    plan: "all",
    industry: "all",
    category: "all",
    style: "all",
    palette: "all",
    themeMode: "all",
    activeTags: [],
    sort: "popular",
  });
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [modalTemplate, setModalTemplate] = useState<PublicTemplateViewModel | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [useInFlightId, setUseInFlightId] = useState<string | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setCurrentUserId(user?.id);
      const stored = window.localStorage.getItem(getFavoriteStorageKey(user?.id));
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setFavorites(parsed.filter((item) => typeof item === "string"));
        } catch {
          setFavorites([]);
        }
      }
    });
  }, [supabase]);

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(getFavoriteStorageKey(currentUserId), JSON.stringify(favorites));
  }, [favorites, currentUserId]);

  useEffect(() => {
    if (!modalTemplate) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 50);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
      lastFocusedRef.current?.focus();
    };
  }, [modalTemplate]);

  async function loadTemplates() {
    setLoading(true);
    setHasError(false);
    try {
      const data = await getPublicTemplates();
      setTemplates(data.filter((template) => template.status === "PUBLIC"));
    } catch (error) {
      console.error("[Cripqer] Error loading public templates:", error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => Array.from(new Set(templates.map((t) => t.category).filter(Boolean))).sort(), [templates]);
  const industries = useMemo(() => Array.from(new Set(templates.map((t) => t.industry).filter(Boolean))).sort(), [templates]);
  const styles = useMemo(() => Array.from(new Set(templates.map((t) => t.style).filter(Boolean))).sort(), [templates]);
  const palettes = useMemo(() => Array.from(new Set(templates.map((t) => t.palette).filter(Boolean))).sort(), [templates]);

  const filteredTemplates = useMemo(() => {
    let result = templates.filter((template) => template.status === "PUBLIC");
    const term = filters.search.trim().toLowerCase();

    if (term) {
      result = result.filter((template) => {
        return (
          template.name.toLowerCase().includes(term) ||
          template.industry.toLowerCase().includes(term) ||
          template.category.toLowerCase().includes(term) ||
          template.tags.some((tag) => tag.toLowerCase().includes(term))
        );
      });
    }

    if (filters.plan === "free") result = result.filter((t) => t.plan === "free");
    if (filters.plan === "premium") result = result.filter((t) => t.plan === "premium");
    if (filters.plan === "favorites") result = result.filter((t) => favorites.includes(t.id));
    
    if (filters.industry !== "all") result = result.filter((t) => t.industry === filters.industry);
    if (filters.category !== "all") result = result.filter((t) => t.category === filters.category);
    if (filters.style !== "all") result = result.filter((t) => t.style === filters.style);
    if (filters.palette !== "all") result = result.filter((t) => t.palette === filters.palette);
    if (filters.themeMode !== "all") result = result.filter((t) => t.themeMode === filters.themeMode);

    if (filters.activeTags.length > 0) {
      result = result.filter((template) =>
        filters.activeTags.every((tag) => template.tags.includes(tag)),
      );
    }

    return [...result].sort((a, b) => {
      if (filters.sort === "popular") return b.usageCount - a.usageCount;
      if (filters.sort === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return (Number(b.isFeatured) * 1000 + b.usageCount) - (Number(a.isFeatured) * 1000 + a.usageCount);
    });
  }, [templates, filters, favorites]);

  function toggleFavorite(templateId: string) {
    setFavorites((previous) =>
      previous.includes(templateId)
        ? previous.filter((id) => id !== templateId)
        : [...previous, templateId],
    );
  }

  async function userCanUsePremium() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const override = getPremiumOverrideByEmail(user.email);
    if (override) return override.canUsePremiumTemplates;
    const entitlements = await getUserEntitlements(user.id);
    return entitlements.canUsePremiumTemplates;
  }

  async function useTemplate(template: PublicTemplateViewModel) {
    if (useInFlightId) return;
    setUseInFlightId(template.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Inicia sesión para usar plantillas");
        return;
      }

      if (template.status !== "PUBLIC") {
        toast.error("Plantilla no disponible");
        return;
      }

      if (template.plan === "premium" && !(await userCanUsePremium())) {
        toast.info("Plantilla Premium", {
          description: "Tu cuenta actual no tiene acceso Premium.",
        });
        return;
      }

      await incrementTemplateUsage(template.id);

      // TF-F10: Create an editable user-owned instance from a published master template.
      const { createTemplate } = await import("@/services/template.service");
      
      const clonedConfig = {
        ...structuredClone(template.config || {}),
        origin_metadata: {
          source_template_id: template.id,
          source_template_version: template.config?.schema_version || 1
        }
      };

      const userClone = await createTemplate({
        name: `Copia de ${template.name}`,
        config_json: clonedConfig,
        template_type: "private",
        is_public: false,
        publication_status: "GENERATED_PRIVATE",
        industry: template.industry,
        category: template.category,
        style: template.style,
        theme: template.themeMode === "dark" || template.themeMode === "light" ? template.themeMode : undefined,
        generation_source: "CLONED_FROM_PUBLIC",
      });

      // Pass the clone to the builder so it saves to the user's private copy (Editor Básico flow)
      window.localStorage.setItem("selected-template-config", JSON.stringify(userClone.config_json));
      window.localStorage.setItem("selected-source-template-id", userClone.id);
      
      toast.success("Plantilla preparada", {
        description: `"${template.name}" lista para el editor.`,
      });
      navigate({ to: "/template-builder" });
    } catch (error) {
      console.error("[Cripqer] Error using template:", error);
      toast.error("No se pudo preparar la plantilla");
    } finally {
      setUseInFlightId(null);
    }
  }

  function clearFilters() {
    setFilters({ search: "", plan: "all", category: "all", activeTags: [], sort: "popular" });
  }

  function onModalKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setModalTemplate(null);
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-28 lg:pb-0">
      <header className="sticky top-0 z-20 border-b border-[#2A2A2A] bg-[#121212]/95 px-4 pb-4 pt-8 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Explora plantillas</h1>
            <div className="w-full transition-transform focus-within:scale-[1.01] md:w-1/2 lg:w-2/5">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((previous) => ({ ...previous, search: event.target.value }))
                  }
                  placeholder="Buscar por nombre o rubro..."
                  className="w-full rounded-full border border-[#2A2A2A] bg-[#1E1E1E] py-3.5 pl-12 pr-12 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-[#4A4A4A] focus:bg-[#242424] focus-visible:ring-2 focus-visible:ring-[#FF3366]"
                  aria-label="Buscar plantillas"
                />
                <div className="absolute right-2">
                  <button
                    type="button"
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
                    aria-label="Filtros avanzados"
                    aria-expanded={advancedOpen}
                    onClick={() => setAdvancedOpen((open) => !open)}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </button>
                  {advancedOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-[#3A3A3A] bg-[#1E1E1E] p-4 shadow-2xl flex flex-col gap-4">
                      
                      {/* Industry Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1 block">Industria</label>
                        <select
                          value={filters.industry}
                          onChange={(e) => setFilters(p => ({ ...p, industry: e.target.value }))}
                          className="w-full rounded border border-[#2A2A2A] bg-[#121212] p-2 text-sm text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF3366]"
                        >
                          <option value="all">Todas</option>
                          {industries.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>

                      {/* Style Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1 block">Estilo</label>
                        <select
                          value={filters.style}
                          onChange={(e) => setFilters(p => ({ ...p, style: e.target.value }))}
                          className="w-full rounded border border-[#2A2A2A] bg-[#121212] p-2 text-sm text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF3366]"
                        >
                          <option value="all">Todos</option>
                          {styles.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Palette Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1 block">Paleta / Tono</label>
                        <select
                          value={filters.palette}
                          onChange={(e) => setFilters(p => ({ ...p, palette: e.target.value }))}
                          className="w-full rounded border border-[#2A2A2A] bg-[#121212] p-2 text-sm text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF3366]"
                        >
                          <option value="all">Todas</option>
                          {palettes.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>

                      {/* Theme Mode Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1 block">Tema</label>
                        <select
                          value={filters.themeMode}
                          onChange={(e) => setFilters(p => ({ ...p, themeMode: e.target.value as any }))}
                          className="w-full rounded border border-[#2A2A2A] bg-[#121212] p-2 text-sm text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF3366]"
                        >
                          <option value="all">Ambos</option>
                          <option value="light">Claro</option>
                          <option value="dark">Oscuro</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Características</label>
                        <div className="flex flex-col gap-2">
                          {ADVANCED_TAGS.map((tag) => (
                            <label
                              key={tag}
                              className="flex cursor-pointer items-center gap-2 text-sm text-gray-300 transition-colors hover:text-white"
                            >
                              <input
                                type="checkbox"
                                checked={filters.activeTags.includes(tag)}
                                onChange={(event) =>
                                  setFilters((previous) => ({
                                    ...previous,
                                    activeTags: event.target.checked
                                      ? [...previous.activeTags, tag]
                                      : previous.activeTags.filter((item) => item !== tag),
                                  }))
                                }
                                className="rounded border-gray-600 bg-[#2A2A2A] text-[#FF3366] focus:ring-[#FF3366]"
                              />
                              <span>{tag}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              ["all", "Todas"],
              ["free", "Gratis"],
              ["premium", "Premium"],
              ["favorites", "Favoritas"],
            ].map(([plan, label]) => (
              <button
                key={plan}
                type="button"
                onClick={() => setFilters((previous) => ({ ...previous, plan: plan as PlanFilter }))}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366] ${
                  filters.plan === plan
                    ? "border-white bg-white text-[#121212]"
                    : "border-[#2A2A2A] bg-[#1E1E1E] text-gray-300 hover:bg-[#2A2A2A]"
                }`}
              >
                {plan === "premium" && <Sparkles className="h-4 w-4 text-[#FF3366]" />}
                {plan === "favorites" && <Heart className="h-4 w-4" />}
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["all", ...categories].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilters((previous) => ({ ...previous, category }))}
                className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366] ${
                  filters.category === category
                    ? "bg-white text-[#121212]"
                    : "bg-[#1E1E1E] text-gray-400 hover:text-white"
                }`}
              >
                {category === "all" ? "Todos" : category}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              <strong className="text-white">{filteredTemplates.length}</strong> plantillas
            </span>
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, sort: event.target.value as SortFilter }))
              }
              className="cursor-pointer rounded bg-transparent py-0 pl-0 text-sm text-gray-300 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF3366]"
              aria-label="Ordenar por"
            >
              <option value="popular" className="bg-[#1E1E1E]">
                Mas populares
              </option>
              <option value="recent" className="bg-[#1E1E1E]">
                Mas recientes
              </option>
              <option value="trend" className="bg-[#1E1E1E]">
                En tendencia
              </option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 pt-4 md:p-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#FF3366]" />
            <p className="text-sm text-gray-400">Cargando plantillas...</p>
          </div>
        )}

        {!loading && hasError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-medium">Error de conexion</h3>
            <p className="mb-6 max-w-sm text-sm text-gray-400">
              No pudimos cargar las plantillas en este momento.
            </p>
            <button
              type="button"
              onClick={() => void loadTemplates()}
              className="rounded-full bg-[#1E1E1E] px-6 py-2 text-sm font-medium transition-colors hover:bg-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !hasError && filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1E1E1E]">
              <Search className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No encontramos plantillas</h3>
            <p className="mb-6 max-w-sm text-sm text-gray-400">
              No hay resultados que coincidan con tu busqueda y filtros actuales.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full bg-[#1E1E1E] px-6 py-2 text-sm font-medium transition-colors hover:bg-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {!loading && !hasError && filteredTemplates.length > 0 && (
          <div
            className="grid grid-cols-2 gap-4 transition-opacity duration-300 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5"
            role="list"
          >
            {filteredTemplates.map((template) => {
              const isFavorite = favorites.includes(template.id);
              const isBusy = useInFlightId === template.id;

              return (
                <article
                  key={template.id}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`Plantilla ${template.name}`}
                  onClick={() => setModalTemplate(template)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setModalTemplate(template);
                    }
                  }}
                  className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1E1E1E] outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-[#FF3366] hover:-translate-y-1 hover:border-[#3A3A3A] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)]"
                >
                  <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
                    <span
                      className={`rounded border px-2 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur ${
                        template.plan === "premium"
                          ? "border-[#FF3366]/30 bg-[#FF3366]/10 text-[#FF3366]"
                          : "border-gray-700/50 bg-[#121212]/80 text-gray-300"
                      }`}
                    >
                      {template.plan === "premium" ? "PRO" : "GRATIS"}
                    </span>
                  </div>
                  {template.isNew && (
                    <div className="absolute right-3 top-3 z-10">
                      <span className="rounded-full bg-[#FF3366]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                        Nuevo
                      </span>
                    </div>
                  )}
                  <img
                    className="h-full w-full bg-[#1E1E1E] object-cover"
                    src={validatePreviewUrl(template.previewUrl)}
                    alt={`Vista previa de ${template.name}`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = FALLBACK_IMG;
                    }}
                  />

                  <div className="absolute inset-0 z-10 hidden items-center justify-center gap-4 bg-[#121212]/60 backdrop-blur-sm group-hover:flex group-focus-within:flex">
                    <button
                      type="button"
                      aria-label="Alternar favorito"
                      aria-pressed={isFavorite}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(template.id);
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:scale-110 hover:bg-white hover:text-[#121212] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
                    >
                      <Heart className={`h-5 w-5 ${isFavorite ? "fill-[#FF3366] text-[#FF3366]" : ""}`} />
                    </button>
                    <button
                      type="button"
                      aria-label="Vista previa"
                      onClick={(event) => {
                        event.stopPropagation();
                        setModalTemplate(template);
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:scale-110 hover:bg-white hover:text-[#121212] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Usar plantilla"
                      disabled={Boolean(useInFlightId)}
                      onClick={(event) => {
                        event.stopPropagation();
                        void useTemplate(template);
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-[#FF3366] bg-[#FF3366] text-white transition hover:scale-105 hover:bg-[#E62E5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                    </button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-12">
                    <h3 className="truncate text-sm font-bold text-white transition-colors group-hover:text-[#FF3366] sm:text-base">
                      {template.name}
                    </h3>
                    <p className="mb-3 truncate text-xs font-medium text-gray-300">
                      {template.industry}
                    </p>
                    <div className="flex w-full gap-2 md:hidden">
                      <button
                        type="button"
                        disabled={Boolean(useInFlightId)}
                        onClick={(event) => {
                          event.stopPropagation();
                          void useTemplate(template);
                        }}
                        className="flex-1 rounded-lg bg-[#FF3366] py-2 text-xs font-medium text-white transition-colors hover:bg-[#E62E5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                      >
                        {isBusy ? "..." : "Usar"}
                      </button>
                      <button
                        type="button"
                        aria-label="Vista previa"
                        onClick={(event) => {
                          event.stopPropagation();
                          setModalTemplate(template);
                        }}
                        className="rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-3 py-2 text-white transition-colors hover:bg-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Alternar favorito"
                        aria-pressed={isFavorite}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(template.id);
                        }}
                        className="rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-3 py-2 text-white transition-colors hover:bg-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
                      >
                        <Heart className={`h-4 w-4 ${isFavorite ? "fill-[#FF3366] text-[#FF3366]" : ""}`} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {modalTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalTitle"
          onKeyDown={onModalKeyDown}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalTemplate(null);
          }}
        >
          <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#121212] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A] bg-[#121212]/90 p-4 backdrop-blur">
              <div className="flex min-w-0 items-center gap-3">
                <h2 id="modalTitle" className="truncate text-xl font-bold">
                  {modalTemplate.name}
                </h2>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    modalTemplate.plan === "premium"
                      ? "border border-[#FF3366]/30 bg-[#FF3366]/20 text-[#FF3366]"
                      : "bg-[#1E1E1E] text-gray-300"
                  }`}
                >
                  {modalTemplate.plan === "premium" ? "Premium" : "Gratis"}
                </span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setModalTemplate(null)}
                className="rounded-full bg-[#1E1E1E] p-2 text-white transition-colors hover:bg-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
                aria-label="Cerrar vista previa"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 justify-center overflow-y-auto bg-[#0a0a0a] p-4 md:p-8">
              <div className="relative overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <CleanTemplatePreview config={modalTemplate.config} deviceMode="mobile" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#2A2A2A] bg-[#121212] p-4">
              <button
                type="button"
                aria-label="Alternar favorito"
                aria-pressed={favorites.includes(modalTemplate.id)}
                onClick={() => toggleFavorite(modalTemplate.id)}
                className="flex items-center gap-2 rounded-xl bg-[#1E1E1E] p-3 text-white transition-colors hover:bg-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
              >
                <Heart
                  className={`h-5 w-5 ${
                    favorites.includes(modalTemplate.id) ? "fill-[#FF3366] text-[#FF3366]" : ""
                  }`}
                />
                <span className="hidden text-sm font-medium sm:inline">Favorito</span>
              </button>
              <button
                type="button"
                disabled={Boolean(useInFlightId)}
                onClick={() => void useTemplate(modalTemplate)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF3366] px-8 py-3 font-medium text-white transition-colors hover:bg-[#E62E5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 md:flex-none"
              >
                {useInFlightId === modalTemplate.id ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Wand2 className="h-5 w-5" />
                )}
                <span>Usar esta plantilla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
