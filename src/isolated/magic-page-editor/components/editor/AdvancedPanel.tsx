import React from "react";
import { CornerLeftUpIcon, LockIcon, RotateCcwIcon, Settings2Icon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { PanelSection } from "./controls/PanelSection";
import { Segmented } from "./controls/Segmented";
import { Toggle } from "./controls/Toggle";
import { TextField } from "./controls/TextField";
import { PositionPad } from "./controls/PositionPad";
import {
  MediaOverlayColorPicker,
  MediaOverlayPicker,
  MediaZoomPicker,
} from "./controls/MediaTreatmentPicker";
import { StructureRow } from "./StructureRow";
import { HeroFusionPicker } from "./controls/HeroFusionPicker";
import { DecorationPicker } from "./controls/DecorationPicker";
import { TypographyTreatmentPicker } from "./controls/TypographyTreatmentPicker";
import {
  STORY_FEATURE_LABEL,
  STORY_TOTAL_LIMIT,
  STORY_UI_LIMIT,
  formatRemaining,
  nextStorySlot,
  readStories,
  storyPatch,
} from "../../utils/stories";
import { blockLabels } from "../../data/blockKit";
import { CardAdvanced } from "../cards/CardAdvanced";
import { getCardContext } from "../cards/cardActions";
import { heroFusionFromProps, mediaOverlayFromProps } from "../../utils/styles";
import { SwatchRow } from "./controls/SwatchRow";
import { verificationPlacementFromProps } from "./EditableAvatar";

/** "Más": the advanced layer. Same content on desktop (popover) and mobile (expanded sheet). */
export function AdvancedPanel({ hideBlockNav = false }: { hideBlockNav?: boolean } = {}) {
  const ed = useEditor();
  const t = useThemeTokens();
  const sel = ed.selection;
  if (!sel) return null;
  const id = sel.id;
  const p = ed.doc.props[id] ?? {};
  const overlay = mediaOverlayFromProps(p);
  const el = ed.getElement(id);
  const set = (key: string, value: string) => ed.setProp(id, key, value);
  const block = sel.blockKey ? ed.doc.blocks.find((b) => b.key === sel.blockKey) : undefined;
  const isContainer = sel.kind === "section" || sel.kind === "hero";

  let specific: React.ReactNode = null;
  switch (sel.kind) {
    case "text": {
      const ts = ed.doc.textStyles[id] ?? {};
      specific = (
        <PanelSection title="Estilo del texto">
          <TypographyTreatmentPicker value={ts} onChange={(patch) => ed.setTextStyle(id, patch)} unifyActive={!!ed.doc.props['page']?.['textColor']} />
          <Toggle
            label="Mayúsculas"
            checked={!!ts.upper}
            onChange={(v) => ed.setTextStyle(id, { upper: v })}
          />
          <Segmented
            ariaLabel="Espaciado entre letras"
            options={[
              { value: "normal", label: "Normal" },
              { value: "wide", label: "Espaciado" },
            ]}
            value={ts.tracking ?? "normal"}
            onChange={(v) => ed.setTextStyle(id, { tracking: v })}
          />

          <button
            type="button"
            onClick={() =>
              ed.setTextStyle(id, {
                size: undefined,
                bold: undefined,
                color: undefined,
                align: undefined,
                upper: undefined,
                tracking: undefined,
              })
            }
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-mute hover:text-ink"
          >
            <RotateCcwIcon className="h-3.5 w-3.5" /> Restablecer estilo de la plantilla
          </button>
        </PanelSection>
      );

      break;
    }
    case "image":
      specific = (
        <PanelSection
          title="Accesibilidad"
          hint="Describe la imagen para lectores de pantalla y buscadores."
        >
          <TextField
            label="Texto alternativo"
            value={p.alt ?? el?.querySelector("img")?.getAttribute("alt") ?? ""}
            onCommit={(v) => set("alt", v)}
          />
        </PanelSection>
      );

      break;
    case "avatar": {
      // E2 — "Pulso activo": one 24 h story at a time, written with `setProp` as
      // flat keys (`story.N.at` / `story.N.active`) inside this avatar's props.
      const storyEntries = readStories(p, Date.now());
      const activeEntry = storyEntries.find((entry) => entry.active && !entry.expired) ?? null;
      const activeStory = activeEntry ? activeEntry.index : null;
      const nextSlot = nextStorySlot(p);
      const applyStory = (action: { activate?: number; deactivate?: number; clear?: number; setMedia?: { index: number; src: string; path?: string } }) => {
        const patch = storyPatch(p, action, Date.now());
        Object.entries(patch).forEach(([key, value]) => set(key, value));
      };
      // E3 — the pulse photo is uploaded with the editor's existing uploader and
      // stored in its OWN keys (`story.N.src`). `src` (the profile picture) is never
      // touched, and nothing is deleted from Storage (logical 24 h expiry only).
      const uploadPulse = async (file: File) => {
        if (!ed.uploadAsset) return;
        try {
          const src = await ed.uploadAsset(file);
          if (!src) return;
          const slot = activeStory ?? nextSlot ?? 0;
          applyStory({ activate: slot, setMedia: { index: slot, src } });
        } catch {
          // A failed upload simply leaves the pulse off; nothing else changes.
        }
      };
      specific = (
        <>
          <PanelSection title="Forma">
            <Segmented
              ariaLabel="Forma"
              options={[
                { value: "circle", label: "Círculo" },
                { value: "rounded", label: "Redondeado" },
                { value: "square", label: "Cuadrado" },
                { value: "arch", label: "Arco" },
              ]}
              value={p.shape ?? "circle"}
              onChange={(v) => set("shape", v)}
            />
          </PanelSection>
          <PanelSection title="Detalles">
            <Segmented
              ariaLabel="Ubicación de verificación"
              options={[
                { value: "none", label: "Sin" },
                { value: "name", label: "Junto al nombre" },
                { value: "avatar", label: "Sobre la foto" },
              ]}
              value={verificationPlacementFromProps(p, "name")}
              onChange={(v) => {
                set("badgePlacement", v);
                set("badge", v === "avatar" ? "on" : "off");
                set("badgeByName", v === "name" ? "on" : "off");
              }}
            />
            <SwatchRow colors={t.swatches} value={p.badgeColor} onChange={(v) => set("badgeColor", v ?? t.accent)} />
          </PanelSection>
          <PanelSection title="Encuadre">
            <PositionPad value={p.pos ?? "center"} onChange={(v) => set("pos", v)} />
          </PanelSection>
          <MediaZoomPicker value={p["zoom"] ?? "1"} onChange={(v) => set("zoom", v)} />
          <PanelSection title={STORY_FEATURE_LABEL}>
            {activeStory !== null ?
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {activeEntry?.src ?
                  <img src={activeEntry.src} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  : null}
                  <p data-story-state="active" className="text-[11.5px] leading-snug text-ink opacity-70">
                    Activo · expira en {formatRemaining(activeEntry?.remainingMs ?? 0)}
                  </p>
                </div>
                <label className="block w-full cursor-pointer rounded-xl border border-line px-3 py-2 text-center text-[12.5px] font-medium text-ink hover:border-[#CDD1D7]">
                  Cambiar foto del pulso
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadPulse(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="w-full rounded-xl border border-line px-3 py-2 text-[12.5px] font-medium text-ink hover:border-[#CDD1D7]"
                  onClick={() => applyStory({ deactivate: activeStory })}
                >
                  Desactivar pulso
                </button>
              </div> :
            <div className="space-y-2">
                <label className={`block w-full cursor-pointer rounded-xl border border-line px-3 py-2 text-center text-[12.5px] font-medium text-ink hover:border-[#CDD1D7]${nextSlot === null ? ' pointer-events-none opacity-40' : ''}`}>
                  Subir foto y activar pulso (24 h)
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={nextSlot === null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadPulse(file);
                    }}
                  />
                </label>
                <p className="text-[11.5px] leading-snug text-ink opacity-70">
                  Máx. {STORY_UI_LIMIT} desde el editor · hasta {STORY_TOTAL_LIMIT} contemplados · 1 visible a la vez. La foto se guarda aparte del avatar.
                </p>
              </div>}
          </PanelSection>
        </>
      );

      break;
    }
    case "cta": {
      const full = p.full ? p.full === "on" : !!el?.classList.contains("w-full");
      specific = (
        <PanelSection title="Comportamiento">
          <Toggle
            label="Ancho completo"
            checked={full}
            onChange={(v) => set("full", v ? "on" : "off")}
          />
          <Toggle
            label="Abrir en pestaña nueva"
            checked={(p.newTab ?? "on") === "on"}
            onChange={(v) => set("newTab", v ? "on" : "off")}
          />
        </PanelSection>
      );

      break;
    }
    case "hero":
      specific = (
        <>
          
          {ed.canonicalEditing && (
            <HeroFusionPicker
              value={heroFusionFromProps(p)}
              onChange={(v) => set("fusion", v)}
            />
          )}
          <PanelSection title="Altura de la imagen">
            <Segmented
              ariaLabel="Altura"
              options={[
                { value: "S", label: "Baja" },
                { value: "M", label: "Media" },
                { value: "L", label: "Alta" },
              ]}
              value={p.height ?? "M"}
              onChange={(v) => set("height", v)}
            />
          </PanelSection>
          <PanelSection title="Punto de enfoque" hint="Recorte: la parte de la foto que queda siempre visible.">
            <PositionPad value={p.pos ?? "center"} onChange={(v) => set("pos", v)} />
          </PanelSection>
          <MediaZoomPicker value={p["zoom"] ?? "1"} onChange={(v) => set("zoom", v)} />
          <MediaOverlayPicker value={overlay} onChange={(v) => set("overlay", v)} />
          {overlay !== "none" && (
            <MediaOverlayColorPicker
              colors={t.swatches}
              value={p["overlayColor"]}
              onChange={(v) => set("overlayColor", v)}
            />
          )}
        </>
      );

      break;
    case "familyCard": {
      const ctx = getCardContext(ed, id, sel.blockKey);
      specific = ctx ? <CardAdvanced ctx={ctx} /> : null;
      break;
    }
    case "price":
    case "badge":
      specific = (
        <p className="rounded-xl bg-[#F7F8FA] p-3 text-[12.5px] leading-snug text-mute">
          Si lo ocultas, vuelve a mostrarlo desde «Más» de la tarjeta, en Campos.
        </p>
      );
      break;
    case "gallery":
      specific = (
        <PanelSection title="Espacio entre fotos">
          <Segmented
            ariaLabel="Espacio entre fotos"
            options={[
              { value: "S", label: "Junto" },
              { value: "M", label: "Medio" },
              { value: "L", label: "Amplio" },
            ]}
            value={p.gap ?? "M"}
            onChange={(v) => set("gap", v)}
          />
        </PanelSection>
      );

      break;
    case "card":
      specific = (
        <PanelSection title="Comportamiento">
          <Toggle
            label="Abrir en pestaña nueva"
            checked={(p.newTab ?? "on") === "on"}
            onChange={(v) => set("newTab", v ? "on" : "off")}
          />
        </PanelSection>
      );

      break;
    case "social":
      specific = (
        <PanelSection
          title="Consejo"
          hint="El estilo de icono se comparte con todo el grupo; plataforma y destino son de cada icono."
        >
          <span />
        </PanelSection>
      );

      break;
    case "section":
      specific = sel.blockKey ? (
        <>
          <PanelSection
            title="Espaciado vertical"
            hint="El espaciado es una propiedad del bloque, no un bloque aparte."
          >
            <Segmented
              ariaLabel="Espaciado vertical"
              options={[
                { value: "none", label: "Sin" },
                { value: "S", label: "Compacto" },
                { value: "M", label: "Medio" },
                { value: "L", label: "Amplio" },
              ]}
              value={p.spacing ?? el?.dataset.spacing ?? "M"}
              onChange={(v) => set("spacing", v)}
            />
          </PanelSection>
          <PanelSection title="Enlace a esta sección">
            <TextField
              label="Ancla"
              prefix="#"
              value={p.anchor ?? ""}
              placeholder={blockLabels[block?.type ?? "text"].toLowerCase()}
              onCommit={(v) => set("anchor", v)}
            />
          </PanelSection>
          
        </>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl bg-[#F7F8FA] p-3 text-[12.5px] leading-snug text-mute">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
          El pie de página es estructura fija: siempre aparece al final. Puedes editar su texto,
          redes y fondo.
        </div>
      );

      break;
    case "page":
      specific = (
        <>
          
          <button
            type="button"
            onClick={() => ed.setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left transition-colors duration-150 hover:bg-[#F7F8FA]"
          >
            <Settings2Icon className="h-4 w-4 text-mute" />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-ink">Ajustes de página</span>
              <span className="block text-[12px] text-mute">Título, URL, SEO y dominio</span>
            </span>
          </button>
        </>
      );

      break;
  }

  return (
    <div className="space-y-5">
      {specific}
      {!hideBlockNav && block && (sel.kind === "hero" || !isContainer) && (
        <PanelSection
          title={`Bloque · ${blockLabels[block.type]}`}
          hint={sel.kind === "hero" ? undefined : "Este elemento vive dentro de este bloque."}
        >
          {sel.kind === "hero" && <StructureRow blockKey={block.key} />}
          {sel.kind !== "hero" && (
            <button
              type="button"
              onClick={() => ed.select(`block:${block.key}`)}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-select hover:text-select-ink"
            >
              <CornerLeftUpIcon className="h-3.5 w-3.5" /> Seleccionar bloque completo
            </button>
          )}
        </PanelSection>
      )}
    </div>
  );
}
