import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getTemplates, incrementTemplateUsage, type TemplateConfig } from "@/services/template.service";
import { toast } from "sonner";

export function TemplateBankGallery() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [filter, setFilter] = useState<"all" | "premium" | "private">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await getTemplates(filter);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("No se pudieron cargar las plantillas");
    } finally {
      setLoading(false);
    }
  }

  async function useTemplate(template: TemplateConfig) {
    try {
      // Increment usage count
      await incrementTemplateUsage(template.id);

      // Store template config in localStorage for the editor to pick up
      localStorage.setItem(
        "selected-template-config",
        JSON.stringify(template.config_json)
      );

      toast.success("Plantilla cargada", {
        description: `"${template.name}" lista para usar`,
      });

      // Navigate to editor
      navigate({ to: "/editor" });
    } catch (error) {
      console.error("Error using template:", error);
      toast.error("No se pudo cargar la plantilla");
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === "all"
              ? "border-b-2 border-pink-500 text-pink-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter("premium")}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === "premium"
              ? "border-b-2 border-pink-500 text-pink-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Premium
        </button>
        <button
          onClick={() => setFilter("private")}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === "private"
              ? "border-b-2 border-pink-500 text-pink-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Privadas
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Cargando plantillas...</div>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-slate-400">No hay plantillas disponibles</p>
          <a
            href="/template-builder"
            className="mt-4 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
          >
            Crear Nueva Plantilla
          </a>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 transition hover:border-pink-500/50"
            >
              {/* Preview Image */}
              <div className="aspect-[9/16] overflow-hidden bg-slate-800">
                {template.preview_image ? (
                  <img
                    src={template.preview_image}
                    alt={template.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-600">
                    Sin vista previa
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  {template.template_type === "premium" && (
                    <span className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      PREMIUM
                    </span>
                  )}
                </div>

                {template.description && (
                  <p className="mb-3 text-xs text-slate-400">
                    {template.description}
                  </p>
                )}

                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>Usos: {template.usage_count}</span>
                </div>

                <button
                  onClick={() => useTemplate(template)}
                  className="w-full rounded-lg bg-pink-600 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
                >
                  Usar Plantilla
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Button */}
      <div className="fixed bottom-6 right-6">
        <a
          href="/template-builder"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 transition hover:scale-110"
          title="Crear nueva plantilla"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
