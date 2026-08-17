import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Crea una página para todos tus enlaces
        </h1>
        <p className="text-lg text-muted-foreground">
          Reúne tus redes y páginas en un solo enlace y compártelo mediante un código QR.
        </p>
        <div>
          <Link
            to="/editor"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Crear mi página
          </Link>
        </div>
      </div>
    </div>
  );
}
