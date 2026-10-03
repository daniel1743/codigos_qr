import React from "react";
import { toast } from "sonner";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MoreHorizontalIcon,
  AlignCenterIcon,
  BoldIcon,
  CircleDashedIcon,
  CopyIcon,
  CropIcon,
  ImageIcon,
  InfoIcon,
  ImagesIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  Link2Icon,
  MoveIcon,
  PaintBucketIcon,
  PaintbrushIcon,
  PaletteIcon,
  PenLineIcon,
  PlusIcon,
  RefreshCwIcon,
  ScalingIcon,
  Settings2Icon,
  ShapesIcon,
  Trash2Icon,
  TypeIcon,
  StarIcon,
  BadgeCheckIcon,
  BotIcon,
  LayersIcon,
  ListIcon,
  MoveHorizontalIcon,
  MinusIcon,
  LockIcon,
  UnlockIcon,
} from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { structureActions } from "./structureActions";
import { AdvancedPanel } from "./AdvancedPanel";
import {
  socialStyleScope,
  type SocialStyle,
  type SocialLayout,
  type SocialShape,
  type SocialFill,
  type SocialSize,
} from "./EditableSocial";
import { PanelSection } from "./controls/PanelSection";
import { Segmented } from "./controls/Segmented";
import { SizeStepper } from "./controls/SizeStepper";
import { AlignGroup, alignOptions } from "./controls/AlignGroup";
import { SwatchRow } from "./controls/SwatchRow";
import { ImagePicker } from "./controls/ImagePicker";
import { FreeCropControl, PositionPad } from "./controls/PositionPad";
import { LinkEditor } from "./controls/LinkEditor";
import { CollapsibleSection } from "./controls/CollapsibleSection";
import { ConfirmButton } from "./controls/ConfirmButton";
import { ScopeNote } from "./controls/ScopeNote";
import { ButtonContentPanel } from "./ButtonContentPanel";
import { ButtonGroupStylePanel } from "./ButtonGroupStylePanel";
import { ButtonRoster } from "./ButtonRoster";
import { CtaStylePicker } from "./controls/CtaStylePicker";
import { CtaTreatmentPicker } from "./controls/CtaTreatmentPicker";
import { HeroVariantPicker } from "./controls/HeroVariantPicker";
import { PlatformPicker } from "./controls/PlatformPicker";
import { GalleryPhotosPicker } from "./controls/GalleryPhotosPicker";
import { ToneGrid } from "./controls/ToneGrid";
import { FontPicker } from "./controls/FontPicker";
import { PalettePicker } from "./controls/PalettePicker";
import { LandingBotPanel } from "./controls/LandingBotPanel";
import { DecorationPicker } from "./controls/DecorationPicker";
import { TypographyTreatmentPicker } from "./controls/TypographyTreatmentPicker";
import { HeroFrameShapePicker } from "./controls/HeroFrameShapePicker";
import { SeparatorStylePicker } from "./controls/SeparatorStylePicker";
import { resolveSeparatorStyle } from "../blocks/SeparatorBlock";
import { QuickProfileInfoPanel } from "./controls/QuickProfileInfoPanel";
import { IconPicker, iconLibrary } from "./controls/IconPicker";
import { socialPlatforms } from "../../data/socialPlatforms";
import { addButton, deleteButton, moveButton } from "../../utils/buttonOps";
import {
  buttonCollectionFor,
  buttonIdentity,
  canonicalScope,
  commonButtonTextAlign,
  nextButtonId,
  normalizeButtonIcon,
  readButtonGroup,
  suggestButtonIcon,
} from "../../utils/buttonGroup";
import { familyForBlockType } from "../../data/cardFamilies";
import { CardLayoutPicker } from "../cards/CardLayoutPicker";
import { CardSurfaceFields } from "../cards/CardSurfaceFields";
import { galleryLayouts } from "../blocks/GalleryGrid";
import {
  badgeActions,
  ctaAlignAction,
  familyCardActions,
  getCardContext,
  priceActions,
} from "../cards/cardActions";
import { CatalogConversionPanel } from "./CatalogConversionPanel";
import type { CardLayout } from "../../types/editor";
import type { EditorAction } from "./editorAction";
import type { CtaVariant } from "./EditableCTA";
import type { HeroVariant, SocialPlatform, TextAlign } from "../../types/editor";
import type { HeroShape } from "../blocks/HeroFrame";

/** The universal editing contract, per element kind. Same list feeds the desktop toolbar and the mobile sheet. */
export function useSelectionActions(): EditorAction[] {
  const ed = useEditor();
  const t = useThemeTokens();
  const sel = ed.selection;
  if (!sel) return [];

  const id = sel.id;
  const isHeroImage = sel.kind === "image" && id.endsWith(":hero-image");
  const propId = isHeroImage ? id.slice(0, -":hero-image".length) : id;
  const mediaShapeKey = isHeroImage ? "mediaShape" : "shape";
  const props = ed.doc.props[propId] ?? {};
  const el = ed.getElement(id);
  const set = (key: string, value: string) => ed.setProp(propId, key, value);

  switch (sel.kind) {
    case "surface": {
      const ctx =
        getCardContext(ed, id, sel.blockKey) ?? ({ cardId: id.replace(/\.surface$/, "") } as any);
      return [
        {
          key: "surface",
          label: "Superficie",
          icon: PaintBucketIcon,
          showLabel: true,
          panel: <CardSurfaceFields ctx={ctx} />,
        },
      ];
    }
    case "text": {
      const ts = ed.doc.textStyles[id] ?? {};
      const cs = el ? window.getComputedStyle(el) : null;
      const size = ts.size ?? Math.round(parseFloat(cs?.fontSize ?? "16"));
      const bold = ts.bold ?? (cs ? parseInt(cs.fontWeight, 10) >= 600 : false);
      const rawAlign = ts.align ?? cs?.textAlign ?? "left";
      const align: TextAlign =
        rawAlign === "center"
          ? "center"
          : rawAlign === "right" || rawAlign === "end"
            ? "right"
            : "left";
      const AlignIcon = alignOptions.find((o) => o.value === align)?.icon ?? alignOptions[0].icon;
      return [
        {
          key: "edit",
          label: "Escribir",
          icon: PenLineIcon,
          mobileOnly: true,
          onClick: () => {
            ed.setEditingId(id);
            ed.setKeyboard(true);
          },
        },
        {
          key: "size",
          label: "Tamaño",
          icon: TypeIcon,
          inline: <SizeStepper value={size} onChange={(v) => ed.setTextStyle(id, { size: v })} />,
          panel: (
            <SizeStepper large value={size} onChange={(v) => ed.setTextStyle(id, { size: v })} />
          ),
        },
        {
          key: "bold",
          label: "Negrita",
          icon: BoldIcon,
          active: bold,
          onClick: () => ed.setTextStyle(id, { bold: !bold }),
        },
        {
          key: "color",
          label: "Color",
          icon: PaletteIcon,
          swatch: ts.color ?? cs?.color,
          panel: (
            <SwatchRow
              colors={t.swatches}
              value={ts.color}
              onChange={(c) => ed.setTextStyle(id, { color: c })}
            />
          ),
        },
        {
          key: "align",
          label: "Alinear",
          icon: AlignIcon,
          inline: <AlignGroup value={align} onChange={(v) => ed.setTextStyle(id, { align: v })} />,
          panel: (
            <Segmented
              ariaLabel="Alineación"
              options={alignOptions.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
              value={align}
              onChange={(v) => ed.setTextStyle(id, { align: v })}
            />
          ),
        },
        {
          key: "typography",
          label: "Tratamiento",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <TypographyTreatmentPicker
              value={ts}
              onChange={(patch) => ed.setTextStyle(id, patch)}
            />
          ),
        },
        {
          key: "remove",
          label: "Ocultar " + sel.label.toLowerCase(),
          icon: Trash2Icon,
          danger: true,
          onClick: () => ed.removeElement(id, sel.label),
        },
      ];
    }

    case "image":
      return [
        {
          key: "replace",
          label: "Reemplazar",
          icon: RefreshCwIcon,
          showLabel: true,
          panel: (
            <ImagePicker
              value={props.src}
              onChange={(v) => set("src", v)}
              onUpload={ed.uploadAsset}
            />
          ),
        },
        {
          key: "shape",
          label: "Forma",
          icon: ShapesIcon,
          showLabel: true,
          panel: isHeroImage ? (
            <PanelSection title="Forma de la portada">
              <HeroFrameShapePicker
                value={(props.shape ?? "curve") as HeroShape}
                onChange={(v) => {
                  // The hero silhouette is authoritative on `shape`. Clear the
                  // legacy mediaShape so old oval/rounded values cannot mask the
                  // first three hero options (curve, straight, inset).
                  set("shape", v);
                  if (props.mediaShape) set("mediaShape", "");
                }}
              />
            </PanelSection>
          ) : (
            <PanelSection title="Forma de imagen">
              <Segmented
                ariaLabel="Forma de imagen"
                options={[
                  { value: "square", label: "Cuadrada" },
                  { value: "rounded", label: "Redondeada" },
                  { value: "circle", label: "Círculo" },
                  { value: "oval", label: "Óvalo" },
                  { value: "arch", label: "Arco" },
                  { value: "bleed", label: "A sangre" },
                ]}
                value={props[mediaShapeKey] ?? "rounded"}
                onChange={(v) => set(mediaShapeKey, v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "crop",
          label: "Recortar",
          icon: CropIcon,
          panel: (
            <>
              <PanelSection title="Encuadre libre">
                <FreeCropControl
                  x={Number(props.cropX ?? 50)}
                  y={Number(props.cropY ?? 50)}
                  zoom={Number(props.zoom ?? 1)}
                  onChange={set}
                />
              </PanelSection>
              <PanelSection title="Zoom rápido" hint="Acerca la imagen dentro de su marco.">
                <Segmented
                  ariaLabel="Zoom"
                  options={[
                    { value: "1", label: "Original" },
                    { value: "1.15", label: "115%" },
                    { value: "1.3", label: "130%" },
                    { value: "1.5", label: "150%" },
                  ]}
                  value={props.zoom ?? "1"}
                  onChange={(v) => set("zoom", v)}
                />
              </PanelSection>
              <PanelSection title="Posición rápida">
                <PositionPad value={props.pos ?? "center"} onChange={(v) => set("pos", v)} />
              </PanelSection>
            </>
          ),
        },
        {
          key: "fit",
          label: "Ajuste",
          icon: ScalingIcon,
          panel: (
            <PanelSection
              title="Ajuste"
              hint="Rellenar recorta la imagen; Encajar la muestra completa."
            >
              <Segmented
                ariaLabel="Ajuste de imagen"
                options={[
                  { value: "cover", label: "Rellenar" },
                  { value: "contain", label: "Encajar" },
                ]}
                value={props.fit ?? "cover"}
                onChange={(v) => set("fit", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "position",
          label: "Posición",
          icon: MoveIcon,
          panel: <PositionPad value={props.pos ?? "center"} onChange={(v) => set("pos", v)} />,
        },
        {
          key: "lock",
          label: props.locked === "true" ? "Desbloquear" : "Bloquear",
          icon: props.locked === "true" ? LockIcon : UnlockIcon,
          active: props.locked === "true",
          onClick: () => set("locked", props.locked === "true" ? "false" : "true"),
        },
        {
          key: "overlay",
          label: "Overlay",
          icon: LayersIcon,
          panel: (
            <PanelSection title="Intensidad del overlay">
              <Segmented
                ariaLabel="Overlay de imagen"
                options={[
                  { value: "none", label: "Sin" },
                  { value: "soft", label: "Suave" },
                  { value: "medium", label: "Medio" },
                  { value: "intense", label: "Intenso" },
                ]}
                value={props.overlay ?? "none"}
                onChange={(v) => set("overlay", v)}
              />
            </PanelSection>
          ),
        },
        ...(sel.label === "Vídeo"
          ? [
              {
                key: "video-url",
                label: "Enlace",
                icon: Link2Icon,
                showLabel: true,
                panel: <LinkEditor value={props.href ?? ""} onChange={(v) => set("href", v)} />,
              } as EditorAction,
            ]
          : []),
        {
          key: "remove",
          label: "Quitar",
          icon: Trash2Icon,
          danger: true,
          onClick: () => ed.removeElement(id, sel.label),
        },
      ];

    case "avatar": {
      const ringOn = (props.ring ?? "on") === "on";
      return [
        {
          key: "replace",
          label: "Reemplazar",
          icon: RefreshCwIcon,
          showLabel: true,
          panel: (
            <ImagePicker
              value={props.src}
              onChange={(v) => set("src", v)}
              onUpload={ed.uploadAsset}
            />
          ),
        },
        {
          key: "shape",
          label: "Forma",
          icon: ShapesIcon,
          showLabel: true,
          panel: (
            <Segmented
              ariaLabel="Forma del avatar"
              options={[
                { value: "circle", label: "Círculo" },
                { value: "rounded", label: "Redondeado" },
                { value: "square", label: "Cuadrado" },
                { value: "arch", label: "Arco" },
              ]}
              value={props.shape ?? (el?.dataset.shape as string) ?? "circle"}
              onChange={(v) => set("shape", v)}
            />
          ),
        },
        {
          key: "ring",
          label: "Borde",
          icon: CircleDashedIcon,
          active: ringOn,
          onClick: () => set("ring", ringOn ? "off" : "on"),
        },
        {
          key: "crop",
          label: "Encuadre",
          icon: CropIcon,
          panel: (
            <>
              <PanelSection title="Encuadre libre">
                <FreeCropControl
                  x={Number(props.cropX ?? 50)}
                  y={Number(props.cropY ?? 50)}
                  zoom={Number(props.zoom ?? 1)}
                  onChange={set}
                />
              </PanelSection>
              <PanelSection title="Zoom rápido">
                <Segmented
                  ariaLabel="Zoom del avatar"
                  options={[
                    { value: "1", label: "100%" },
                    { value: "1.15", label: "115%" },
                    { value: "1.3", label: "130%" },
                    { value: "1.5", label: "150%" },
                  ]}
                  value={props.zoom ?? "1"}
                  onChange={(v) => set("zoom", v)}
                />
              </PanelSection>
              <PanelSection title="Posición rápida">
                <PositionPad value={props.pos ?? "center"} onChange={(v) => set("pos", v)} />
              </PanelSection>
            </>
          ),
        },

        {
          key: "overlay",
          label: "Overlay",
          icon: LayersIcon,
          panel: (
            <PanelSection title="Overlay del avatar">
              <Segmented
                ariaLabel="Overlay del avatar"
                options={[
                  { value: "none", label: "Sin" },
                  { value: "soft", label: "Suave" },
                  { value: "medium", label: "Medio" },
                  { value: "intense", label: "Intenso" },
                ]}
                value={props.overlay ?? "none"}
                onChange={(v) => set("overlay", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "verified",
          label: "Verificado",
          icon: BadgeCheckIcon,
          active: props.badge === "on",
          panel: (
            <>
              <PanelSection title="Badge verificado">
                <Segmented
                  ariaLabel="Mostrar badge"
                  options={[
                    { value: "off", label: "Oculto" },
                    { value: "on", label: "Visible" },
                  ]}
                  value={props.badge ?? "on"}
                  onChange={(v) => set("badge", v)}
                />
                <SwatchRow
                  colors={t.swatches}
                  value={props.badgeColor}
                  onChange={(v) => set("badgeColor", v ?? t.accent)}
                />
              </PanelSection>
              <PanelSection title="Junto al nombre">
                <Segmented
                  ariaLabel="Verificado junto al nombre"
                  options={[
                    { value: "off", label: "No" },
                    { value: "on", label: "Sí" },
                  ]}
                  value={props.badgeByName ?? "off"}
                  onChange={(v) => set("badgeByName", v)}
                />
              </PanelSection>
            </>
          ),
        },
        {
          key: "size",
          label: "Tamaño",
          icon: ScalingIcon,
          panel: (
            <Segmented
              ariaLabel="Tamaño del avatar"
              options={[
                { value: "S", label: "Pequeño" },
                { value: "M", label: "Mediano" },
                { value: "L", label: "Grande" },
              ]}
              value={props.size ?? "M"}
              onChange={(v) => set("size", v)}
            />
          ),
        },
        {
          key: "remove",
          label: "Ocultar " + sel.label.toLowerCase(),
          icon: Trash2Icon,
          danger: true,
          onClick: () => ed.removeElement(id, sel.label),
        },
      ];
    }

    case "hero":
      return [
        {
          key: "bot",
          label: "Bot",
          icon: BotIcon,
          active: !!ed.doc.bot?.enabled,
          mobileOnly: true,
          showLabel: true,
          panel: <LandingBotPanel />,
        },
        {
          key: "palette",
          label: "Tema de página",
          icon: PaletteIcon,
          mobileOnly: true,
          showLabel: true,
          panel: (
            <PalettePicker
              value={ed.doc.props["page"]?.["palette"]}
              onChange={(v) => { ed.setProp("page", "palette", v); ed.setProp("page", "bgOverride", undefined); }}
              textColor={ed.doc.props["page"]?.["textColor"]}
              onTextColorChange={(v) => ed.setProp("page", "textColor", v || "")}
              swatches={t.swatches}
            />
          ),
        },
        {
          key: "information",
          label: "Información",
          icon: InfoIcon,
          showLabel: true,
          panel: <QuickProfileInfoPanel />,
        },
        {
          key: "media",
          label: "Imagen",
          icon: ImageIcon,
          showLabel: true,
          panel: (
            <ImagePicker
              value={props.src}
              onChange={(v) => set("src", v)}
              onUpload={ed.uploadAsset}
            />
          ),
        },
        {
          key: "variant",
          label: "Variante",
          icon: LayoutTemplateIcon,
          showLabel: true,
          panel: (
            <HeroVariantPicker
              value={
                (props.variant as HeroVariant) ??
                (el?.querySelector("[data-hero]")?.getAttribute("data-hero") as HeroVariant) ??
                "centered"
              }
              onChange={(v) => set("variant", v)}
            />
          ),
        },
        {
          key: "shape",
          label: "Forma",
          icon: ShapesIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Forma de la portada">
              <HeroFrameShapePicker
                value={
                  (props.shape ??
                    el?.querySelector("[data-hero]")?.getAttribute("data-shape") ??
                    "curve") as HeroShape
                }
                onChange={(v) => {
                  // The hero silhouette is authoritative on `shape`. Clear the
                  // legacy mediaShape so old oval/rounded values cannot mask the
                  // first three hero options (curve, straight, inset).
                  set("shape", v);
                  if (props.mediaShape) set("mediaShape", "");
                }}
              />
            </PanelSection>
          ),
        },
        {
          key: "bg",
          label: "Fondo",
          icon: PaintBucketIcon,
          panel: <ToneGrid tones={t.tones} value={props.bg} onChange={(v) => set("bg", v)} />,
        },
        {
          key: "crop",
          label: "Encuadre",
          icon: CropIcon,
          panel: (
            <>
              <PanelSection title="Encuadre libre">
                <FreeCropControl
                  x={Number(props.cropX ?? 50)}
                  y={Number(props.cropY ?? 50)}
                  zoom={Number(props.zoom ?? 1)}
                  onChange={set}
                />
              </PanelSection>
              <PanelSection title="Posición rápida">
                <PositionPad value={props.pos ?? "center"} onChange={(v) => set("pos", v)} />
              </PanelSection>
            </>
          ),
        },
        {
          key: "lock",
          label: props.locked === "true" ? "Desbloquear" : "Bloquear",
          icon: props.locked === "true" ? LockIcon : UnlockIcon,
          active: props.locked === "true",
          onClick: () => set("locked", props.locked === "true" ? "false" : "true"),
        },
        {
          key: "lock",
          label: props.locked === "true" ? "Desbloquear" : "Bloquear",
          icon: props.locked === "true" ? LockIcon : UnlockIcon,
          active: props.locked === "true",
          onClick: () => set("locked", props.locked === "true" ? "false" : "true"),
        },
        {
          key: "overlay",
          label: "Overlay",
          icon: LayersIcon,
          panel: (
            <>
              <PanelSection title="Intensidad">
                <Segmented
                  ariaLabel="Overlay de portada"
                  options={[
                    { value: "none", label: "Sin" },
                    { value: "soft", label: "Suave" },
                    { value: "medium", label: "Medio" },
                    { value: "intense", label: "Intenso" },
                  ]}
                  value={props.overlay ?? "none"}
                  onChange={(v) => set("overlay", v)}
                />
              </PanelSection>
              <PanelSection title="Color">
                <SwatchRow
                  colors={t.swatches}
                  value={props.overlayColor}
                  onChange={(v) => set("overlayColor", v ?? "#111318")}
                />
              </PanelSection>
            </>
          ),
        },
        {
          key: "fusion",
          label: "Fusión",
          icon: PaintbrushIcon,
          panel: (
            <PanelSection title="Portada + fondo">
              <Segmented
                ariaLabel="Fusión de portada y fondo"
                options={[
                  { value: "none", label: "Sin" },
                  { value: "fade", label: "Fade" },
                  { value: "dominant", label: "Color" },
                  { value: "halo", label: "Halo" },
                  { value: "organic", label: "Orgánica" },
                ]}
                value={props.fusion ?? "none"}
                onChange={(v) => set("fusion", v)}
              />
            </PanelSection>
          ),
        },
      ];

    case "familyCard": {
      const ctx = getCardContext(ed, id, sel.blockKey);
      return ctx ? familyCardActions(ed, ctx) : [];
    }

    case "price":
      return priceActions(ed, t, id, getCardContext(ed, id, sel.blockKey), el);

    case "badge":
      return badgeActions(ed, id, getCardContext(ed, id, sel.blockKey), el);

    case "cta": {
      const collection = buttonCollectionFor(ed.doc, ed.templateId, sel.blockKey);
      const model = collection
        ? readButtonGroup(ed.doc, collection.blockKey, collection.seeds)
        : undefined;
      const item = model?.items.find((entry) => entry.scope === propId);
      const identity = model && item ? buttonIdentity(model, item.stableId) : undefined;
      const itemIndex = item && model ? model.order.indexOf(item.stableId) : -1;
      const itemHref = props["href"] ?? item?.href ?? el?.getAttribute("href") ?? "";
      const iconValue = props["icon"] ?? normalizeButtonIcon(item?.icon) ?? "none";
      const suggestedIcon = suggestButtonIcon(itemHref, item?.label ?? sel.label);
      const autoIconLabel = suggestedIcon
        ? (iconLibrary.find((entry) => entry.id === suggestedIcon)?.label ?? suggestedIcon)
        : "";

      const moveThisButton = (direction: -1 | 1) => {
        if (!collection || !item) return;
        ed.updateDoc((doc) => moveButton(doc, collection, item.stableId, direction));
      };

      const deleteThisButton = () => {
        if (!collection || !item || !model) {
          ed.removeElement(id, sel.label);
          return;
        }
        let changed = false;
        ed.updateDoc((doc) => {
          const next = deleteButton(doc, collection, item.stableId);
          changed = next !== doc;
          return next;
        });
        if (!changed) return;
        toast("Botón eliminado", { action: { label: "Deshacer", onClick: () => ed.undo() } });
      };

      const contentAction: EditorAction = {
        key: "content",
        label: "Contenido",
        icon: TypeIcon,
        showLabel: true,
        panel:
          collection && identity ? (
            <ButtonContentPanel
              blockKey={collection.blockKey}
              seeds={collection.seeds}
              scope={propId}
              label={identity.label}
            />
          ) : (
            <div className="space-y-4">
              <ScopeNote scope="item" />
              <PanelSection
                title="Texto"
                hint="También puedes hacer doble clic en el botón para editar en el lienzo."
              >
                <input
                  type="text"
                  aria-label="Texto del botón"
                  className="w-full rounded-xl border border-line bg-transparent px-3 py-2 text-[14px] text-ink shadow-sm focus:border-select focus:outline-none focus:ring-1 focus:ring-select"
                  value={ed.doc.texts[`${propId}.label`] ?? props["label"] ?? el?.textContent ?? ""}
                  onChange={(e) =>
                    ed.updateDoc((d) => ({
                      ...d,
                      texts: { ...d.texts, [`${propId}.label`]: e.target.value },
                    }))
                  }
                />
              </PanelSection>
              <PanelSection title="Enlace">
                <LinkEditor
                  value={itemHref}
                  onChange={(v) => set("href", v)}
                  newTab={props["newTab"]}
                  onNewTabChange={(v) => set("newTab", v)}
                />
              </PanelSection>
            </div>
          ),
      };

      const designAction: EditorAction = collection
        ? {
            key: "design",
            label: "Diseño",
            icon: PaintbrushIcon,
            showLabel: true,
            panel: (
              <ButtonGroupStylePanel
                blockKey={collection.blockKey}
                count={model?.items.length ?? 0}
              />
            ),
          }
        : ({
            key: "design",
            label: "Diseño",
            icon: PaintbrushIcon,
            showLabel: true,
            panel: (
              <div className="space-y-4">
                <ScopeNote scope="item" />
                <PanelSection title="Estilo">
                  <CtaStylePicker
                    value={(props["variant"] ?? el?.dataset.variant ?? "solid") as CtaVariant}
                    onChange={(v) => set("variant", v)}
                  />
                </PanelSection>
                <PanelSection title="Color">
                  <SwatchRow
                    colors={t.swatches}
                    value={props["color"]}
                    onChange={(v) => set("color", v ?? "")}
                  />
                </PanelSection>
                <PanelSection title="Forma y tamaño">
                  <CtaTreatmentPicker
                    hideIconPosition
                    hideKind
                    shape={
                      props["shape"] as
                        "square" | "soft" | "pill" | "circle" | "rounded" | undefined
                    }
                    size={props["size"] as "sm" | "md" | "lg" | "full" | undefined}
                    onChange={(key, value) => set(key, value)}
                  />
                </PanelSection>
              </div>
            ),
          } as EditorAction);

      const iconAction: EditorAction = {
        key: "icon-panel",
        label: "Icono",
        icon: ShapesIcon,
        showLabel: true,
        panel: (
          <div className="space-y-4">
            <ScopeNote scope="item" />
            <PanelSection
              title={`Icono de · ${identity?.label ?? sel.label}`}
              hint={
                autoIconLabel
                  ? `Detectamos ${autoIconLabel} por el enlace. Puedes cambiarlo manualmente.`
                  : "Puedes cambiarlo manualmente."
              }
            >
              <CollapsibleSection title="Cambiar icono" hint="Biblioteca de iconos">
                <IconPicker value={iconValue} onChange={(v) => set("icon", v)} />
              </CollapsibleSection>
              <button
                type="button"
                onClick={() => set("icon", "none")}
                className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-left text-[12.5px] font-medium text-ink transition-colors duration-150 hover:border-select hover:bg-select-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
              >
                Quitar icono
              </button>
              <button
                type="button"
                onClick={() => {
                  ed.updateDoc((d) => {
                    const p = { ...(d.props[sel.id] ?? {}) };
                    delete p.icon;
                    return { ...d, props: { ...d.props, [sel.id]: p } };
                  });
                }}
                className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-left text-[12.5px] font-medium text-ink transition-colors duration-150 hover:border-select hover:bg-select-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
              >
                Restaurar detección automática
              </button>
            </PanelSection>
            <PanelSection title="Posición">
              <Segmented
                ariaLabel="Posición del icono"
                options={[
                  { value: "left", label: "Izquierda" },
                  { value: "right", label: "Derecha" },
                ]}
                value={props["iconPosition"] ?? "left"}
                onChange={(v) => set("iconPosition", v)}
              />
            </PanelSection>
          </div>
        ),
      };

      const primaryAction: EditorAction = {
        key: "primary",
        label: "Destacar",
        icon: StarIcon,
        showLabel: true,
        active: props["isPrimary"] === "on",
        onClick: () => set("isPrimary", props["isPrimary"] === "on" ? "off" : "on"),
      };

      const moreAction: EditorAction = {
        key: "more-actions",
        label: "Más",
        icon: MoreHorizontalIcon,
        showLabel: true,
        panel: (
          <div className="space-y-4">
            {collection && item && identity && (
              <PanelSection title={`Orden · posición ${identity.position} de ${identity.total}`}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={itemIndex <= 0}
                    onClick={() => moveThisButton(-1)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-select-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
                  >
                    <ArrowUpIcon className="h-4 w-4" /> Subir
                  </button>
                  <button
                    type="button"
                    disabled={itemIndex >= (model?.items.length ?? 1) - 1}
                    onClick={() => moveThisButton(1)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-select-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
                  >
                    <ArrowDownIcon className="h-4 w-4" /> Bajar
                  </button>
                </div>
              </PanelSection>
            )}
            {collection && (
              <CollapsibleSection
                title="Gestionar botones"
                hint="Añadir, ordenar, duplicar y eliminar"
              >
                <ButtonRoster blockKey={collection.blockKey} seeds={collection.seeds} />
              </CollapsibleSection>
            )}
            <PanelSection title="Zona peligrosa" hint="Esta acción se puede deshacer.">
              <ConfirmButton
                label={collection ? "Eliminar este botón" : `Eliminar ${sel.label.toLowerCase()}`}
                onConfirm={deleteThisButton}
                className="w-full"
              />
            </PanelSection>
          </div>
        ),
      };

      const quickAddAction = collection
        ? {
            key: "quick-add",
            label: "Añadir otro botón",
            icon: PlusIcon,
            showLabel: false,
            onClick: () => {
              if (model) {
                const stableId = nextButtonId(model);
                ed.updateDoc((doc) => addButton(doc, collection));
                toast("Botón añadido", { action: { label: "Deshacer", onClick: () => ed.undo() } });
                window.setTimeout(
                  () => ed.select(canonicalScope(collection.blockKey, stableId), { reveal: true }),
                  80,
                );
              }
            },
          }
        : null;

      return [
        contentAction,
        designAction,
        iconAction,
        primaryAction,
        quickAddAction,
        moreAction,
      ].filter(Boolean) as EditorAction[];
    }
    case "separator":
      return [
        {
          key: "style",
          label: "Estilo",
          icon: DivideIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Estilo de separador">
              <SeparatorStylePicker
                value={resolveSeparatorStyle(props)}
                onChange={(v) => set("separatorStyle", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "spacing",
          label: "Espacio",
          icon: MoveIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Espacio alrededor">
              <Segmented
                ariaLabel="Espacio"
                options={[
                  { value: "sm", label: "S" },
                  { value: "md", label: "M" },
                  { value: "lg", label: "L" },
                  { value: "xl", label: "XL" },
                ]}
                value={props.separatorSpacing ?? props.spacing ?? "md"}
                onChange={(v) => set("separatorSpacing", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "thickness",
          label: "Grosor",
          icon: MinusIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Grosor del separador">
              <Segmented
                ariaLabel="Grosor"
                options={[
                  { value: "hairline", label: "Fina" },
                  { value: "medium", label: "Media" },
                  { value: "strong", label: "Marcada" },
                ]}
                value={props.thickness ?? "hairline"}
                onChange={(v) => set("thickness", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "width",
          label: "Ancho",
          icon: MoveHorizontalIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Ancho de la línea">
              <Segmented
                ariaLabel="Ancho"
                options={["25%", "40%", "60%", "80%", "100%"].map((value) => ({
                  value,
                  label: value,
                }))}
                value={props.width ?? "60%"}
                onChange={(v) => set("width", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "alignment",
          label: "Alineación",
          icon: AlignCenterIcon,
          panel: (
            <PanelSection title="Alineación">
              <Segmented
                ariaLabel="Alineación"
                options={[
                  { value: "left", label: "Izquierda" },
                  { value: "center", label: "Centro" },
                  { value: "right", label: "Derecha" },
                ]}
                value={props.alignment ?? "center"}
                onChange={(v) => set("alignment", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "color",
          label: "Color",
          icon: PaletteIcon,
          active: !!props.color && props.color !== "automatic",
          panel: (
            <PanelSection title="Color del separador">
              <SwatchRow
                colors={["automatic", ...t.swatches]}
                value={props.color ?? "automatic"}
                onChange={(v) => set("color", v ?? "automatic")}
              />
              {(!props.color ||
                props.color !== "automatic" ||
                !t.swatches.includes(props.color)) && (
                <div className="mt-3 flex items-center justify-between overflow-hidden rounded-xl border border-line bg-surface px-3 py-1.5 focus-within:border-select focus-within:ring-1 focus-within:ring-select">
                  <span className="text-[13px] font-medium text-ink">Color personalizado</span>
                  <input
                    type="color"
                    value={props.color === "automatic" || !props.color ? "#000000" : props.color}
                    onChange={(e) => set("color", e.target.value)}
                    className="h-7 w-12 cursor-pointer border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-line"
                  />
                </div>
              )}
            </PanelSection>
          ),
        },
        ...structureActions(ed, sel.blockKey),
      ];
    case "social": {
      const scope = socialStyleScope(sel.blockKey, sel.parentId);
      const platform =
        (props.platform as SocialPlatform) ??
        socialPlatforms.find((p) => p.label === sel.label)?.id ??
        "web";
      const current =
        (ed.doc.props[scope]?.iconStyle as SocialStyle) ??
        (el?.dataset.style as SocialStyle) ??
        "circle";
      return [
        {
          key: "platform",
          label: "Red",
          icon: ShapesIcon,
          showLabel: true,
          panel: <PlatformPicker value={platform} onChange={(v) => set("platform", v)} />,
        },
        {
          key: "url",
          label: "Destino",
          icon: Link2Icon,
          showLabel: true,
          panel: (
            <LinkEditor
              value={props.href ?? el?.getAttribute("href") ?? ""}
              onChange={(v) => set("href", v)}
            />
          ),
        },
        {
          key: "style",
          label: "Estilo",
          icon: PaintbrushIcon,
          panel: (
            <div className="space-y-4">
              <PanelSection
                title="Estilo de iconos"
                hint="Se aplica a todos los iconos de este grupo."
              >
                <Segmented
                  ariaLabel="Estilo de iconos"
                  options={[
                    { value: "circle", label: "Círculo" },
                    { value: "square", label: "Relleno" },
                    { value: "plain", label: "Solo icono" },
                  ]}
                  value={current}
                  onChange={(v) => ed.setProp(scope, "iconStyle", v)}
                />
              </PanelSection>
              <PanelSection title="Distribución">
                <Segmented
                  ariaLabel="Distribución social"
                  options={[
                    { value: "row", label: "Fila" },
                    { value: "column", label: "Columna" },
                    { value: "arc", label: "Arco" },
                    { value: "cluster", label: "Grupo" },
                  ]}
                  value={(ed.doc.props[scope]?.socialLayout as SocialLayout) ?? "row"}
                  onChange={(v) => ed.setProp(scope, "socialLayout", v)}
                />
              </PanelSection>
              <PanelSection title="Forma">
                <Segmented
                  ariaLabel="Forma social"
                  options={[
                    { value: "circle", label: "Círculo" },
                    { value: "rounded", label: "Suave" },
                    { value: "square", label: "Cuadrado" },
                  ]}
                  value={(ed.doc.props[scope]?.socialShape as SocialShape) ?? "circle"}
                  onChange={(v) => ed.setProp(scope, "socialShape", v)}
                />
              </PanelSection>
              <PanelSection title="Relleno">
                <Segmented
                  ariaLabel="Relleno social"
                  options={[
                    { value: "filled", label: "Relleno" },
                    { value: "outline", label: "Contorno" },
                    { value: "plain", label: "Plano" },
                  ]}
                  value={(ed.doc.props[scope]?.socialFill as SocialFill) ?? "filled"}
                  onChange={(v) => ed.setProp(scope, "socialFill", v)}
                />
              </PanelSection>
              <PanelSection title="Color de la burbuja">
                <SwatchRow
                  value={ed.doc.props[scope]?.socialBubbleColor as string | undefined}
                  onChange={(c) => ed.setProp(scope, "socialBubbleColor", c)}
                  colors={t.swatches}
                />
              </PanelSection>
              <PanelSection title="Color del ícono">
                <SwatchRow
                  value={ed.doc.props[scope]?.socialIconColor as string | undefined}
                  onChange={(c) => ed.setProp(scope, "socialIconColor", c)}
                  colors={t.swatches}
                />
              </PanelSection>
              <PanelSection title="Tamaño">
                <Segmented
                  ariaLabel="Tamaño social"
                  options={[
                    { value: "sm", label: "S" },
                    { value: "md", label: "M" },
                    { value: "lg", label: "L" },
                  ]}
                  value={(ed.doc.props[scope]?.socialSize as SocialSize) ?? "md"}
                  onChange={(v) => ed.setProp(scope, "socialSize", v)}
                />
              </PanelSection>
            </div>
          ),
        },
        {
          key: "remove",
          label: "Quitar",
          icon: Trash2Icon,
          danger: true,
          onClick: () => ed.removeElement(id, sel.label),
        },
      ];
    }

    case "card": {
      if (sel.label === "Vídeo") {
        return [
          {
            key: "video-url",
            label: "Enlace",
            icon: Link2Icon,
            showLabel: true,
            panel: <LinkEditor value={props.href ?? ""} onChange={(v) => set("href", v)} />,
          },
          {
            key: "replace",
            label: "Portada",
            icon: ImageIcon,
            panel: (
              <ImagePicker
                value={props.src}
                onChange={(v) => set("src", v)}
                onUpload={ed.uploadAsset}
              />
            ),
          },
          {
            key: "crop",
            label: "Encuadre",
            icon: CropIcon,
            panel: (
              <>
                <PanelSection title="Encuadre libre">
                  <FreeCropControl
                    x={Number(props.cropX ?? 50)}
                    y={Number(props.cropY ?? 50)}
                    zoom={Number(props.zoom ?? 1)}
                    onChange={set}
                  />
                </PanelSection>
                <PanelSection title="Posición rápida">
                  <PositionPad value={props.pos ?? "center"} onChange={(v) => set("pos", v)} />
                </PanelSection>
              </>
            ),
          },
          {
            key: "lock",
            label: props.locked === "true" ? "Desbloquear" : "Bloquear",
            icon: props.locked === "true" ? LockIcon : UnlockIcon,
            active: props.locked === "true",
            onClick: () => set("locked", props.locked === "true" ? "false" : "true"),
          },
        ];
      }
      const imgId = `${id}.img`;
      const hasImage = !!ed.getElement(imgId);
      const actions: EditorAction[] = [
        {
          key: "edit",
          label: "Editar texto",
          icon: PenLineIcon,
          showLabel: true,
          onClick: () => ed.select(`${id}.title`),
        },
      ];

      if (hasImage) {
        actions.push({
          key: "image",
          label: "Imagen",
          icon: ImageIcon,
          panel: (
            <ImagePicker
              value={ed.doc.props[imgId]?.src}
              onChange={(v) => ed.setProp(imgId, "src", v)}
              onUpload={ed.uploadAsset}
            />
          ),
        });
      }
      actions.push(
        {
          key: "link",
          label: "Enlace",
          icon: Link2Icon,
          panel: <LinkEditor value={props.href ?? ""} onChange={(v) => set("href", v)} />,
        },
        {
          key: "remove",
          label: "Quitar",
          icon: Trash2Icon,
          danger: true,
          onClick: () => ed.removeElement(id, sel.label),
        },
      );
      return actions;
    }

    case "gallery": {
      const current = props.items
        ? props.items.split("|")
        : Array.from(el?.querySelectorAll("img") ?? []).map((img) => img.getAttribute("src") ?? "");
      return [
        {
          key: "photos",
          label: "Fotos",
          icon: ImagesIcon,
          showLabel: true,
          panel: (
            <GalleryPhotosPicker
              value={current}
              onChange={(v) => set("items", v.join("|"))}
              onUpload={ed.uploadAsset}
            />
          ),
        },
        {
          key: "layout",
          label: "Diseño",
          icon: LayoutGridIcon,
          showLabel: true,
          panel: (
            <Segmented
              ariaLabel="Diseño de galería"
              options={galleryLayouts}
              value={props.layout ?? (el?.dataset.layout as string) ?? "fila"}
              onChange={(v) => set("layout", v)}
            />
          ),
        },
        {
          key: "remove",
          label: "Ocultar " + sel.label.toLowerCase(),
          icon: Trash2Icon,
          danger: true,
          onClick: () => ed.removeElement(id, sel.label),
        },
      ];
    }

    case "section": {
      const bg: EditorAction = {
        key: "bg",
        label: "Fondo",
        icon: PaintbrushIcon,
        showLabel: true,
        panel: <ToneGrid tones={t.tones} value={props.bg} onChange={(v) => set("bg", v)} />,
      };
      if (!sel.blockKey) return [bg];
      const key = sel.blockKey;
      const block = ed.doc.blocks.find((b) => b.key === key);
      const collection = buttonCollectionFor(ed.doc, ed.templateId, key);
      const groupModel = collection
        ? readButtonGroup(ed.doc, collection.blockKey, collection.seeds)
        : undefined;

      /* ----- Button group: identity first, one obvious action per intent ----- */
      if (collection && groupModel) {
        const setGroup = (groupKey: string, value: string) =>
          ed.setProp(`block:${collection.blockKey}`, groupKey, value);
        const addButtonAction = () => {
          const stableId = nextButtonId(groupModel);
          ed.updateDoc((doc) => addButton(doc, collection));
          toast("Botón añadido", { action: { label: "Deshacer", onClick: () => ed.undo() } });
          window.setTimeout(
            () => ed.select(canonicalScope(collection.blockKey, stableId), { reveal: true }),
            80,
          );
        };
        const setAllTextAlign = (value: TextAlign) =>
          ed.updateDoc((doc) => {
            const textStyles = { ...doc.textStyles };
            groupModel.items.forEach((entry) => {
              textStyles[`${entry.scope}.label`] = {
                ...textStyles[`${entry.scope}.label`],
                align: value,
              };
              if (entry.sub !== undefined) {
                textStyles[`${entry.scope}.sub`] = {
                  ...textStyles[`${entry.scope}.sub`],
                  align: value,
                };
              }
            });
            return { ...doc, textStyles };
          });
        const structure = structureActions(ed, collection.blockKey);
        const structureButton = (action: EditorAction) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={() => action.onClick?.()}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-select-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1"
            >
              <Icon className="h-4 w-4" /> {action.label}
            </button>
          );
        };

        return [
          {
            key: "add-button",
            label: "Añadir botón",
            icon: PlusIcon,
            showLabel: true,
            onClick: addButtonAction,
          },
          {
            key: "design",
            label: "Diseño",
            icon: PaintbrushIcon,
            showLabel: true,
            panel: (
              <ButtonGroupStylePanel
                blockKey={collection.blockKey}
                count={groupModel.items.length}
              />
            ),
          },
          {
            key: "spacing",
            label: "Espaciado",
            icon: MoveHorizontalIcon,
            showLabel: true,
            panel: (
              <div className="space-y-4">
                <ScopeNote scope="group" count={groupModel.items.length} />
                <PanelSection title="Entre botones">
                  <Segmented
                    ariaLabel="Espaciado del grupo"
                    options={[
                      { value: "tight", label: "Junto" },
                      { value: "normal", label: "Normal" },
                      { value: "loose", label: "Amplio" },
                    ]}
                    value={props["groupSpacing"] ?? "normal"}
                    onChange={(v) => setGroup("groupSpacing", v)}
                  />
                </PanelSection>
                <PanelSection title="Ancho de los botones">
                  <Segmented
                    ariaLabel="Ancho de botones"
                    options={[
                      { value: "on", label: "Ancho completo" },
                      { value: "off", label: "Ancho propio" },
                    ]}
                    value={props["groupFullWidth"] ?? "on"}
                    onChange={(v) => setGroup("groupFullWidth", v)}
                  />
                </PanelSection>
              </div>
            ),
          },
          {
            key: "align",
            label: "Alineación",
            icon: alignOptions[0]!.icon,
            showLabel: true,
            panel: (
              <div className="space-y-4">
                <ScopeNote scope="group" count={groupModel.items.length} />
                <PanelSection
                  title="Alineación de los botones"
                  hint="Posición de los botones dentro de la columna."
                >
                  <Segmented
                    ariaLabel="Alineación del grupo"
                    options={[
                      { value: "left", label: "Izquierda" },
                      { value: "center", label: "Centro" },
                      { value: "right", label: "Derecha" },
                    ]}
                    value={props["groupAlignment"] ?? "center"}
                    onChange={(v) => setGroup("groupAlignment", v)}
                  />
                </PanelSection>
                <PanelSection
                  title="Alineación del texto"
                  hint={`Aplica al texto y al subtexto de los ${groupModel.items.length} botones.`}
                >
                  <Segmented
                    ariaLabel="Alineación del texto del grupo"
                    options={alignOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    value={commonButtonTextAlign(ed.doc, groupModel) || "left"}
                    onChange={(v) => setAllTextAlign(v as TextAlign)}
                  />
                </PanelSection>
              </div>
            ),
          },
          {
            key: "manage",
            label: "Gestionar",
            icon: ListIcon,
            showLabel: true,
            panel: <ButtonRoster blockKey={collection.blockKey} seeds={collection.seeds} />,
          },
          {
            key: "more-actions",
            label: "Más",
            icon: MoreHorizontalIcon,
            showLabel: true,
            panel: (
              <div className="space-y-4">
                <PanelSection title="Fondo de la sección">
                  <ToneGrid tones={t.tones} value={props["bg"]} onChange={(v) => set("bg", v)} />
                </PanelSection>
                <PanelSection title="Bloque" hint="La sección que contiene los botones.">
                  <div className="flex flex-wrap gap-2">
                    {structure.filter((action) => !action.danger).map(structureButton)}
                  </div>
                </PanelSection>
                <AdvancedPanel hideBlockNav />
                <PanelSection title="Zona peligrosa" hint="Se puede deshacer.">
                  <div className="flex flex-wrap gap-2">
                    {structure.filter((action) => action.danger).map(structureButton)}
                  </div>
                </PanelSection>
              </div>
            ),
          },
        ];
      }
      const actions: EditorAction[] = [bg];
      if (block?.type === "collection") {
        actions.push({
          key: "layout",
          label: "Diseño",
          icon: LayoutGridIcon,
          panel: (
            <Segmented
              ariaLabel="Presentación de la colección"
              options={[
                { value: "lista", label: "Lista" },
                { value: "grid", label: "Cuadrícula" },
              ]}
              value={
                props.layout ??
                (el
                  ?.querySelector("[data-collection]")
                  ?.getAttribute("data-collection") as string) ??
                "lista"
              }
              onChange={(v) => set("layout", v)}
            />
          ),
        });
      }
      const family = block ? familyForBlockType(block.type) : undefined;
      if (family) {
        actions.push({
          key: "variant",
          label: "Variante",
          icon: LayoutTemplateIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title={`${family.label} · variante`}
              hint="Se aplica a todas las tarjetas del bloque. Cada tarjeta puede cambiar su diseño por separado."
            >
              <CardLayoutPicker
                options={family.variants.map((v) => ({
                  value: v.id as CardLayout,
                  label: v.label,
                }))}
                value={(props.variant ?? family.variants[0].id) as CardLayout}
                onChange={(v) => set("variant", v)}
                thumbFor={(v) => family.variants.find((x) => x.id === v)?.layout ?? "left"}
              />
            </PanelSection>
          ),
        });
      }
      if (block?.type === "catalog") {
        actions.push({
          key: "catalog-conversion",
          label: "Catálogo completo",
          icon: LayoutTemplateIcon,
          showLabel: true,
          panel: <CatalogConversionPanel blockKey={key} />,
        });
      }
      actions.push({
        key: "add",
        label: "Añadir debajo",
        icon: PlusIcon,
        mobileOnly: true,
        onClick: () => ed.openPicker(key),
      });
      return [...actions, ...structureActions(ed, key)];
    }

    case "page":
      return [
        {
          key: "bg",
          label: "Fondo",
          icon: PaintBucketIcon,
          showLabel: true,
          panel: (
            <ToneGrid
              tones={t.tones.filter((x) => t.pageTones.includes(x.id))}
              value={ed.doc.props.page?.bg ?? t.pageTones[0]}
              onChange={(v) => ed.setProp("page", "bg", v)}
              allowDefault={false}
            />
          ),
        },
        {
          key: "font",
          label: "Tipografía",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <FontPicker
              fonts={t.fonts}
              value={ed.doc.props.page?.font ?? t.fonts[0].id}
              onChange={(v) => ed.setProp("page", "font", v)}
            />
          ),
        },
        {
          key: "palette",
          label: "Tema de página",
          icon: PaletteIcon,
          mobileOnly: true,
          showLabel: true,
          panel: (
            <PalettePicker
              value={ed.doc.props["page"]?.["palette"]}
              onChange={(v) => { ed.setProp("page", "palette", v); ed.setProp("page", "bgOverride", undefined); }}
              textColor={ed.doc.props["page"]?.["textColor"]}
              onTextColorChange={(v) => ed.setProp("page", "textColor", v || "")}
              swatches={t.swatches}
            />
          ),
        },

        {
          key: "bot",
          label: "Bot",
          icon: BotIcon,
          active: !!ed.doc.bot?.enabled,
          showLabel: true,
          panel: <LandingBotPanel />,
        },

        {
          key: "settings",
          label: "Ajustes",
          icon: Settings2Icon,
          showLabel: true,
          onClick: () => ed.setSettingsOpen(true),
        },
      ];

    default:
      return [];
  }
}
