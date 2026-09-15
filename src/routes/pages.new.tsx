import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { pageService } from "../services/page.service";
import { profileService } from "../services/profile.service";
import {
  GENERATED_PAGE_ACTION_LABELS,
  GENERATED_PAGE_OBJECTIVE_PRESETS,
  GENERATED_PAGE_OBJECTIVES,
  GENERATED_PAGE_STYLES,
  createGeneratedPage,
  type GeneratedItemKind,
  type GeneratedPageActionType,
  type GeneratedPageInput,
  type GeneratedPageItem,
  type GeneratedPageObjective,
  type GeneratedPageStyle,
} from "../lib/page-generator";
import type { PageType, Profile } from "../types/database";

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

const STYLE_OPTIONS: { value: GeneratedPageStyle; label: string }[] = [
  { value: "let_cripqer_decide", label: "Que lo decida Cripqer" },
  { value: "elegant", label: "Elegante" },
  { value: "minimal", label: "Minimalista" },
  { value: "modern", label: "Moderno" },
  { value: "professional", label: "Profesional" },
  { value: "energetic", label: "Enérgico" },
  { value: "premium", label: "Premium" },
];

type CtaSelection = GeneratedPageActionType | "none";

const CTA_OPTIONS: { value: CtaSelection; label: string }[] = [
  { value: "none", label: "Sin botón por ahora" },
  ...(Object.keys(GENERATED_PAGE_ACTION_LABELS) as GeneratedPageActionType[]).map((value) => ({
    value,
    label: GENERATED_PAGE_ACTION_LABELS[value],
  })),
];

const CTA_PLACEHOLDERS: Record<Exclude<CtaSelection, "none">, string> = {
  whatsapp: "+56 9 1234 5678",
  website: "https://tusitio.com",
  book: "https://tuagenda.com/reservar",
  follow: "@tucuenta",
  email: "hola@tunegocio.com",
};

type Mode = "choose" | "simple" | GeneratedPageObjective;

export const Route = createFileRoute("/pages/new")({ component: CreatePage });

function CreatePage() {
  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("choose");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        setProfile(await profileService.getProfileByUserId(supabase, auth.user.id));
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    })();
  }, [supabase]);

  const openEditor = (pageId: string) => {
    void navigate({ to: "/pages/$pageId/edit", params: { pageId } });
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-6 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "choose" ? "¿Qué quieres crear?" : "Crear página"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "choose"
              ? "Elige la experiencia que quieres sumar a tu negocio."
              : "Podrás revisar y editar todo antes de publicar."}
          </p>
        </header>

        {mode === "choose" && <ChooseStep onPick={setMode} />}
        {mode === "simple" && (
          <SimplePageForm onBack={() => setMode("choose")} onDone={openEditor} />
        )}
        {mode !== "choose" && mode !== "simple" && (
          <GeneratedPageForm
            objective={mode}
            profile={profile}
            onBack={() => setMode("choose")}
            onDone={openEditor}
          />
        )}
      </main>
    </AppShell>
  );
}

function ChooseStep({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <div className="space-y-3">
      {GENERATED_PAGE_OBJECTIVES.map((objective) => {
        const preset = GENERATED_PAGE_OBJECTIVE_PRESETS[objective];
        return (
          <Card key={objective}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-medium">{preset.label}</p>
                <p className="text-sm text-muted-foreground">{preset.hint}</p>
              </div>
              <Button variant="outline" onClick={() => onPick(objective)}>
                <Sparkles className="mr-2 h-4 w-4" /> Crear
              </Button>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="font-medium">Página simple</p>
            <p className="text-sm text-muted-foreground">
              Empieza en blanco y arma el contenido tú mismo.
            </p>
          </div>
          <Button variant="ghost" onClick={() => onPick("simple")}>
            <Plus className="mr-2 h-4 w-4" /> Elegir
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SimplePageForm({
  onBack,
  onDone,
}: {
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
      onDone(created.id);
    } catch (err) {
      console.error("Error creating page:", err);
      setError(err instanceof Error ? err.message : "No se pudo crear la página.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
        <Select value={pageType} onValueChange={(value) => setPageType(value as PageType)}>
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
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    </form>
  );
}

function emptyItem(): GeneratedPageItem {
  return { title: "" };
}

function GeneratedPageForm({
  objective,
  profile,
  onBack,
  onDone,
}: {
  objective: GeneratedPageObjective;
  profile: Profile | null;
  onBack: () => void;
  onDone: (pageId: string) => void;
}) {
  const supabase = getBrowserSupabaseClient();
  const preset = GENERATED_PAGE_OBJECTIVE_PRESETS[objective];

  const [title, setTitle] = useState(preset.label);
  const [businessName, setBusinessName] = useState(profile?.display_name ?? "");
  const [activity, setActivity] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [ctaType, setCtaType] = useState<CtaSelection>("none");
  const [ctaValue, setCtaValue] = useState("");
  const [style, setStyle] = useState<GeneratedPageStyle>("let_cripqer_decide");
  const [items, setItems] = useState<GeneratedPageItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.display_name && !businessName.trim()) setBusinessName(profile.display_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  const updateItem = (index: number, patch: Partial<GeneratedPageItem>) => {
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIssues([]);

    if (!profile?.id) {
      setError("No tienes un perfil activo. Crea tu página principal primero.");
      return;
    }

    const filledItems = items.filter((item) =>
      Object.values(item).some((value) => (value ?? "").trim().length > 0),
    );

    const input: GeneratedPageInput = {
      objective,
      title,
      businessName,
      activity,
      ...(description.trim() ? { description } : {}),
      ...(coverImageUrl.trim() ? { coverImageUrl } : {}),
      ...(ctaType !== "none" ? { cta: { type: ctaType, value: ctaValue } } : {}),
      style,
      items: filledItems,
    };

    setSubmitting(true);
    try {
      const result = await createGeneratedPage({
        supabase,
        profileId: profile.id,
        input,
      });

      if (result.status === "CREATED") {
        toast.success("Página generada. Revísala antes de publicar.");
        onDone(result.page.id);
        return;
      }

      setError(result.error);
      setIssues(result.issues ?? []);
      if (result.pageId) setCreatedPageId(result.pageId);
    } catch (err) {
      console.error("Error generating page:", err);
      setError("No se pudo generar la página.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="page-generator-form">
      <div className="space-y-2">
        <Label htmlFor="generated_title">Nombre de la página</Label>
        <Input
          id="generated_title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={preset.label}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="generated_business">Nombre de tu negocio</Label>
          <Input
            id="generated_business"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Ej. Barbería Norte"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="generated_activity">¿A qué te dedicas?</Label>
          <Input
            id="generated_activity"
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            placeholder="Ej. Barbería"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="generated_description">Descripción breve</Label>
        <Textarea
          id="generated_description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Cuéntale a tus clientes qué haces, en una o dos frases."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Escribe solo información real de tu negocio. La página se arma con lo que tú escribes.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="generated_cover">
          Imagen de portada (enlace https){preset.requiresCover ? "" : " — opcional"}
        </Label>
        <Input
          id="generated_cover"
          value={coverImageUrl}
          onChange={(event) => setCoverImageUrl(event.target.value)}
          placeholder="https://..."
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          {preset.requiresCover
            ? `Para ${preset.label.toLowerCase()} necesitamos una imagen real tuya: sin ella no podemos mostrar tus elementos.`
            : "Si la añades, la página usa tu propia imagen como portada."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="generated_cta">Botón principal</Label>
          <Select value={ctaType} onValueChange={(value) => setCtaType(value as CtaSelection)}>
            <SelectTrigger id="generated_cta" className="w-full">
              <SelectValue placeholder="Sin botón por ahora" />
            </SelectTrigger>
            <SelectContent>
              {CTA_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="generated_cta_value">Destino del botón</Label>
          <Input
            id="generated_cta_value"
            value={ctaValue}
            onChange={(event) => setCtaValue(event.target.value)}
            placeholder={ctaType === "none" ? "—" : CTA_PLACEHOLDERS[ctaType]}
            disabled={ctaType === "none"}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="generated_style">Estilo</Label>
        <Select value={style} onValueChange={(value) => setStyle(value as GeneratedPageStyle)}>
          <SelectTrigger id="generated_style" className="w-full">
            <SelectValue placeholder="Que lo decida Cripqer" />
          </SelectTrigger>
          <SelectContent>
            {STYLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ItemsEditor
        kind={preset.itemKind}
        label={preset.itemsLabel}
        help={preset.itemsHelp}
        max={preset.maxItems}
        items={items}
        onChange={updateItem}
        onAdd={() =>
          setItems((current) =>
            current.length >= preset.maxItems ? current : [...current, emptyItem()],
          )
        }
        onRemove={(index) =>
          setItems((current) =>
            current.length === 1 ? [emptyItem()] : current.filter((_, i) => i !== index),
          )
        }
      />

      {error && (
        <div className="space-y-1">
          <p className="text-sm text-destructive">{error}</p>
          {issues.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-muted-foreground">
              {issues.slice(0, 6).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {createdPageId && (
        <p className="text-sm text-muted-foreground">
          La página existe como borrador.{" "}
          <Link
            to="/pages/$pageId"
            params={{ pageId: createdPageId }}
            className="underline underline-offset-4"
          >
            Ábrela para revisarla
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? "Generando…" : `Generar ${preset.label.toLowerCase()}`}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    </form>
  );
}

function itemFieldsFor(kind: GeneratedItemKind): Array<keyof GeneratedPageItem> {
  switch (kind) {
    case "service":
      return ["title", "description", "price"];
    case "product":
      return ["title", "price", "imageUrl", "url"];
    case "project":
      return ["title", "description", "imageUrl", "url"];
    case "event":
      return ["title", "date"];
  }
}

const ITEM_FIELD_LABELS: Partial<Record<keyof GeneratedPageItem, string>> = {
  title: "Nombre",
  description: "Descripción",
  price: "Precio",
  imageUrl: "Imagen (https)",
  url: "Enlace (https)",
  date: "Fecha",
};

const ITEM_FIELD_PLACEHOLDERS: Partial<Record<keyof GeneratedPageItem, string>> = {
  title: "Ej. Corte clásico",
  description: "Opcional",
  price: "Ej. $8.000",
  imageUrl: "https://...",
  url: "https://...",
  date: "Ej. 12 de octubre",
};

function ItemsEditor({
  kind,
  label,
  help,
  max,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  kind: GeneratedItemKind;
  label: string;
  help: string;
  max: number;
  items: GeneratedPageItem[];
  onChange: (index: number, patch: Partial<GeneratedPageItem>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const fields = itemFieldsFor(kind);

  return (
    <section className="space-y-3" aria-label={label} data-testid="page-generator-items">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
        <p className="text-xs text-muted-foreground">{help}</p>
      </div>

      {items.map((item, index) => (
        <div key={index} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {index + 1}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              aria-label={`Quitar elemento ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={`item-${index}-${field}`}>{ITEM_FIELD_LABELS[field]}</Label>
                <Input
                  id={`item-${index}-${field}`}
                  value={(item[field] as string) ?? ""}
                  placeholder={ITEM_FIELD_PLACEHOLDERS[field]}
                  onChange={(event) => onChange(index, { [field]: event.target.value })}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        disabled={items.length >= max}
      >
        <Plus className="mr-2 h-4 w-4" /> Añadir otro
      </Button>
    </section>
  );
}
