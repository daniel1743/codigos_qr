import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/template-builder")({
  head: () => ({
    meta: [
      { title: "Template Builder — Canvas Engine" },
      {
        name: "description",
        content: "Visual template builder for creating reusable bio link templates",
      },
    ],
  }),
  component: TemplateBuilderPage,
});

function TemplateBuilderPage() {
  return (
    <iframe
      src="/template-builder.html"
      className="h-[100dvh] w-full border-0"
      title="Template Builder"
    />
  );
}
