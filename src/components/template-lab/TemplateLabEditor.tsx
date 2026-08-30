import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { ArrowLeft, Check, Eye, Loader2, Monitor, Send, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BasicTemplateRenderer } from "../basic-template/BasicTemplateRenderer";
import { getDefaultContent } from "@/lib/basic-templates/fixtures";
import { buildConfig } from "@/lib/basic-templates/config";
import { getTemplate, getTemplates } from "@/lib/basic-templates/catalog";
import { EDIT_TARGETS } from "@/types/basic-templates";
import type {
  BasicTemplateConfig,
  BasicTemplateContent,
  EditTargetRegistry,
} from "@/types/basic-templates";
import { TemplateThumbnail } from "./TemplateThumbnail";
import { ImageInput, LinksEditor } from "./controls";
import { CardsEditor, SocialsEditor } from "./controls-lists";
import { ContactEditor } from "./controls-contact";

const PREVIEW_WIDTHS = [320, 375, 390, 430];
const DESKTOP_WIDTH = 520;
const HIGHLIGHT_DURATION_MS = 700;
type LabMode = "editing" | "preview" | "publishing" | "success";

function requiredOption<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Template Lab requires a ${label} option.`);
  return value;
}

export interface TemplateLabPublishPayload {
  templateId: string;
  config: BasicTemplateConfig;
}

interface TemplateLabEditorProps {
  /** Future Basic Editor persistence injection point. Template Lab stays local. */
  onPublish?: (payload: TemplateLabPublishPayload) => void | Promise<void>;
}

export function TemplateLabEditor({ onPublish }: TemplateLabEditorProps) {
  const [templateId, setTemplateId] = useState("beauty-curve");
  const [content, setContent] = useState<BasicTemplateContent>(() =>
    getDefaultContent("beauty-curve"),
  );
  const [previewWidth, setPreviewWidth] = useState(375);
  const [isDesktop, setIsDesktop] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);
  const [mode, setMode] = useState<LabMode>("editing");
  const [publishError, setPublishError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const selectedTargetRef = useRef<string | null>(null);
  const targetsRef = useRef(new Map<string, HTMLElement>());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const template = getTemplate(templateId);
  const [paletteId, setPaletteId] = useState(
    () => requiredOption(template.customization.palettes[0], "palette").id,
  );
  const [fontPairId, setFontPairId] = useState(
    () => requiredOption(template.customization.fontPairs[0], "font pair").id,
  );
  const [buttonStyleId, setButtonStyleId] = useState(
    () => requiredOption(template.customization.buttonStyles[0], "button style").id,
  );
  const palette =
    template.customization.palettes.find((item) => item.id === paletteId) ??
    requiredOption(template.customization.palettes[0], "palette");
  const fontPair =
    template.customization.fontPairs.find((item) => item.id === fontPairId) ??
    requiredOption(template.customization.fontPairs[0], "font pair");
  const buttonStyle =
    template.customization.buttonStyles.find((item) => item.id === buttonStyleId) ??
    requiredOption(template.customization.buttonStyles[0], "button style");
  const config = buildConfig(template, content, { palette, fontPair, buttonStyle });

  const registry = useMemo<EditTargetRegistry>(
    () => ({
      register: (targetId, element) => {
        if (element) targetsRef.current.set(targetId, element);
        else targetsRef.current.delete(targetId);
      },
    }),
    [],
  );

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  const focusTarget = useCallback((targetId: string) => {
    const target = targetsRef.current.get(targetId);
    const viewport = canvasViewportRef.current;
    const changedTarget = selectedTargetRef.current !== targetId;
    selectedTargetRef.current = targetId;
    setSelectedTarget(targetId);
    if (!target || !viewport || !viewport.contains(target)) return;

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const visible =
      targetRect.top >= viewportRect.top + 12 && targetRect.bottom <= viewportRect.bottom - 12;
    if (changedTarget || !visible) {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      viewport.scrollBy({
        top: targetRect.top + targetRect.height / 2 - (viewportRect.top + viewportRect.height / 2),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedTarget(targetId);
    highlightTimerRef.current = setTimeout(() => setHighlightedTarget(null), HIGHLIGHT_DURATION_MS);
  }, []);

  const updateContent = (patch: Partial<BasicTemplateContent>) => {
    dirtyRef.current = true;
    setContent((current) => ({ ...current, ...patch }));
  };
  const updateProfile = (patch: Partial<BasicTemplateContent["profile"]>) => {
    dirtyRef.current = true;
    setContent((current) => ({ ...current, profile: { ...current.profile, ...patch } }));
  };
  const selectTemplate = (id: string) => {
    if (id === templateId) return;
    const next = getTemplate(id);
    setTemplateId(id);
    if (!dirtyRef.current) setContent(getDefaultContent(id));
    setPaletteId(requiredOption(next.customization.palettes[0], "palette").id);
    setFontPairId(requiredOption(next.customization.fontPairs[0], "font pair").id);
    setButtonStyleId(requiredOption(next.customization.buttonStyles[0], "button style").id);
    selectedTargetRef.current = null;
    setSelectedTarget(null);
    setHighlightedTarget(null);
    canvasViewportRef.current?.scrollTo({ top: 0, behavior: "auto" });
  };
  const publish = async () => {
    if (mode === "publishing") return;
    setPublishError(null);
    setMode("publishing");
    try {
      await onPublish?.({ templateId, config });
      window.setTimeout(() => setMode("success"), 480);
    } catch {
      setPublishError("No se pudo completar la publicación. Intenta de nuevo.");
      setMode("editing");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Template Lab</h1>
            <p className="text-xs text-muted-foreground">
              Edición local con preview en vivo · solo desarrollo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              {template.name} · {template.family}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMode("preview")}
              aria-label="Abrir vista previa completa"
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Vista previa
            </Button>
            <Button type="button" size="sm" onClick={publish} disabled={mode === "publishing"}>
              {mode === "publishing" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Publicar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 sm:py-6 lg:flex-row lg:items-start">
        <div className="order-1 w-full lg:order-2 lg:w-auto lg:shrink-0">
          <PreviewPane
            config={config}
            width={isDesktop ? DESKTOP_WIDTH : previewWidth}
            isDesktop={isDesktop}
            selectedTarget={selectedTarget}
            highlightedTarget={highlightedTarget}
            registry={registry}
            canvasViewportRef={canvasViewportRef}
            onWidth={setPreviewWidth}
            onToggleDesktop={() => setIsDesktop((value) => !value)}
            onOpenFullPreview={() => setMode("preview")}
          />
        </div>
        <div className="order-2 flex w-full flex-col gap-6 lg:order-1 lg:min-w-0 lg:flex-1">
          <TemplateSelector templateId={templateId} onSelect={selectTemplate} />
          <CustomizationControls
            template={template}
            paletteId={paletteId}
            fontPairId={fontPairId}
            buttonStyleId={buttonStyleId}
            onPalette={setPaletteId}
            onFontPair={setFontPairId}
            onButtonStyle={setButtonStyleId}
            onFocusTarget={focusTarget}
          />
          <ContentControls
            template={template}
            content={content}
            onProfile={updateProfile}
            onLinks={(links) => updateContent({ links })}
            onSocials={(socials) => updateContent({ socials })}
            onCards={(cards) => updateContent({ cards })}
            onContact={(contact) => updateContent({ contact })}
            onFocusTarget={focusTarget}
          />
          {publishError ? (
            <p role="alert" className="text-sm text-destructive">
              {publishError}
            </p>
          ) : null}
        </div>
      </main>
      {mode === "preview" ? (
        <FullPreview config={config} onClose={() => setMode("editing")} />
      ) : null}
      {mode === "success" ? (
        <PublishSuccess
          onContinue={() => setMode("editing")}
          onPreview={() => setMode("preview")}
        />
      ) : null}
    </div>
  );
}

function Fieldset({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function ContentControls({
  template,
  content,
  onProfile,
  onLinks,
  onSocials,
  onCards,
  onContact,
  onFocusTarget,
}: {
  template: ReturnType<typeof getTemplate>;
  content: BasicTemplateContent;
  onProfile: (patch: Partial<BasicTemplateContent["profile"]>) => void;
  onLinks: (value: BasicTemplateContent["links"]) => void;
  onSocials: (value: BasicTemplateContent["socials"]) => void;
  onCards: (value: BasicTemplateContent["cards"]) => void;
  onContact: (value: BasicTemplateContent["contact"]) => void;
  onFocusTarget: (targetId: string) => void;
}) {
  const has = (type: string) => template.editable.some((field) => field.type === type);
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Contenido</h2>
        <p className="text-sm text-muted-foreground">
          Toca un campo y el canvas encuentra el elemento correspondiente.
        </p>
      </div>
      <Fieldset title="Perfil">
        <ImageInput
          label="Avatar"
          value={content.profile.avatarUrl}
          onFocusTarget={() => onFocusTarget(EDIT_TARGETS.avatar)}
          onChange={(value) => onProfile({ avatarUrl: value })}
        />
        <ImageInput
          label="Imagen hero"
          value={content.profile.heroUrl}
          onFocusTarget={() => onFocusTarget(EDIT_TARGETS.hero)}
          onChange={(value) => onProfile({ heroUrl: value })}
        />
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input
            value={content.profile.name}
            onFocus={() => onFocusTarget(EDIT_TARGETS.name)}
            onChange={(event) => onProfile({ name: event.target.value })}
            placeholder="Tu nombre"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtítulo / profesión</Label>
          <Input
            value={content.profile.subtitle}
            onFocus={() => onFocusTarget(EDIT_TARGETS.subtitle)}
            onChange={(event) => onProfile({ subtitle: event.target.value })}
            placeholder="Ej. Maquilladora"
          />
        </div>
        <div className="space-y-2">
          <Label>Biografía</Label>
          <Textarea
            value={content.profile.bio}
            onFocus={() => onFocusTarget(EDIT_TARGETS.bio)}
            onChange={(event) => onProfile({ bio: event.target.value })}
            placeholder="Un par de líneas sobre ti"
            className="min-h-20"
          />
        </div>
      </Fieldset>
      {has("socials") ? (
        <Fieldset title="Redes sociales">
          <SocialsEditor
            socials={content.socials}
            onChange={onSocials}
            onFocusTarget={onFocusTarget}
          />
        </Fieldset>
      ) : null}
      {has("links") ? (
        <Fieldset title="Enlaces">
          <LinksEditor links={content.links} onChange={onLinks} onFocusTarget={onFocusTarget} />
        </Fieldset>
      ) : null}
      {has("cards") ? (
        <Fieldset title="Cards">
          <CardsEditor
            cards={content.cards}
            onChange={onCards}
            maxCards={template.maxCards}
            onFocusTarget={onFocusTarget}
          />
        </Fieldset>
      ) : null}
      {has("contact") ? (
        <Fieldset title="Contacto">
          <ContactEditor
            contact={content.contact}
            onChange={onContact}
            onFocusTarget={() => onFocusTarget(EDIT_TARGETS.contact)}
          />
        </Fieldset>
      ) : null}
    </section>
  );
}

function PreviewPane({
  config,
  width,
  isDesktop,
  selectedTarget,
  highlightedTarget,
  registry,
  canvasViewportRef,
  onWidth,
  onToggleDesktop,
  onOpenFullPreview,
}: {
  config: BasicTemplateConfig;
  width: number;
  isDesktop: boolean;
  selectedTarget: string | null;
  highlightedTarget: string | null;
  registry: EditTargetRegistry;
  canvasViewportRef: RefObject<HTMLDivElement | null>;
  onWidth: (width: number) => void;
  onToggleDesktop: () => void;
  onOpenFullPreview: () => void;
}) {
  return (
    <section className="space-y-3" aria-label="Canvas de edición en vivo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Canvas en vivo</span>
          {selectedTarget ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Editando
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenFullPreview}
          aria-label="Abrir vista previa completa"
        >
          <Eye className="mr-1.5 h-4 w-4" />
          Vista previa
        </Button>
      </div>
      <div className="flex flex-wrap gap-1" aria-label="Ancho de vista previa">
        {PREVIEW_WIDTHS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => onWidth(candidate)}
            className={`rounded-md border px-2 py-1 text-xs transition-all ${!isDesktop && candidate === width ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
          >
            {candidate}px
          </button>
        ))}
        <button
          type="button"
          onClick={onToggleDesktop}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-all ${isDesktop ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
        >
          <Monitor className="h-3.5 w-3.5" />
          Desktop
        </button>
      </div>
      <div className="flex max-w-full justify-center">
        <div
          className="max-w-full overflow-hidden rounded-[1.75rem] border-[6px] border-black/10 bg-white shadow-xl"
          style={{ width: `min(${width + 12}px, 100%)` }}
        >
          <div
            ref={canvasViewportRef}
            className="h-[min(64vh,580px)] min-h-[400px] overflow-y-auto overscroll-contain scroll-smooth motion-reduce:scroll-auto sm:h-[620px] lg:h-[720px]"
          >
            <BasicTemplateRenderer
              config={config}
              targetRegistry={registry}
              highlightedTarget={highlightedTarget}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FullPreview({ config, onClose }: { config: BasicTemplateConfig; onClose: () => void }) {
  return (
    <section
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa completa de la plantilla"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-sm font-semibold">Vista previa completa</p>
          <p className="text-xs text-muted-foreground">Cambios locales sin publicar</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          aria-label="Volver a editar"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Volver a editar
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:px-6 sm:py-6">
        <div className="mx-auto min-h-full w-full max-w-[560px] overflow-hidden bg-white shadow-sm sm:rounded-2xl">
          <BasicTemplateRenderer config={config} />
        </div>
      </div>
    </section>
  );
}

function PublishSuccess({
  onContinue,
  onPreview,
}: {
  onContinue: () => void;
  onPreview: () => void;
}) {
  return (
    <section
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-background/95 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Publicación completada"
    >
      <Celebration />
      <div className="relative w-full max-w-sm rounded-3xl border bg-card p-7 text-center shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
          <Check className="h-9 w-9" strokeWidth={3} />
        </div>
        <h2 className="mt-5 text-xl font-bold">¡Se ha publicado correctamente!</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tu QR y tus enlaces ahora apuntan a tu nuevo diseño.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onPreview}>
            <Eye className="mr-1.5 h-4 w-4" />
            Ver mi página
          </Button>
          <Button type="button" onClick={onContinue}>
            Seguir editando
          </Button>
        </div>
      </div>
    </section>
  );
}

function Celebration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
    >
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          className="absolute h-2 w-2 animate-[ping_700ms_ease-out_forwards] rounded-sm bg-primary/70"
          style={{
            left: `${8 + ((index * 17) % 84)}%`,
            top: `${12 + ((index * 29) % 64)}%`,
            animationDelay: `${(index % 5) * 55}ms`,
            transform: `rotate(${index * 31}deg)`,
          }}
        />
      ))}
      <Sparkles className="absolute left-[20%] top-[20%] h-5 w-5 animate-pulse text-primary/70" />
      <Sparkles className="absolute right-[18%] top-[30%] h-4 w-4 animate-pulse text-amber-500/70" />
    </div>
  );
}

function familyLabel(family: string): string {
  if (family === "hero_profile") return "Perfil";
  if (family === "hero_cards") return "Catálogo";
  if (family === "professional_corporate") return "Corporativo";
  return family;
}

function TemplateSelector({
  templateId,
  onSelect,
}: {
  templateId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Plantillas</h2>
        <p className="text-sm text-muted-foreground">
          Elige una plantilla para previsualizar y editar.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {getTemplates().map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex flex-col gap-2 rounded-xl border p-2 text-left transition-all ${item.id === templateId ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}
          >
            <TemplateThumbnail template={item} content={getDefaultContent(item.id)} />
            <div className="px-0.5">
              <div className="text-sm font-semibold leading-tight">{item.name}</div>
              <div className="text-xs text-muted-foreground">{familyLabel(item.family)}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function CustomizationControls({
  template,
  paletteId,
  fontPairId,
  buttonStyleId,
  onPalette,
  onFontPair,
  onButtonStyle,
  onFocusTarget,
}: {
  template: ReturnType<typeof getTemplate>;
  paletteId: string;
  fontPairId: string;
  buttonStyleId: string;
  onPalette: (id: string) => void;
  onFontPair: (id: string) => void;
  onButtonStyle: (id: string) => void;
  onFocusTarget: (targetId: string) => void;
}) {
  const actionTarget = template.supportsCards ? EDIT_TARGETS.cards : EDIT_TARGETS.links;
  return (
    <section className="space-y-4 rounded-xl border p-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Apariencia</h2>
        <p className="text-sm text-muted-foreground">Variaciones seguras de la plantilla.</p>
      </div>
      <div className="space-y-2">
        <Label>Paleta</Label>
        <div className="flex flex-wrap gap-2">
          {template.customization.palettes.map((item) => (
            <button
              key={item.id}
              type="button"
              onFocus={() => onFocusTarget(EDIT_TARGETS.hero)}
              onClick={() => {
                onFocusTarget(EDIT_TARGETS.hero);
                onPalette(item.id);
              }}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition-all ${item.id === paletteId ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            >
              <span
                className="flex h-5 w-5 overflow-hidden rounded-full border"
                style={{ background: item.background }}
              >
                <span className="m-auto h-3 w-3 rounded-full" style={{ background: item.accent }} />
              </span>
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tipografía</Label>
        <div className="flex flex-wrap gap-2">
          {template.customization.fontPairs.map((item) => (
            <button
              key={item.id}
              type="button"
              onFocus={() => onFocusTarget(EDIT_TARGETS.name)}
              onClick={() => {
                onFocusTarget(EDIT_TARGETS.name);
                onFontPair(item.id);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${item.id === fontPairId ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              style={{ fontFamily: item.heading }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Estilo de botón</Label>
        <div className="flex flex-wrap gap-2">
          {template.customization.buttonStyles.map((item) => (
            <button
              key={item.id}
              type="button"
              onFocus={() => onFocusTarget(actionTarget)}
              onClick={() => {
                onFocusTarget(actionTarget);
                onButtonStyle(item.id);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${item.id === buttonStyleId ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
