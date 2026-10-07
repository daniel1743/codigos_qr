import React from "react";
import { toast } from "sonner";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpRightIcon,
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
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleUserRoundIcon,
  DivideIcon,
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
import { NumberField } from "./controls/NumberField";
import { TextField } from "./controls/TextField";
import { Toggle } from "./controls/Toggle";
import { Segmented } from "./controls/Segmented";
import { SizeStepper } from "./controls/SizeStepper";
import { AlignGroup, alignOptions } from "./controls/AlignGroup";
import { SwatchRow } from "./controls/SwatchRow";
import { MediaOverlayColorPicker } from "./controls/MediaTreatmentPicker";
import { TextColorPanel } from "./controls/TextColorPanel";
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
import { applyCardFamilyVariant } from "../../utils/cardOps";
import {
  IMAGE_CARDS_MAX,
  canDeleteImageCard,
  deleteImageCard,
  duplicateImageCard,
  imageCardsOrder,
  parseImageCardSlot,
  resolveImageCardShape,
  type ImageCardShape,
} from "../../utils/imageCardOps";
import {
  REVIEWS_MAX,
  REVIEW_RATINGS,
  canDeleteReview,
  deleteReview,
  duplicateReview,
  moveReview,
  parseReviewSlot,
  readReview,
  reviewsOrder,
} from "../../utils/reviewsOps";
import {
  SERVICES_MAX,
  canDeleteService,
  deleteService,
  duplicateService,
  moveService,
  parseServiceSlot,
  readService,
  serviceFieldId,
  servicesOrder,
  type ServiceField,
} from "../../utils/servicesOps";
import { ROW_TREATMENTS, resolveRowTreatment } from "../../utils/rowTreatment";
import {
  SOCIAL_PRESENTATIONS,
  resolveSocialPresentation,
} from "../../utils/socialOps";
import { mediaOverlayFromProps } from "../../utils/styles";
import { PANEL_SURFACES, resolvePanelSurface } from "../../utils/actionPanelOps";
import { ACTION_PANEL_DEFAULT, CONTACT_ROWS as CONTACT_ROWS_FOR_EDITOR } from "../blocks/ActionPanelBlock";
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

/**
 * Only title / main texts expose the page-wide colour shortcut in the panel.
 * Keys are the leaf segment of the element id (e.g. `hero.name` → `name`).
 */
const mainTextLeafKeys = ["title", "name", "heading", "headline", "subtitle"];

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
  /**
   * Live hero variant, read from the `data-hero` the renderer already publishes.
   * It resolves to the *effective* variant (stored value or the template default),
   * which is what decides whether a silhouette actually draws.
   * `closest` covers the hero-image selection (the attribute is on an ancestor),
   * `querySelector` covers the hero block itself.
   */
  const liveHeroVariant =
    (el?.closest("[data-hero]") ?? el?.querySelector("[data-hero]"))?.getAttribute("data-hero") ?? null;
  /** A literal px radius stored in the media-shape slot; `undefined` = a named shape. */
  const mediaShapeRaw = props[isHeroImage ? "mediaShape" : "shape"];
  const customMediaRadius = mediaShapeRaw && /^\d+$/.test(mediaShapeRaw) ? Number(mediaShapeRaw) : undefined;
  /** A literal px height for this media element (L2.2); `undefined` = the layout's own ratio. */
  const customMediaHeight =
    props["mediaHeight"] && /^\d+$/.test(props["mediaHeight"]) ? Number(props["mediaHeight"]) : undefined;
  const set = (key: string, value: string) => ed.setProp(propId, key, value);

  switch (sel.kind) {
    case "surface": {
      // `getCardContext` resolves only for a surface that belongs to a structured
      // family card. Other surfaces (e.g. the Bio "collection" overlay that floats
      // on top of an image) legitimately have no card family, so we never assume a
      // `family` exists here.
      const cardCtx = getCardContext(ed, id, sel.blockKey);
      // The styling panel only needs `cardId`: a family-less surface still resolves
      // to its enclosing item id (e.g. `collection.0.surface` → `collection.0`).
      const panelCtx = cardCtx ?? { cardId: id.replace(/\.surface$/, "") };
      return [
        {
          key: "surface",
          label: "Superficie",
          icon: PaintBucketIcon,
          showLabel: true,
          panel: <CardSurfaceFields ctx={panelCtx} />,
        },
        // Trash removes ONLY this surface (a background panel): never the card, its
        // image nor the elements around it. `removeElement` hides it by id
        // (`doc.removed`), clears the selection and is fully undoable. We do NOT
        // reuse `familyCardActions` here — that deletes the whole card, and calling
        // it with the family-less fallback crashed the toolbar (P0 — `family.variants`
        // of undefined), which is exactly what must not happen again.
        {
          key: "remove",
          label: "Eliminar",
          icon: Trash2Icon,
          danger: true,
          onClick: () => ed.removeElement(id, "Superficie"),
        },
      ];
    }
    case "text": {
      const ts = ed.doc.textStyles[id] ?? {};
      const isMainText = mainTextLeafKeys.includes(id.split(".").pop() ?? "") ||
        /t[ií]tulo|nombre|titular/i.test(sel.label ?? "");
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
            isMainText ? (
              <TextColorPanel id={id} swatches={t.swatches} />
            ) : (
              <SwatchRow
                colors={t.swatches}
                value={ts.color}
                onChange={(c) => ed.setTextStyle(id, { color: c })}
              />
            )
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
              unifyActive={!!ed.doc.props['page']?.['textColor']}
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
                variant={liveHeroVariant}
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
                value={customMediaRadius === undefined ? (props[mediaShapeKey] ?? "rounded") : "custom"}
                onChange={(v) => set(mediaShapeKey, v)}
              />
              <div className="mt-2">
                <NumberField
                  label="Radio personalizado"
                  value={customMediaRadius}
                  onChange={(n) => set(mediaShapeKey, n === undefined ? "" : String(Math.round(n)))}
                  step={2}
                  min={0}
                  max={120}
                  suffix="px"
                  placeholder="14"
                />
              </div>
            </PanelSection>
          ),
        },
        {
          // L2.2 · reusable: any media element whose renderer reads `mediaHeight`
          // gets a height control here — gallery photos and the generic image
          // today, anywhere the same prop is read later.
          key: "media-height",
          label: "Altura",
          icon: ScalingIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title="Altura de la imagen"
              hint="Vacío conserva la proporción de la maqueta."
            >
              <NumberField
                label="Alto"
                value={customMediaHeight}
                onChange={(n) => set("mediaHeight", n === undefined ? "" : String(Math.round(n)))}
                step={10}
                min={40}
                max={900}
                suffix="px"
                placeholder="200"
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
        {
          key: "link",
          label: "Enlace",
          icon: Link2Icon,
          showLabel: true,
          panel: (
            <LinkEditor
              value={props.href ?? ""}
              onChange={(v) => set("href", v)}
              newTab={props.newTab}
              onNewTabChange={(v) => set("newTab", v)}
            />
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

    case "hero": {
      /* The hero's own text ids live under the block's prefix — `hero.brand`
         for the first hero, `hero-2/hero.brand` for the next one. */
      const heroPrefix = sel.blockKey === "hero" ? "" : `${sel.blockKey}/`;
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
              // Clearing the override writes `""`, never `undefined`: every value in
              // `props` must be a string or `hasValidMagicPayload` rejects the whole
              // document as non-MAGIC_V1 on reload. Readers treat `""` as absent.
              onChange={(v) => { ed.setProp("page", "palette", v); ed.setProp("page", "bgOverride", ""); }}
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
          /* L2.5 · the two labels a hero header row can carry beside the brand:
             the eyebrow (header) and the caption's trailing label (meta).
             Both are opt-in — writing one makes it appear and become editable
             in place, clearing it removes the element again. Nothing is
             hardcoded per template: the text is the author's. */
          key: "hero-labels",
          label: "Rótulos",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <div className="space-y-4">
              <PanelSection
                title="Etiqueta de cabecera"
                hint="Aparece junto a la marca, en las portadas con fila de cabecera. Vacío no muestra nada.">
                <TextField
                  label="Etiqueta"
                  value={ed.doc.texts[`${heroPrefix}hero.eyebrow`] ?? ""}
                  placeholder="Barcelona"
                  onCommit={(v) => ed.setText(`${heroPrefix}hero.eyebrow`, v)}
                />
              </PanelSection>
              <PanelSection
                title="Línea de pie"
                hint="Segundo rótulo de la fila de caption, bajo la imagen. Vacío no muestra nada.">
                <TextField
                  label="Pie"
                  value={ed.doc.texts[`${heroPrefix}hero.meta`] ?? ""}
                  placeholder="01 / 24"
                  onCommit={(v) => ed.setText(`${heroPrefix}hero.meta`, v)}
                />
              </PanelSection>
            </div>
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
                variant={liveHeroVariant}
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
          // Block scope resolves tones by id only, so the free HEX option is not offered here.
          panel: <ToneGrid tones={t.tones} value={props.bg} onChange={(v) => set("bg", v)} allowCustom={false} />,
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
    }

    case "familyCard": {
      const ctx = getCardContext(ed, id, sel.blockKey);
      return ctx ? familyCardActions(ed, ctx) : [];
    }

    case "service": {
      const blockKey = sel.blockKey;
      const slot = blockKey ? parseServiceSlot(blockKey, id) : null;
      if (!blockKey || !slot) return [];
      const order = servicesOrder(ed.doc, blockKey);
      const index = order.indexOf(slot);
      const view = readService(ed.doc, blockKey, slot, index < 0 ? 0 : index);
      const atMax = order.length >= SERVICES_MAX;
      const canRemove = canDeleteService(ed.doc, blockKey);
      const field = (name: ServiceField) => serviceFieldId(blockKey, slot, name);
      const rowAction =
        "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-select-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1";
      return [
        {
          key: "title",
          label: "Título",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Título del servicio">
              <TextField
                label="Título"
                value={view.title}
                placeholder="Consulta general"
                onCommit={(v) => ed.setText(field("title"), v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "detail",
          label: "Detalle",
          icon: ListIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Detalle">
              <TextField
                label="Detalle"
                multiline
                value={view.detail}
                placeholder="Qué incluye"
                onCommit={(v) => ed.setText(field("detail"), v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "price",
          label: "Precio",
          icon: BadgeCheckIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Precio" hint="Texto libre: «Desde $25», «45 €», «A consultar».">
              <TextField
                label="Precio"
                value={view.price}
                placeholder="Desde $25"
                onCommit={(v) => ed.setText(field("price"), v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "order",
          label: "Orden",
          icon: MoveIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Orden">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={rowAction}
                  disabled={index <= 0}
                  onClick={() => ed.updateDoc((doc) => moveService(doc, blockKey, slot, -1))}
                >
                  <ArrowUpIcon className="h-4 w-4" /> Subir
                </button>
                <button
                  type="button"
                  className={rowAction}
                  disabled={index < 0 || index >= order.length - 1}
                  onClick={() => ed.updateDoc((doc) => moveService(doc, blockKey, slot, 1))}
                >
                  <ArrowDownIcon className="h-4 w-4" /> Bajar
                </button>
              </div>
            </PanelSection>
          ),
        },
        {
          key: "duplicate",
          label: "Duplicar",
          icon: CopyIcon,
          showLabel: true,
          disabled: atMax,
          onClick: () => ed.updateDoc((doc) => duplicateService(doc, blockKey, slot)),
        },
        {
          key: "remove",
          label: "Eliminar",
          icon: Trash2Icon,
          showLabel: true,
          danger: true,
          disabled: !canRemove,
          onClick: () => ed.updateDoc((doc) => deleteService(doc, blockKey, slot)),
        },
      ];
    }

    case "imageCard": {
      const blockKey = sel.blockKey;
      const slot = blockKey ? parseImageCardSlot(blockKey, id) : null;
      if (!blockKey || !slot) return [];
      const order = imageCardsOrder(ed.doc, blockKey);
      const atMax = order.length >= IMAGE_CARDS_MAX;
      const canRemove = canDeleteImageCard(ed.doc, blockKey);
      return [
        {
          key: "image",
          label: "Imagen",
          icon: ImageIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Reemplazar imagen">
              <ImagePicker
                value={props["src"]}
                onChange={(v) => set("src", v)}
                onUpload={ed.uploadAsset}
              />
            </PanelSection>
          ),
        },
        {
          // L2.2 · same capability, different bag: an image card's media height
          // lives on the card itself, because the card IS the media element.
          key: "media-height",
          label: "Altura",
          icon: ScalingIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title="Altura de la tarjeta"
              hint="Vacío conserva la proporción cuadrada."
            >
              <NumberField
                label="Alto"
                value={customMediaHeight}
                onChange={(n) => set("mediaHeight", n === undefined ? "" : String(Math.round(n)))}
                step={10}
                min={40}
                max={900}
                suffix="px"
                placeholder="200"
              />
            </PanelSection>
          ),
        },
        {
          key: "shape",
          label: "Forma",
          icon: ShapesIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Esquinas de la tarjeta">
              <Segmented<ImageCardShape>
                ariaLabel="Forma de la tarjeta"
                options={[
                  { value: "square", label: "Cuadrada" },
                  { value: "rounded", label: "Redondeada" },
                  { value: "extra", label: "Muy redondeada" },
                ]}
                value={resolveImageCardShape(props["shape"])}
                onChange={(v) => set("shape", v)}
              />
            </PanelSection>
          ),
        },
        {
          // L2.4 · the same `overlay` / `overlayColor` slots every media element
          // reads, through the same adapter — so this is the existing
          // superposición capability reaching one more element, not a scrim that
          // only image cards know how to draw.
          key: "overlay",
          label: "Superposición",
          icon: LayersIcon,
          showLabel: true,
          panel: (
            <>
              <PanelSection title="Intensidad de la superposición">
                <Segmented
                  ariaLabel="Superposición de la tarjeta"
                  options={[
                    { value: "none", label: "Sin" },
                    { value: "soft", label: "Suave" },
                    { value: "medium", label: "Media" },
                    { value: "intense", label: "Intensa" },
                  ]}
                  value={mediaOverlayFromProps(props)}
                  onChange={(v) => set("overlay", v)}
                />
              </PanelSection>
              {mediaOverlayFromProps(props) !== "none" &&
              <MediaOverlayColorPicker
                colors={t.swatches}
                value={props["overlayColor"]}
                onChange={(c) => set("overlayColor", c)} />
              }
            </>
          ),
        },
        {
          key: "caption",
          label: "Texto",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title="Texto sobre la imagen"
              hint="Vacío no muestra ningún texto. Aparece abajo, sobre la foto.">
              <TextField
                label="Texto"
                value={ed.doc.texts[`${id}.title`] ?? ""}
                placeholder="Ver proyecto"
                onCommit={(v) => ed.setText(`${id}.title`, v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "caption-icon",
          label: "Icono",
          icon: ArrowUpRightIcon,
          active: (props["captionIcon"] ?? "off") === "on",
          onClick: () => set("captionIcon", (props["captionIcon"] ?? "off") === "on" ? "off" : "on"),
        },
        {
          key: "link",
          label: "Enlace",
          icon: Link2Icon,
          showLabel: true,
          panel: (
            <PanelSection
              title="Enlace de la tarjeta"
              hint="En Vista previa, tocar la tarjeta abre este destino.">
              <LinkEditor
                value={props["href"] ?? ""}
                onChange={(v) => set("href", v)}
                newTab={props["newTab"]}
                onNewTabChange={(v) => set("newTab", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "duplicate",
          label: "Duplicar",
          icon: CopyIcon,
          disabled: atMax,
          onClick: () => {
            if (atMax) return;
            ed.updateDoc((doc) => duplicateImageCard(doc, blockKey, slot));
            toast("Tarjeta duplicada", { action: { label: "Deshacer", onClick: () => ed.undo() } });
          },
        },
        {
          key: "remove",
          label: "Eliminar",
          icon: Trash2Icon,
          danger: true,
          disabled: !canRemove,
          onClick: () => {
            if (!canRemove) return;
            ed.updateDoc((doc) => deleteImageCard(doc, blockKey, slot));
            toast("Tarjeta eliminada", { action: { label: "Deshacer", onClick: () => ed.undo() } });
          },
        },
      ];
    }

    case "review": {
      const blockKey = sel.blockKey;
      const slot = blockKey ? parseReviewSlot(blockKey, id) : null;
      if (!blockKey || !slot) return [];
      const order = reviewsOrder(ed.doc, blockKey);
      const index = order.indexOf(slot);
      const view = readReview(ed.doc, blockKey, slot, index < 0 ? 0 : index);
      const atMax = order.length >= REVIEWS_MAX;
      const canRemove = canDeleteReview(ed.doc, blockKey);
      const rowAction =
        "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-select-soft disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1";
      return [
        {
          key: "photo",
          label: "Foto",
          icon: ImageIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Foto o avatar (opcional)">
              <ImagePicker
                value={props["avatar"]}
                onChange={(v) => set("avatar", v)}
                onUpload={ed.uploadAsset}
              />
            </PanelSection>
          ),
        },
        {
          key: "name",
          label: "Nombre",
          icon: CircleUserRoundIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Nombre">
              <TextField
                label="Nombre"
                value={view.name}
                placeholder="Nombre del cliente"
                onCommit={(v) => set("name", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "text",
          label: "Testimonio",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Testimonio">
              <TextField
                label="Testimonio"
                multiline
                value={view.text}
                placeholder="Escribe aquí la reseña"
                onCommit={(v) => set("text", v)}
              />
            </PanelSection>
          ),
        },
        {
          key: "rating",
          label: "Valoración",
          icon: StarIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Valoración" hint="De 1 a 5 estrellas.">
              <div role="radiogroup" aria-label="Valoración" className="flex gap-1">
                {REVIEW_RATINGS.map((stars) => {
                  const filled = stars <= view.rating;
                  return (
                    <button
                      key={stars}
                      type="button"
                      role="radio"
                      aria-checked={stars === view.rating}
                      aria-label={`${stars} ${stars === 1 ? "estrella" : "estrellas"}`}
                      onClick={() => set("rating", String(stars))}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white transition-colors duration-150 hover:bg-select-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1">
                      <StarIcon
                        className="h-4 w-4"
                        style={{ color: filled ? "var(--accent)" : "var(--line)" }}
                        fill={filled ? "var(--accent)" : "none"}
                      />
                    </button>
                  );
                })}
              </div>
            </PanelSection>
          ),
        },
        {
          key: "duplicate",
          label: "Duplicar",
          icon: CopyIcon,
          disabled: atMax,
          onClick: () => {
            if (atMax) return;
            ed.updateDoc((doc) => duplicateReview(doc, blockKey, slot));
            toast("Reseña duplicada", { action: { label: "Deshacer", onClick: () => ed.undo() } });
          },
        },
        {
          key: "order",
          label: "Orden",
          icon: MoveHorizontalIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title={`Orden · reseña ${index + 1} de ${order.length}`}
              hint="Reordena las reseñas dentro del bloque.">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={index <= 0}
                  onClick={() => ed.updateDoc((doc) => moveReview(doc, blockKey, slot, -1))}
                  className={rowAction}>
                  <ArrowLeftIcon className="h-4 w-4" /> Mover antes
                </button>
                <button
                  type="button"
                  disabled={index < 0 || index >= order.length - 1}
                  onClick={() => ed.updateDoc((doc) => moveReview(doc, blockKey, slot, 1))}
                  className={rowAction}>
                  Mover después <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </PanelSection>
          ),
        },
        {
          key: "remove",
          label: "Eliminar",
          icon: Trash2Icon,
          danger: true,
          disabled: !canRemove,
          onClick: () => {
            if (!canRemove) return;
            ed.updateDoc((doc) => deleteReview(doc, blockKey, slot));
            toast("Reseña eliminada", { action: { label: "Deshacer", onClick: () => ed.undo() } });
          },
        },
      ];
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
                {/* A per-CTA `color` control was removed: the prop was written but no
                    renderer ever read it (EditableCTA resolves colour from `variant`
                    and the group tokens). Offering it promised a change that could
                    not happen. The prop itself is left intact for stored documents. */}
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
                title="Presentación"
                hint="El grupo entero cambia: burbujas con logotipo, o etiquetas de texto."
              >
                <Segmented
                  ariaLabel="Presentación social"
                  options={SOCIAL_PRESENTATIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={resolveSocialPresentation(ed.doc.props[scope]?.["socialPresentation"])}
                  onChange={(v) => ed.setProp(scope, "socialPresentation", v)}
                />
                <p className="mt-2 text-[11.5px] leading-snug text-mute">
                  {
                    SOCIAL_PRESENTATIONS.find(
                      (o) => o.value === resolveSocialPresentation(ed.doc.props[scope]?.["socialPresentation"])
                    )?.hint
                  }
                </p>
              </PanelSection>
              <PanelSection
                title="Estilo de iconos"
                hint="Solo en la presentación de iconos. En píldoras manda «Forma»."
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
            <PanelSection title="Diseño de la galería">
              <Segmented
                ariaLabel="Diseño de galería"
                options={galleryLayouts}
                value={props.layout ?? (el?.dataset.layout as string) ?? "fila"}
                onChange={(v) => set("layout", v)}
              />
              <p className="mt-2 text-[11.5px] leading-snug text-mute">
                {
                  galleryLayouts.find(
                    (option) => option.value === (props.layout ?? (el?.dataset.layout as string) ?? "fila")
                  )?.hint
                }
              </p>
            </PanelSection>
          ),
        },
        {
          key: "link",
          label: "Enlace",
          icon: Link2Icon,
          showLabel: true,
          panel: (
            <LinkEditor
              value={props.href ?? ""}
              onChange={(v) => set("href", v)}
              newTab={props.newTab}
              onNewTabChange={(v) => set("newTab", v)}
              helper="Todas las fotos abrirán este destino. También puedes darle un enlace propio a cada foto tocándola."
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
                  <ToneGrid tones={t.tones} value={props["bg"]} onChange={(v) => set("bg", v)} allowCustom={false} />
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
                onChange={(v) => {
                  if (ed.canonicalEditing) {
                    set("variant", v);
                  } else {
                    family.id === "catalog"
                      ? ed.updateDoc((doc) => applyCardFamilyVariant(doc, key, v))
                      : set("variant", v);
                  }
                }}
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
      /* ----- Services: how the rows are drawn, plus its own heading -----
         The treatment comes from `rowTreatment`, the shared vocabulary for
         "a surface per row versus rules between rows". L2.4 checked whether
         `social` could adopt the same vocabulary and found it could not: the
         target's `cardStyle: 'line'` branch there sets a corner radius and is
         shared with `sharp`, so reusing this name would give it two meanings.
         `rowTreatment` therefore has exactly one meaning, and only here. */
      if (block?.type === "services" && !ed.canonicalDocument) {
        const treatment = resolveRowTreatment(props["rowTreatment"]);
        actions.push({
          key: "row-treatment",
          label: "Estilo de fila",
          icon: ListIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title="Estilo de fila"
              hint="Superficie por fila, o una lista separada por filetes."
            >
              <Segmented
                ariaLabel="Estilo de fila"
                options={ROW_TREATMENTS.map((o) => ({ value: o.value, label: o.label }))}
                value={treatment}
                onChange={(v) => set("rowTreatment", v)}
              />
              <p className="mt-2 text-[11.5px] leading-snug text-mute">
                {ROW_TREATMENTS.find((o) => o.value === treatment)?.hint}
              </p>
            </PanelSection>
          ),
        });
        const servicesTitleId = `${key === block.type ? "" : `${key}/`}services.title`;
        actions.push({
          key: "services-heading",
          label: "Título",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Título del bloque" hint="Vacío no muestra ningún título.">
              <TextField
                label="Título"
                value={ed.doc.texts[servicesTitleId] ?? ""}
                placeholder="Servicios"
                onCommit={(v) => ed.setText(servicesTitleId, v)}
              />
            </PanelSection>
          ),
        });
      }

      /* ----- Social: the block's own heading -----
         Same opt-in contract as `reviews` and `services`: the text is the
         author's, and nothing renders until one is written. The target's own
         copy is never hardcoded — the placeholder is only a hint in the field. */
      if (block?.type === "social" && !ed.canonicalDocument) {
        const socialTitleId = `${key === block.type ? "" : `${key}/`}social.title`;
        actions.push({
          key: "social-heading",
          label: "Título",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Título del bloque" hint="Vacío no muestra ningún título.">
              <TextField
                label="Título"
                value={ed.doc.texts[socialTitleId] ?? ""}
                placeholder="Síguenos"
                onCommit={(v) => ed.setText(socialTitleId, v)}
              />
            </PanelSection>
          ),
        });
      }

      /* ----- CTA / WhatsApp / Contacto: one primitive, three types -----
         Presentation and semantics are edited in separate places and compose
         freely. `panelSurface` is how the block is painted; where it sends the
         visitor lives on the action element's own controls (`LinkEditor`, which
         validates the destination). Changing the look never touches the link,
         and editing the link never restyles the block. */
      if (
        (block?.type === "cta" || block?.type === "whatsapp" || block?.type === "contact") &&
        !ed.canonicalDocument
      ) {
        const panelType = block.type;
        const base = key === block.type ? "" : `${key}/`;
        const titleId = `${base}${panelType}.title`;
        const subId = `${base}${panelType}.sub`;
        actions.push({
          key: "panel-surface",
          label: "Presentación",
          icon: PaintBucketIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title="Presentación"
              hint="Cómo se pinta el bloque. No cambia a dónde lleva su acción."
            >
              <Segmented
                ariaLabel="Presentación del bloque"
                options={PANEL_SURFACES.map((o) => ({ value: o.value, label: o.label }))}
                value={resolvePanelSurface(props["panelSurface"], ACTION_PANEL_DEFAULT[panelType])}
                onChange={(v) => set("panelSurface", v)}
              />
              <p className="mt-2 text-[11.5px] leading-snug text-mute">
                {
                  PANEL_SURFACES.find(
                    (o) => o.value === resolvePanelSurface(props["panelSurface"], ACTION_PANEL_DEFAULT[panelType])
                  )?.hint
                }
              </p>
            </PanelSection>
          ),
        });
        actions.push({
          key: "panel-heading",
          label: "Título",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Título del bloque" hint="Vacío no muestra ningún título.">
              <TextField
                label="Título"
                value={ed.doc.texts[titleId] ?? ""}
                placeholder={panelType === "whatsapp" ? "¿Hablamos?" : panelType === "cta" ? "¿Te tentamos?" : "Contacto"}
                onCommit={(v) => ed.setText(titleId, v)}
              />
            </PanelSection>
          ),
        });
        actions.push({
          key: "panel-sub",
          label: "Descripción",
          icon: PenLineIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Descripción" hint="Vacío no muestra ningún texto de apoyo.">
              <TextField
                label="Descripción"
                value={ed.doc.texts[subId] ?? ""}
                placeholder="Respondemos en minutos."
                onCommit={(v) => ed.setText(subId, v)}
              />
            </PanelSection>
          ),
        });
        /* Contact's three labelled rows. Each is a label plus a destination, so
           a row with a destination becomes a real link and one without stays
           plain text — never a dead anchor. */
        if (panelType === "contact") {
          for (const row of CONTACT_ROWS_FOR_EDITOR) {
            const rowId = `${base}contact.${row.key}`;
            actions.push({
              key: `contact-${row.key}`,
              label: row.label,
              icon: row.icon,
              showLabel: true,
              panel: (
                <div className="space-y-4">
                  <PanelSection title={row.label} hint="Vacío no muestra esta fila.">
                    <TextField
                      label={row.fieldLabel}
                      value={ed.doc.texts[`${rowId}.label`] ?? ""}
                      placeholder={row.placeholder}
                      onCommit={(v) => ed.setText(`${rowId}.label`, v)}
                    />
                  </PanelSection>
                  <PanelSection
                    title="Destino"
                    hint="Solo si hay destino la fila se convierte en un enlace."
                  >
                    <LinkEditor
                      value={ed.doc.props[rowId]?.["href"] ?? ""}
                      onChange={(v) => ed.setProp(rowId, "href", v)}
                    />
                  </PanelSection>
                </div>
              ),
            });
          }
        }
      }

      /* ----- Reviews: the block's own heading, and its avatar treatment -----
         Both are opt-in, so a page that never touches them renders exactly as
         before: the heading appears only once a title has been written, and the
         avatars stay on unless switched off. The Magic Patterns targets carry a
         heading and no avatars at all, which is what these two close. */
      if (block?.type === "reviews" && !ed.canonicalDocument) {
        const titleId = `${key === block.type ? "" : `${key}/`}reviews.title`;
        actions.push({
          key: "reviews-heading",
          label: "Título",
          icon: TypeIcon,
          showLabel: true,
          panel: (
            <PanelSection title="Título del bloque" hint="Vacío no muestra ningún título.">
              <TextField
                label="Título"
                value={ed.doc.texts[titleId] ?? ""}
                placeholder="Lo que dicen"
                onCommit={(v) => ed.setText(titleId, v)}
              />
            </PanelSection>
          ),
        });
        actions.push({
          key: "reviews-avatars",
          label: "Avatares",
          icon: CircleUserRoundIcon,
          showLabel: true,
          panel: (
            <PanelSection
              title="Avatares"
              hint="Muestra la foto o la inicial junto a cada reseña."
            >
              <Toggle
                label="Mostrar avatares"
                checked={props["showAvatars"] !== "off"}
                onChange={(v) => set("showAvatars", v ? "on" : "off")}
              />
            </PanelSection>
          ),
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
          showLabel: true,
          panel: (
            <PalettePicker
              value={ed.doc.props["page"]?.["palette"]}
              // Clearing the override writes `""`, never `undefined`: every value in
              // `props` must be a string or `hasValidMagicPayload` rejects the whole
              // document as non-MAGIC_V1 on reload. Readers treat `""` as absent.
              onChange={(v) => { ed.setProp("page", "palette", v); ed.setProp("page", "bgOverride", ""); }}
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
