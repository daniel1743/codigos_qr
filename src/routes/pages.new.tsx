import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { pageService } from "../services/page.service";
import { profileService } from "../services/profile.service";
import type { PageType } from "../types/database";

const PAGE_TYPE_OPTIONS: { value: PageType; label: string }[] = [
  { value: "landing", label: "Landing" },
  { value: "promotion", label: "Promoción" },
  { value: "menu", label: "Menú" },
  { value: "campaign", label: "Campaña" },
  { value: "event", label: "Evento" },
];

export const Route = createFileRoute("/pages/new")({ component: CreatePage });

function CreatePage() {
  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [pageType, setPageType] = useState<PageType>("landing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("El nombre de la página es obligatorio.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setError("Debes iniciar sesión para crear una página.");
        return;
      }

      const profile = await profileService.getProfileByUserId(supabase, auth.user.id);
      if (!profile) {
        setError("No tienes un perfil activo. Crea tu página principal primero.");
        return;
      }

      const created = await pageService.createPage(supabase, {
        userId: auth.user.id,
        profileId: profile.id,
        title,
        pageType,
      });

      toast.success("Página creada");
      navigate({ to: "/pages/$pageId", params: { pageId: created.id } });
    } catch (err) {
      console.error("Error creating page:", err);
      setError(err instanceof Error ? err.message : "No se pudo crear la página.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-6 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Crear página</h1>
          <p className="text-sm text-muted-foreground">
            Crea una página adicional para tu perfil.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="page_title">Nombre de la página</Label>
            <Input
              id="page_title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Promo septiembre"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page_type">Objetivo</Label>
            <Select
              value={pageType}
              onValueChange={(value) => setPageType(value as PageType)}
            >
              <SelectTrigger id="page_type" className="w-full">
                <SelectValue placeholder="Selecciona un objetivo" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear página
            </Button>
            <Button asChild variant="ghost">
              <Link to="/pages">Cancelar</Link>
            </Button>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
