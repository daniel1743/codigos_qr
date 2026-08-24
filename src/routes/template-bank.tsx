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
  return <TemplateBankGallery />;
}
