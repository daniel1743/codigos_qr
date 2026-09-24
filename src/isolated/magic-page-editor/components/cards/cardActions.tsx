import React from "react";
import { toast } from "sonner";
import {
  AlignHorizontalJustifyCenterIcon,
  CopyIcon,
  EyeOffIcon,
  ImageIcon,
  LayoutTemplateIcon,
  PaintbrushIcon,
  PenLineIcon,
  PaletteIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react";
import type { EditorValue } from "../../contexts/EditorContext";
import { PanelSection } from "../editor/controls/PanelSection";
import { Segmented } from "../editor/controls/Segmented";
import { SizeStepper } from "../editor/controls/SizeStepper";
import { SwatchRow } from "../editor/controls/SwatchRow";
import { CardLayoutPicker } from "./CardLayoutPicker";
import { familyForBlockType } from "../../data/cardFamilies";
import { deleteCard, duplicateCard, parseCardId } from "../../utils/cardOps";
import { layoutsForFamily, resolveCard } from "../../utils/cardLayout";
import type { EditorAction } from "../editor/editorAction";
import type { CardFamilyDef, CardLayout, ThemeTokens } from "../../types/editor";

export interface CardContext {
  cardId: string;
  blockKey: string;
  family: CardFamilyDef;
  prefix: string;
  itemId: string;
}

/** Resolves which card (and family) an element id belongs to. */
export function getCardContext(ed: EditorValue, id: string, blockKey?: string): CardContext | null {
  if (!blockKey) return null;
  const block = ed.doc.blocks.find((b) => b.key === blockKey);
  const family = block ? familyForBlockType(block.type) : undefined;
  if (!family) return null;
  const cardId = id.replace(
    /\.(price|prev|badge|cta|img2?|title|desc|eyebrow|meta|beforeLabel|afterLabel)$/,
    "",
  );
  const parsed = parseCardId(cardId);
  if (!parsed) return null;
  return { cardId, blockKey, family, ...parsed };
}

export const surfaceOptions = [
  { value: "surface", label: "Tarjeta" },
  { value: "outline", label: "Contorno" },
  { value: "plain", label: "Sin fondo" },
  { value: "accent", label: "Acento" },
];

/** Card-level floating badges: Diseño · Imagen · Estilo · Duplicar · Eliminar. */
export function familyCardActions(ed: EditorValue, ctx: CardContext): EditorAction[] {
  const { cardId, blockKey, family, prefix, itemId } = ctx;
  const cp = ed.doc.props[cardId] ?? {};
  const blockProps = ed.doc.props[`block:${blockKey}`] ?? {};
  const r = resolveCard(family, blockProps, cp);
  const set = (k: string, v: string) => ed.setProp(cardId, k, v);
  const count = family.items.length;
  const position =
    r.layout === "right"
      ? "right"
      : r.layout === "top"
        ? "top"
        : r.layout === "bottom"
          ? "bottom"
          : "left";
  const horizontal = r.layout === "left" || r.layout === "right" || r.layout === "balanced";

  return [
    {
      key: "layout",
      label: "Diseño",
      icon: LayoutTemplateIcon,
      showLabel: true,
      panel: (
        <CardLayoutPicker
          options={layoutsForFamily(family)}
          value={r.layout}
          onChange={(v: CardLayout) => set("layout", v)}
        />
      ),
    },
    {
      key: "imagePos",
      label: "Imagen",
      icon: ImageIcon,
      showLabel: true,
      panel: (
        <div className="space-y-4">
          <PanelSection title="Posición de la imagen">
            <Segmented
              ariaLabel="Posición de la imagen"
              options={[
                { value: "left", label: "Izquierda" },
                { value: "right", label: "Derecha" },
                { value: "top", label: "Arriba" },
                { value: "bottom", label: "Abajo" },
              ]}
              value={position}
              onChange={(v) => set("layout", v)}
            />
          </PanelSection>
          <PanelSection
            title="Proporción"
            hint={
              horizontal ? "Imagen / contenido." : "Disponible con imagen a la izquierda o derecha."
            }
          >
            <Segmented
              ariaLabel="Proporción"
              options={[
                { value: "25", label: "25/75" },
                { value: "35", label: "35/65" },
                { value: "50", label: "50/50" },
              ]}
              value={r.layout === "balanced" ? "50" : r.ratio}
              onChange={(v) => {
                ed.updateDoc((d) => ({
                  ...d,
                  props: {
                    ...d.props,
                    [cardId]: {
                      ...d.props[cardId],
                      ratio: v,
                      layout: horizontal ? (r.layout === "balanced" ? "left" : r.layout) : "left",
                    },
                  },
                }));
              }}
            />
          </PanelSection>
        </div>
      ),
    },
    {
      key: "style",
      label: "Estilo",
      icon: PaintbrushIcon,
      panel: (
        <PanelSection title="Superficie">
          <Segmented
            ariaLabel="Superficie"
            options={surfaceOptions}
            value={cp.surface ?? (r.layout === "highlight" ? "accent" : "surface")}
            onChange={(v) => set("surface", v)}
          />
        </PanelSection>
      ),
    },
    {
      key: "dup",
      label: "Duplicar",
      icon: CopyIcon,
      onClick: () => {
        ed.updateDoc((d) => duplicateCard(d, blockKey, count, prefix, itemId));
        toast("Tarjeta duplicada");
      },
    },
    {
      key: "delete",
      label: "Eliminar",
      icon: Trash2Icon,
      danger: true,
      onClick: () => {
        ed.updateDoc((d) => deleteCard(d, blockKey, count, itemId));
        ed.clearSelection();
        toast("Tarjeta eliminada", { action: { label: "Deshacer", onClick: () => ed.undo() } });
      },
    },
  ];
}

/** Price: Editar · Tamaño · Color · Ocultar. */
export function priceActions(
  ed: EditorValue,
  t: ThemeTokens,
  id: string,
  ctx: CardContext | null,
  el: HTMLElement | null,
): EditorAction[] {
  const ts = ed.doc.textStyles[id] ?? {};
  const size = ts.size ?? Math.round(parseFloat(el ? window.getComputedStyle(el).fontSize : "16"));
  const flag = id.endsWith(".prev") ? "showPrev" : "showPrice";
  return [
    {
      key: "edit",
      label: "Editar precio",
      icon: PenLineIcon,
      showLabel: true,
      onClick: () => {
        ed.setEditingId(id);
        if (ed.isMobile) ed.setKeyboard(true);
      },
    },
    {
      key: "size",
      label: "Tamaño",
      icon: TypeIcon,
      inline: <SizeStepper value={size} onChange={(v) => ed.setTextStyle(id, { size: v })} />,
      panel: <SizeStepper large value={size} onChange={(v) => ed.setTextStyle(id, { size: v })} />,
    },
    {
      key: "color",
      label: "Color",
      icon: PaletteIcon,
      swatch: ts.color,
      panel: (
        <SwatchRow
          colors={t.swatches}
          value={ts.color}
          onChange={(c) => ed.setTextStyle(id, { color: c })}
        />
      ),
    },
    {
      key: "hide",
      label: "Ocultar",
      icon: EyeOffIcon,
      disabled: !ctx,
      onClick: () => {
        if (!ctx) return;
        ed.setProp(ctx.cardId, flag, "off");
        ed.select(ctx.cardId);
        toast("Precio oculto", { description: "Vuelve a mostrarlo desde «Más» de la tarjeta." });
      },
    },
  ];
}

/** Badge: Texto · Estilo · Ocultar · Quitar. */
export function badgeActions(
  ed: EditorValue,
  id: string,
  ctx: CardContext | null,
  el: HTMLElement | null,
): EditorAction[] {
  const presets = ctx?.family.badgePresets ?? [];
  const current = ed.doc.props[id]?.variant ?? el?.dataset.variant ?? "soft";
  return [
    {
      key: "text",
      label: "Texto",
      icon: TypeIcon,
      showLabel: true,
      onClick: () => {
        ed.setEditingId(`${id}.label`);
        if (ed.isMobile) ed.setKeyboard(true);
      },
    },
    {
      key: "style",
      label: "Estilo",
      icon: PaintbrushIcon,
      showLabel: true,
      panel: (
        <div className="space-y-4">
          <PanelSection title="Estilo">
            <Segmented
              ariaLabel="Estilo de etiqueta"
              options={[
                { value: "solid", label: "Relleno" },
                { value: "soft", label: "Suave" },
                { value: "outline", label: "Contorno" },
              ]}
              value={current}
              onChange={(v) => ed.setProp(id, "variant", v)}
            />
          </PanelSection>
          {presets.length > 0 && (
            <PanelSection title="Sugerencias">
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => ed.setText(`${id}.label`, p)}
                    className="h-8 rounded-full border border-line px-3 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:border-select/50 hover:bg-select-soft/50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </PanelSection>
          )}
        </div>
      ),
    },
    {
      key: "hide",
      label: "Ocultar",
      icon: EyeOffIcon,
      disabled: !ctx,
      onClick: () => {
        if (!ctx) return;
        ed.setProp(ctx.cardId, "showBadge", "off");
        ed.select(ctx.cardId);
      },
    },
    {
      key: "remove",
      label: "Quitar",
      icon: Trash2Icon,
      danger: true,
      onClick: () => ed.removeElement(id, "Etiqueta"),
    },
  ];
}

/** CTA alignment inside a card footer. */
export function ctaAlignAction(ed: EditorValue, id: string): EditorAction {
  return {
    key: "align",
    label: "Alinear",
    icon: AlignHorizontalJustifyCenterIcon,
    panel: (
      <PanelSection title="Alineación del botón">
        <Segmented
          ariaLabel="Alineación del botón"
          options={[
            { value: "left", label: "Inicio" },
            { value: "center", label: "Centro" },
            { value: "right", label: "Final" },
            { value: "full", label: "Ancho" },
          ]}
          value={ed.doc.props[id]?.align ?? "left"}
          onChange={(v) => ed.setProp(id, "align", v)}
        />
      </PanelSection>
    ),
  };
}
