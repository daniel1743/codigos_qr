import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { CqPageHeader } from "../components/cq-ui/CqPageHeader";
import { CqPanel } from "../components/cq-ui/CqPanel";
import { cqPrimaryButton, cqSecondaryButton } from "../components/cq-ui/buttonStyles";
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
import { pageCanonicalService } from "../services/page-canonical.service";
import { pageService } from "../services/page.service";
import { profileService } from "../services/profile.service";
import { createPageStarterConfig } from "../components/power-editor/pageStarterConfig";
import type { PageType, Profile } from "../types/database";

/**
 * F7 — `/pages/new` visual closure.
 *
 * Presentation-only migration to the F1 tokens + the F6 `cq-ui` kit (header,
 * panel, approved button recipes). Creation behaviour is untouched: the same
 * `pageService.createPage` call, the same canonical starter template through
 * `pageCanonicalService.saveDraft`, the same `toast` and the same
 * `/pages/$pageId/edit` destination after success.
 */

const PAGE_TYPE_OPTIONS: { value: PageType; label: string }[] = [
  { value: "landing", label: "Landing" },
  { value: "promotion", label: "Promoción" },
  { value: "menu", label: "Menú" },
  { value: "campaign", label: "Campaña" },
  { value: "event", label: "Evento" },
  { value: "services", label: "Servicios" },
  { value: "catalog", label: "Catálogo" },
  { value: "portfolio", label: "Portafolio" },
];

export const Route = createFileRoute("/pages/new")({ component: CreatePage });

function CreatePage() {
  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) setProfile(await profileService.getProfileByUserId(supabase, auth.user.id));
    })();
  }, [supabase]);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <CqPageHeader
          title="Crear página"
          description="Empieza con una plantilla completa y edítala con Power Editor antes de publicar."
        />
        <div className="mt-6 max-w-[720px]">
          <PageForm
            profile={profile}
            onBack={() => void navigate({ to: "/pages" })}
            onDone={(pageId) => void navigate({ to: "/pages/$pageId/edit", params: { pageId } })}
          />
        </div>
      </main>
    </AppShell>
  );
}

function PageForm({
  profile,
  onBack,
  onDone,
}: {
  profile: Profile | null;
  onBack: () => void;
  onDone: (pageId: string) => void;
}) {
  const supabase = getBrowserSupabaseClient();
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
    if (!profile?.id) {
      setError("No tienes un perfil activo. Crea tu página principal primero.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Debes iniciar sesión para crear una página.");

      const page = await pageService.createPage(supabase, {
        userId: auth.user.id,
        profileId: profile.id,
        title,
        pageType,
      });

      // Select an existing canonical template by page intent. This create flow
      // does not invoke Engine V2 or Smart Pages.
      const starter = createPageStarterConfig(title, pageType);
      await pageCanonicalService.saveDraft(supabase, page.id, auth.user.id, starter);

      toast.success("Página creada");
      onDone(page.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la página.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CqPanel headingId="create-page-form-heading" title="Datos de la página">
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
          <Label htmlFor="page_type">Tipo de página</Label>
          <Select value={pageType} onValueChange={(value) => setPageType(value as PageType)}>
            <SelectTrigger id="page_type" className="w-full">
              <SelectValue />
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
        <p className="text-[13px] leading-relaxed text-cq-muted">
          La página se crea como borrador con una plantilla canónica editable. Podrás cambiar
          plantilla, contenido, URL y publicación desde el Power Editor.
        </p>
        {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className={cqPrimaryButton} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            Crear página
          </button>
          <button type="button" className={cqSecondaryButton} onClick={onBack} disabled={submitting}>
            <ArrowLeft className="h-4 w-4 text-cq-muted" aria-hidden="true" /> Volver
          </button>
        </div>
      </form>
    </CqPanel>
  );
}
