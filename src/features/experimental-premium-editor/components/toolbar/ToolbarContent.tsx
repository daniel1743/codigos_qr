import React from "react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  CopyIcon,
  CropIcon,
  EyeIcon,
  ItalicIcon,
  LinkIcon,
  MoveHorizontalIcon,
  PaletteIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  TrashIcon,
  TypeIcon,
  UnderlineIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import {
  COLOR_OPTIONS,
  FONT_OPTIONS,
  Product,
  TargetKind,
  TextAlign,
  TextStyle,
} from "../../types/editor";
import { useEditor } from "../../contexts/EditorContext";
import { clampSize } from "../../utils/textStyle";
import { cn } from "../../utils/cn";
import { loadGoogleFont } from "../../../../lib/fonts";
import {
  Field,
  MenuItem,
  Popover,
  PopoverTitle,
  Stepper,
  SwatchGrid,
  ToolButton,
  ToolbarDivider,
} from "./primitives";

export type ToolbarLevel = "desktop" | "collapsed" | "medium" | "expanded";

const CARD_BACKGROUNDS = ["#FFFFFF", "#FBF9F6", "#F5F2ED", "#EFEBE5", "#17140F", "#1E4D44"];
const BORDERS = ["#E6E1DA", "#D6CFC5", "#17140F", "#1E4D44"];
const CTA_COLORS = [
  "#1E4D44",
  "#17140F",
  "#8A5A24",
  "#2F6FED",
  "#B42318",
  "#4A443C",
  "#7A736A",
  "#FFFFFF",
  "#F5F3F0",
  "#E6E1DA",
];

const textField = (kind: TargetKind): "titleStyle" | "descriptionStyle" | "priceStyle" | null =>
  kind === "title"
    ? "titleStyle"
    : kind === "description"
      ? "descriptionStyle"
      : kind === "price"
        ? "priceStyle"
        : null;

interface ToolbarContentProps {
  product?: Product;
  kind: TargetKind;
  level: ToolbarLevel;
}

export function ToolbarContent({ product, kind, level }: ToolbarContentProps) {
  const editor = useEditor();
  const dense = level === "desktop";

  const alignGroup = (value: TextAlign, onPick: (align: TextAlign) => void) => (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Alineación">
      {(
        [
          ["left", AlignLeftIcon, "Izquierda"],
          ["center", AlignCenterIcon, "Centro"],
          ["right", AlignRightIcon, "Derecha"],
        ] as const
      ).map(([align, Icon, label]) => (
        <ToolButton
          key={align}
          label={label}
          showLabel={false}
          dense={dense}
          active={value === align}
          icon={<Icon className="h-4 w-4" strokeWidth={1.8} />}
          onClick={() => onPick(align)}
        />
      ))}
    </div>
  );

  const fontPopover = (style: TextStyle, apply: (patch: Partial<TextStyle>) => void) => (
    <Popover
      label={FONT_OPTIONS.find((f) => f.value === style.font)?.label ?? "Fuente"}
      dense={dense}
      width={224}
    >
      {(close) => (
        <div>
          <PopoverTitle>Fuente</PopoverTitle>
          <div className="flex flex-col">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => {
                  apply({ font: font.value });
                  const family = font.value.split(",")[0].replace(/['"]/g, "").trim();
                  loadGoogleFont(family);
                  close();
                }}
                style={{ fontFamily: font.value }}
                className={cn(
                  "rounded-lg px-2 py-2 text-left text-[15px] transition-colors duration-150 ease-premium hover:bg-[#F5F2ED]",
                  style.font === font.value ? "text-sel" : "text-ink",
                )}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );

  const colorPopover = (value: string, onPick: (color: string) => void) => (
    <Popover
      label="Color"
      dense={dense}
      showLabel={!dense}
      icon={
        <span className="flex items-center gap-1.5">
          <TypeIcon className="h-4 w-4" strokeWidth={1.8} />
          <span
            className="h-3.5 w-3.5 rounded-full border border-black/10"
            style={{ background: value }}
          />
        </span>
      }
      width={196}
    >
      {(close) => (
        <div>
          <PopoverTitle>Color del texto</PopoverTitle>
          <SwatchGrid colors={COLOR_OPTIONS} value={value} onPick={onPick} />
          <div className="mt-3 border-t border-[#D6CFC5] pt-2">
            <button
              type="button"
              onClick={() => {
                editor.setInspectorOpen(true);
                close();
              }}
              className="flex w-full items-center justify-center rounded-lg h-8 text-[13px] font-medium text-ink transition-colors hover:bg-[#F5F2ED]"
            >
              Más
            </button>
          </div>
        </div>
      )}
    </Popover>
  );

  const moreMenu = (items: React.ReactNode) => (
    <Popover label="Más" dense={dense} align="end" width={228}>
      {() => <div className="flex flex-col">{items}</div>}
    </Popover>
  );

  const sharedMore = (
    <>
      <MenuItem
        label="Añadir Etiqueta / Badge"
        icon={<TypeIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.addCategoryToProduct(product.id)}
      />

      <MenuItem
        label="Duplicar tarjeta"
        icon={<CopyIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.duplicate(product.id)}
      />

      <MenuItem
        label="Ajustes avanzados"
        icon={<SlidersHorizontalIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.setInspectorOpen(true)}
      />

      <MenuItem
        label="Ver detalle"
        icon={<EyeIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.openDetail(product.id)}
      />

      <MenuItem
        label="Eliminar producto"
        danger
        icon={<TrashIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.requestDelete(product.id)}
      />
    </>
  );

  // ---------------------------------------------------------------- card
  if (kind === "card") {
    const primary = [
      <ToolButton
        key="dup"
        label="Duplicar"
        dense={dense}
        icon={<CopyIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.duplicate(product.id)}
      />,

      <Popover
        key="move"
        label="Mover"
        dense={dense}
        icon={<MoveHorizontalIcon className="h-4 w-4" strokeWidth={1.7} />}
        width={212}
      >
        {() => (
          <div>
            <PopoverTitle>Posición en el catálogo</PopoverTitle>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editor.moveCard(product.id, -1)}
                className="h-10 flex-1 rounded-xl border border-hairline text-[13px] font-medium text-body transition-colors duration-150 ease-premium hover:bg-[#F5F2ED]"
              >
                ← Antes
              </button>
              <button
                type="button"
                onClick={() => editor.moveCard(product.id, 1)}
                className="h-10 flex-1 rounded-xl border border-hairline text-[13px] font-medium text-body transition-colors duration-150 ease-premium hover:bg-[#F5F2ED]"
              >
                Después →
              </button>
            </div>
          </div>
        )}
      </Popover>,
      <ToolButton
        key="detail"
        label="Ver detalle"
        dense={dense}
        icon={<EyeIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.openDetail(product.id)}
      />,
    ];

    const secondary = [
      <Popover
        key="bg"
        label="Fondo"
        dense={dense}
        icon={<PaletteIcon className="h-4 w-4" strokeWidth={1.7} />}
      >
        {(close) => (
          <div>
            <PopoverTitle>Fondo de la tarjeta</PopoverTitle>
            <SwatchGrid
              colors={CARD_BACKGROUNDS}
              value={product.card.background}
              onPick={(color) =>
                editor.patchProduct(product.id, { card: { ...product.card, background: color } })
              }
            />
            <div className="mt-3 border-t border-[#D6CFC5] pt-2">
              <button
                type="button"
                onClick={() => {
                  editor.setInspectorOpen(true);
                  close();
                }}
                className="flex w-full items-center justify-center rounded-lg h-8 text-[13px] font-medium text-ink transition-colors hover:bg-[#F5F2ED]"
              >
                Más
              </button>
            </div>
          </div>
        )}
      </Popover>,
      <Popover
        key="border"
        label="Borde"
        dense={dense}
        icon={<SquareIcon className="h-4 w-4" strokeWidth={1.7} />}
      >
        {(close) => (
          <div>
            <PopoverTitle>Borde</PopoverTitle>
            <SwatchGrid
              colors={BORDERS}
              value={product.card.border}
              onPick={(color) =>
                editor.patchProduct(product.id, { card: { ...product.card, border: color } })
              }
              allowNone
              onNone={() =>
                editor.patchProduct(product.id, {
                  card: { ...product.card, border: "transparent" },
                })
              }
            />
            <div className="mt-3 border-t border-[#D6CFC5] pt-2">
              <button
                type="button"
                onClick={() => {
                  editor.setInspectorOpen(true);
                  close();
                }}
                className="flex w-full items-center justify-center rounded-lg h-8 text-[13px] font-medium text-ink transition-colors hover:bg-[#F5F2ED]"
              >
                Más
              </button>
            </div>
          </div>
        )}
      </Popover>,
      <Popover
        key="radius"
        label="Radio"
        dense={dense}
        icon={<CropIcon className="h-4 w-4" strokeWidth={1.7} />}
        width={212}
      >
        {() => (
          <div>
            <PopoverTitle>Radio de esquina</PopoverTitle>
            <Stepper
              ariaLabel="Radio de esquina"
              value={product.card.radius}
              min={0}
              max={36}
              dense={dense}
              onChange={(value) =>
                editor.patchProduct(product.id, { card: { ...product.card, radius: value } })
              }
            />
          </div>
        )}
      </Popover>,
      <ToolButton
        key="del"
        label="Eliminar"
        dense={dense}
        danger
        icon={<TrashIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.requestDelete(product.id)}
      />,
    ];

    return (
      <Row level={level} primary={primary} secondary={secondary} more={moreMenu(sharedMore)} />
    );
  }

  // ---------------------------------------------------------------- text
  const field = textField(kind);
  if (field) {
    const style = product[field];
    const apply = (patch: Partial<TextStyle>) => editor.patchTextStyle(product.id, field, patch);

    const primary = [
      fontPopover(style, apply),
      <Stepper
        key="size"
        ariaLabel="Tamaño de texto"
        value={style.size}
        min={10}
        max={48}
        dense={dense}
        onChange={(value) => apply({ size: clampSize(value) })}
      />,

      colorPopover(style.color, (color) => apply({ color })),
    ];

    const secondary = [
      <ToolButton
        key="bold"
        label="Negrita"
        showLabel={false}
        dense={dense}
        active={style.weight >= 600}
        icon={<BoldIcon className="h-4 w-4" strokeWidth={2} />}
        onClick={() => apply({ weight: style.weight >= 600 ? 400 : 700 })}
      />,

      ...(kind === "title"
        ? [
            <ToolButton
              key="italic"
              label="Cursiva"
              showLabel={false}
              dense={dense}
              active={style.italic}
              icon={<ItalicIcon className="h-4 w-4" strokeWidth={2} />}
              onClick={() => apply({ italic: !style.italic })}
            />,

            <ToolButton
              key="underline"
              label="Subrayado"
              showLabel={false}
              dense={dense}
              active={style.underline}
              icon={<UnderlineIcon className="h-4 w-4" strokeWidth={2} />}
              onClick={() => apply({ underline: !style.underline })}
            />,
          ]
        : []),
      <React.Fragment key="align">
        {alignGroup(style.align, (align) => apply({ align }))}
      </React.Fragment>,
    ];

    const more = moreMenu(
      <>
        <MenuItem
          label="Restablecer formato"
          icon={<RotateCcwIcon className="h-4 w-4" strokeWidth={1.7} />}
          onClick={() =>
            apply({
              weight: kind === "price" ? 600 : 400,
              italic: false,
              underline: false,
              align: "left",
              size: kind === "title" ? 24 : kind === "price" ? 20 : 15,
            })
          }
        />

        {sharedMore}
      </>,
    );

    return <Row level={level} primary={primary} secondary={secondary} more={more} />;
  }

  // --------------------------------------------------------------- image
  if (kind === "image") {
    const primary = [
      <ToolButton
        key="change"
        label="Cambiar imagen"
        dense={dense}
        icon={<UploadIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => editor.openChangeImage(product.id)}
      />,

      <ToolButton
        key="remove"
        label="Quitar"
        dense={dense}
        icon={<XIcon className="h-4 w-4" strokeWidth={1.8} />}
        onClick={() => editor.removeImage(product.id)}
      />,
    ];

    const secondary = [
      <Popover
        key="crop"
        label="Recortar"
        dense={dense}
        icon={<CropIcon className="h-4 w-4" strokeWidth={1.7} />}
        width={220}
      >
        {() => (
          <div>
            <PopoverTitle>Proporción</PopoverTitle>
            <div className="flex gap-2">
              {(["4/3", "1/1", "3/4"] as const).map((crop) => (
                <button
                  key={crop}
                  type="button"
                  onClick={() => editor.patchProduct(product.id, { imageCrop: crop })}
                  className={cn(
                    "h-10 flex-1 rounded-xl border text-[13px] font-medium transition-colors duration-150 ease-premium",
                    product.imageCrop === crop
                      ? "border-sel bg-selSoft text-sel"
                      : "border-hairline text-body hover:bg-[#F5F2ED]",
                  )}
                >
                  {crop}
                </button>
              ))}
            </div>
          </div>
        )}
      </Popover>,
      <Popover
        key="pos"
        label="Posición"
        dense={dense}
        icon={<MoveHorizontalIcon className="h-4 w-4" strokeWidth={1.7} />}
        width={220}
      >
        {() => (
          <div>
            <PopoverTitle>Encuadre</PopoverTitle>
            <div className="flex gap-2">
              {(
                [
                  ["top", "Arriba"],
                  ["center", "Centro"],
                  ["bottom", "Abajo"],
                ] as const
              ).map(([focus, label]) => (
                <button
                  key={focus}
                  type="button"
                  onClick={() => editor.patchProduct(product.id, { imageFocus: focus })}
                  className={cn(
                    "h-10 flex-1 rounded-xl border text-[13px] font-medium transition-colors duration-150 ease-premium",
                    product.imageFocus === focus
                      ? "border-sel bg-selSoft text-sel"
                      : "border-hairline text-body hover:bg-[#F5F2ED]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Popover>,
    ];

    const more = moreMenu(
      <>
        {product.imageState === "error" && (
          <MenuItem
            label="Reintentar subida"
            icon={<RotateCcwIcon className="h-4 w-4" strokeWidth={1.7} />}
            onClick={() => editor.retryUpload(product.id)}
          />
        )}
        {sharedMore}
      </>,
    );

    return <Row level={level} primary={primary} secondary={secondary} more={more} />;
  }

  // ---------------------------------------------------------------- badge
  if (kind === "badge") {
    const categoryId = editor.selection?.subId;
    const category = editor.categories.find((c) => c.id === categoryId);
    if (!category) return null;

    const apply = (patch: Partial<Category>) => editor.patchCategory(category.id, patch);

    const primary = [
      fontPopover(
        {
          font: category.style.font,
          size: category.style.size,
          color: category.style.textColor,
          weight: 400,
          italic: false,
          underline: false,
          align: "left",
        },
        (patch) => {
          const stylePatch: Partial<Category["style"]> = {};
          if (patch.font) stylePatch.font = patch.font;
          if (patch.size) stylePatch.size = patch.size;
          if (patch.color) stylePatch.textColor = patch.color;
          apply({ style: { ...category.style, ...stylePatch } });
        },
      ),
      <Stepper
        key="size"
        ariaLabel="Tamaño de texto"
        value={category.style.size}
        min={8}
        max={24}
        dense={dense}
        onChange={(value) => apply({ style: { ...category.style, size: clampSize(value) } })}
      />,
      colorPopover(category.style.textColor, (color) =>
        apply({ style: { ...category.style, textColor: color } }),
      ),
    ];

    const secondary = [
      <Popover
        key="bg"
        label="Fondo"
        dense={dense}
        icon={<PaletteIcon className="h-4 w-4" strokeWidth={1.7} />}
      >
        {(close) => (
          <div>
            <PopoverTitle>Fondo etiqueta</PopoverTitle>
            <SwatchGrid
              colors={CARD_BACKGROUNDS}
              value={category.style.backgroundColor}
              onPick={(color) => apply({ style: { ...category.style, backgroundColor: color } })}
            />
            <div className="mt-3 border-t border-[#D6CFC5] pt-2">
              <button
                type="button"
                onClick={() => {
                  editor.setInspectorOpen(true);
                  close();
                }}
                className="flex w-full items-center justify-center rounded-lg h-8 text-[13px] font-medium text-ink transition-colors hover:bg-[#F5F2ED]"
              >
                Más
              </button>
            </div>
          </div>
        )}
      </Popover>,
      <ToolButton
        key="del"
        label="Eliminar"
        dense={dense}
        danger
        icon={<TrashIcon className="h-4 w-4" strokeWidth={1.7} />}
        onClick={() => {
          editor.removeCategoryFromProduct(product.id, category.id);
          editor.select(product.id, "card");
        }}
      />,
    ];

    return (
      <Row level={level} primary={primary} secondary={secondary} more={moreMenu(sharedMore)} />
    );
  }

  // ---------------------------------------------------------------- page-level styles
  if (kind === "page" || kind === "page-title" || kind === "page-description") {
    if (kind === "page-title" || kind === "page-description") {
      const field = kind === "page-title" ? "titleStyle" : "descriptionStyle";
      const style = editor.pageHeader[field];
      const apply = (patch: Partial<TextStyle>) =>
        editor.patchPageHeader({ [field]: { ...style, ...patch } });

      const primary = [
        fontPopover(style, apply),
        <Stepper
          key="size"
          ariaLabel="Tamaño de texto"
          value={style.size}
          min={10}
          max={64}
          dense={dense}
          onChange={(value) => apply({ size: clampSize(value) })}
        />,
        colorPopover(style.color, (color) => apply({ color })),
      ];

      const secondary = [
        <ToolButton
          key="bold"
          label="Negrita"
          showLabel={false}
          dense={dense}
          active={style.weight >= 600}
          icon={<BoldIcon className="h-4 w-4" strokeWidth={2} />}
          onClick={() => apply({ weight: style.weight >= 600 ? 400 : 700 })}
        />,
        ...(kind === "page-title"
          ? [
              <ToolButton
                key="italic"
                label="Cursiva"
                showLabel={false}
                dense={dense}
                active={style.italic}
                icon={<ItalicIcon className="h-4 w-4" strokeWidth={2} />}
                onClick={() => apply({ italic: !style.italic })}
              />,
              <ToolButton
                key="underline"
                label="Subrayado"
                showLabel={false}
                dense={dense}
                active={style.underline}
                icon={<UnderlineIcon className="h-4 w-4" strokeWidth={2} />}
                onClick={() => apply({ underline: !style.underline })}
              />,
            ]
          : []),
        <React.Fragment key="align">
          {alignGroup(style.align, (align) => apply({ align }))}
        </React.Fragment>,
      ];

      const more = moreMenu(
        <MenuItem
          label="Ajustes avanzados"
          icon={<SlidersHorizontalIcon className="h-4 w-4" strokeWidth={1.7} />}
          onClick={() => editor.setInspectorOpen(true)}
        />,
      );

      return <Row level={level} primary={primary} secondary={secondary} more={more} />;
    }

    if (kind === "page") {
      const primary = [
        <Popover
          key="bg"
          label="Fondo"
          dense={dense}
          icon={<PaletteIcon className="h-4 w-4" strokeWidth={1.7} />}
        >
          {(close) => (
            <div>
              <PopoverTitle>Fondo de página</PopoverTitle>
              <SwatchGrid
                colors={[
                  "#FFFFFF",
                  "#FBF9F6",
                  "#F5F2ED",
                  "#EFEBE5",
                  "#17140F",
                  "#1E4D44",
                  "#B42318",
                  "#2F6FED",
                ]}
                value={editor.pageBackground.color}
                onPick={(color) => editor.patchPageBackground({ color })}
              />
              <div className="mt-3 border-t border-[#D6CFC5] pt-2">
                <button
                  type="button"
                  onClick={() => {
                    editor.setInspectorOpen(true);
                    close();
                  }}
                  className="flex w-full items-center justify-center rounded-lg h-8 text-[13px] font-medium text-ink transition-colors hover:bg-[#F5F2ED]"
                >
                  Más
                </button>
              </div>
            </div>
          )}
        </Popover>,
        <ToolButton
          key="theme"
          label="Tema"
          dense={dense}
          icon={<SlidersHorizontalIcon className="h-4 w-4" strokeWidth={1.7} />}
          onClick={() => editor.setInspectorOpen(true)}
        />,
      ];

      return (
        <Row
          level={level}
          primary={primary}
          secondary={[]}
          more={moreMenu(
            <MenuItem
              label="Ajustes avanzados"
              icon={<SlidersHorizontalIcon className="h-4 w-4" strokeWidth={1.7} />}
              onClick={() => editor.setInspectorOpen(true)}
            />,
          )}
        />
      );
    }
  }

  // ----------------------------------------------------------------- cta
  if (kind === "cta") {
    const cta = product.cta;
    const primary = [
      <Popover
        key="text"
        label="Texto"
        dense={dense}
        icon={<TypeIcon className="h-4 w-4" strokeWidth={1.7} />}
        width={248}
      >
        {() => (
          <Field
            label="Texto del botón"
            value={cta.text}
            onChange={(text) => editor.patchProduct(product.id, { cta: { ...cta, text } })}
            placeholder="Ver producto"
          />
        )}
      </Popover>,
      <Popover
        key="link"
        label="Enlace"
        dense={dense}
        icon={<LinkIcon className="h-4 w-4" strokeWidth={1.7} />}
        width={288}
      >
        {(close) => (
          <div className="flex flex-col gap-3">
            <Field
              label="Enlace del botón"
              value={cta.link}
              onChange={(link) => editor.patchProduct(product.id, { cta: { ...cta, link } })}
              placeholder="https://"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-xl bg-ink px-3.5 text-[13px] font-medium text-white transition-colors duration-150 ease-premium hover:bg-black"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </Popover>,
      <Popover
        key="color"
        label="Color"
        dense={dense}
        icon={
          <span
            className="h-3.5 w-3.5 rounded-full border border-black/10"
            style={{ background: cta.color }}
          />
        }
        width={196}
      >
        {(close) => (
          <div>
            <PopoverTitle>Color del botón</PopoverTitle>
            <SwatchGrid
              colors={CTA_COLORS}
              value={cta.color}
              onPick={(color) => editor.patchProduct(product.id, { cta: { ...cta, color } })}
            />
            <div className="mt-3 border-t border-[#D6CFC5] pt-2">
              <button
                type="button"
                onClick={() => {
                  editor.setInspectorOpen(true);
                  close();
                }}
                className="flex w-full items-center justify-center rounded-lg h-8 text-[13px] font-medium text-ink transition-colors hover:bg-[#F5F2ED]"
              >
                Más
              </button>
            </div>
          </div>
        )}
      </Popover>,
    ];

    const secondary = [
      <Popover
        key="style"
        label="Estilo"
        dense={dense}
        icon={<SquareIcon className="h-4 w-4" strokeWidth={1.7} />}
        width={236}
      >
        {() => (
          <div>
            <PopoverTitle>Estilo</PopoverTitle>
            <div className="flex gap-2">
              {(
                [
                  ["solid", "Sólido"],
                  ["outline", "Contorno"],
                  ["ghost", "Texto"],
                ] as const
              ).map(([variant, label]) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => editor.patchProduct(product.id, { cta: { ...cta, variant } })}
                  className={cn(
                    "h-10 flex-1 rounded-xl border text-[13px] font-medium transition-colors duration-150 ease-premium",
                    cta.variant === variant
                      ? "border-sel bg-selSoft text-sel"
                      : "border-hairline text-body hover:bg-[#F5F2ED]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Popover>,
      <React.Fragment key="align">
        {alignGroup(cta.align, (align) =>
          editor.patchProduct(product.id, { cta: { ...cta, align } }),
        )}
      </React.Fragment>,
    ];

    return (
      <Row level={level} primary={primary} secondary={secondary} more={moreMenu(sharedMore)} />
    );
  }

  return null;
}

interface RowProps {
  level: ToolbarLevel;
  primary: React.ReactNode[];
  secondary: React.ReactNode[];
  more: React.ReactNode;
}

function Row({ level, primary, secondary, more }: RowProps) {
  if (level === "collapsed") {
    return <div className="flex items-center gap-1 overflow-x-auto">{primary.slice(0, 3)}</div>;
  }

  if (level === "medium") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {primary}
        {secondary.slice(0, 2)}
      </div>
    );
  }

  if (level === "expanded") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">{primary}</div>
        <div className="flex flex-wrap items-center gap-1.5">{secondary}</div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
          {more}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {primary}
      <ToolbarDivider />
      {secondary}
      <ToolbarDivider />
      {more}
    </div>
  );
}
