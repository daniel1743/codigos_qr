import { createFileRoute } from "@tanstack/react-router";
import { TemplateBankGallery } from "@/components/template-bank/TemplateBankGallery";

export const Route = createFileRoute("/template-bank")({
  head: () => ({
    meta: [
      { title: "Banco de Plantillas — Premium Templates" },
      {
        name: "description",
        content: "Galería de plantillas reutilizables para páginas bio link",
      },
    ],
  }),
  component: TemplateBankPage,
});

function TemplateBankPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-white">Banco de Plantillas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Selecciona una plantilla base para tu página bio link
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <TemplateBankGallery />
      </main>
    </div>
  );
}
