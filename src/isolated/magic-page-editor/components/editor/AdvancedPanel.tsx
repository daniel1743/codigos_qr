import React from "react";
import { ArrowLeftIcon, ArrowRightIcon, CornerLeftUpIcon, LockIcon, PlusIcon, RotateCcwIcon, Settings2Icon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { PanelSection } from "./controls/PanelSection";
import { NumberField } from "./controls/NumberField";
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
import {
  IMAGE_CARDS_MAX,
  addImageCard,
  imageCardsOrder,
  moveImageCard,
  parseImageCardSlot,
} from "../../utils/imageCardOps";
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
  /** A literal 0–1 opacity in the `overlay` slot; `undefined` = one of the four named levels. */
  const customOverlay =
    p["overlay"] && /^\d*\.?\d+$/.test(p["overlay"].trim()) ? Number(p["overlay"]) : undefined;
  /** Whether any veil is in effect, named or custom — the colour picker keys off this. */
  const overlayActive = customOverlay === undefined ? overlay !== "none" : customOverlay > 0;
  const el = ed.getElement(id);
  const set = (key: string, value: string) => ed.setProp(id, key, value);
  /** A literal px value in `spacing`; `undefined` means one of the four named steps. */
  const customSpacing = p["spacing"] && /^\d+$/.test(p["spacing"]) ? Number(p["spacing"]) : undefined;
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
          <MediaOverlayPicker
            value={customOverlay === undefined ? overlay : "custom"}
            onChange={(v) => set("overlay", v)}
          />
          <PanelSection
            title="Opacidad personalizada"
            hint="Los cuatro niveles llegan hasta 0.52. Un valor propio permite 0.40 o 0.60."
          >
            <NumberField
              label="De 0 a 1"
              value={customOverlay}
              onChange={(n) => set("overlay", n === undefined ? "none" : String(n))}
              step={0.05}
              min={0}
              max={1}
              placeholder="0.4"
            />
          </PanelSection>
          {overlayActive && (
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
    case "imageCard": {
      const blockKey = sel.blockKey;
      const slot = blockKey ? parseImageCardSlot(blockKey, id) : null;
      const order = blockKey ? imageCardsOrder(ed.doc, blockKey) : [];
      const index = slot ? order.indexOf(slot) : -1;
      const canAdd = !!blockKey && order.length < IMAGE_CARDS_MAX;
      const btn =
        "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-select-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1";
      specific = blockKey && slot ? (
        <PanelSection
          title={`Orden · tarjeta ${index + 1} de ${order.length}`}
          hint="Reordena las tarjetas o añade una nueva. El máximo es 4.">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => ed.updateDoc((doc) => moveImageCard(doc, blockKey, slot, -1))}
              className={btn}>
              <ArrowLeftIcon className="h-4 w-4" /> Mover antes
            </button>
            <button
              type="button"
              disabled={index < 0 || index >= order.length - 1}
              onClick={() => ed.updateDoc((doc) => moveImageCard(doc, blockKey, slot, 1))}
              className={btn}>
              Mover después <ArrowRightIcon className="h-4 w-4" />
            </button>
            {canAdd &&
            <button
              type="button"
              onClick={() => ed.updateDoc((doc) => addImageCard(doc, blockKey))}
              className={btn}>
              <PlusIcon className="h-4 w-4" /> Agregar tarjeta
            </button>}
          </div>
        </PanelSection>
      ) : null;

      break;
    }
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
              // A numeric value is none of the four steps, so none stays selected
              // rather than falsely highlighting one that is not in effect.
              value={customSpacing === undefined ? (p.spacing ?? el?.dataset.spacing ?? "M") : "custom"}
              onChange={(v) => set("spacing", v)}
            />
            <div className="mt-2">
              <NumberField
                label="Personalizado"
                value={customSpacing}
                onChange={(n) => set("spacing", n === undefined ? "" : String(Math.round(n)))}
                step={4}
                min={0}
                max={240}
                suffix="px"
                placeholder="48"
              />
            </div>
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
