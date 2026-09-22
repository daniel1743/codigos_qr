import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Circle,
  Copy,
  Crop,
  ImageUp,
  Italic,
  Link,
  MoveHorizontal,
  Palette,
  Settings2,
  Square,
  Type,
  Underline,
  Upload,
  X,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { BlockItem, TypographyOverride, UploadedAsset } from "../../types";
import { useRender } from "../../engine/RenderContext";
import { collectionTarget, requestInspectorFocus } from "../inspector/inspectorFocus";

const COLORS = [
  "#17140F",
  "#4A443C",
  "#7A736A",
  "#1E4D44",
  "#8A5A24",
  "#B42318",
  "#2F6FED",
  "#FFFFFF",
  "#6B4EFF",
  "#D97706",
];
const CARD_BACKGROUNDS = ["#FFFFFF", "#FBF9F6", "#F5F2ED", "#EFEBE5", "#17140F", "#1E4D44"];
const BORDERS = ["#E6E1DA", "#D6CFC5", "#17140F", "#1E4D44"];
const FONTS = [
  ["Marcellus", "Marcellus, Georgia, serif"],
  ["Playfair Display", '"Playfair Display", Georgia, serif'],
  ["Inter", "Inter, system-ui, sans-serif"],
  ["DM Sans", '"DM Sans", Inter, sans-serif'],
] as const;

const CTA_STYLE_PRESETS = [
  { label: "Pill", values: { radius: 999, borderWidth: 0, paddingX: 20, paddingY: 10 } },
  {
    label: "Outline",
    values: {
      backgroundColor: "#FFFFFF",
      textColor: "#1E4D44",
      borderColor: "#1E4D44",
      borderWidth: 1,
      radius: 999,
      paddingX: 20,
      paddingY: 10,
    },
  },
  {
    label: "Soft",
    values: {
      backgroundColor: "#EAF1EE",
      textColor: "#1E4D44",
      borderWidth: 0,
      radius: 14,
      paddingX: 20,
      paddingY: 10,
    },
  },
] as const;

type ToolbarField = "card" | "image" | "title" | "description" | "price" | "cta";

const LABELS: Record<ToolbarField, string> = {
  card: "Tarjeta",
  image: "Imagen",
  title: "Título",
  description: "Descripción",
  price: "Precio",
  cta: "Botón",
};

const toolbarButton: CSSProperties = {
  display: "inline-flex",
  height: 36,
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
  border: 0,
  borderRadius: 9,
  background: "transparent",
  color: "#4A443C",
  padding: "0 9px",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

function ToolButton({
  label,
  icon,
  onClick,
  disabled = false,
  active = false,
}: {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...toolbarButton,
        background: active ? "#EAF1EE" : undefined,
        color: disabled ? "#B8B1A8" : active ? "#1E4D44" : "#4A443C",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Divider() {
  return (
    <span aria-hidden style={{ width: 1, height: 24, background: "#E6E1DA", flexShrink: 0 }} />
  );
}

function Popover({
  label,
  icon,
  children,
  width = 220,
  disabled = false,
  onOpen,
}: {
  label: string;
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
  width?: number;
  disabled?: boolean;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <ToolButton
        label={label}
        icon={icon}
        disabled={disabled}
        active={open}
        onClick={() =>
          setOpen((value) => {
            const next = !value;
            if (next) onOpen?.();
            return next;
          })
        }
      />
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 100,
            width,
            padding: 12,
            border: "1px solid #E6E1DA",
            borderRadius: 16,
            background: "rgba(255,255,255,.98)",
            boxShadow: "0 18px 46px rgba(23,20,15,.16), 0 2px 8px rgba(23,20,15,.08)",
          }}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function Swatches({
  value,
  colors,
  onPick,
}: {
  value: string;
  colors: string[];
  onPick: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Color ${color}`}
          onClick={() => onPick(color)}
          style={{
            width: 28,
            height: 28,
            border: "1px solid rgba(23,20,15,.12)",
            borderRadius: "50%",
            background: color,
            outline: value.toLowerCase() === color.toLowerCase() ? "2px solid #2F6FED" : undefined,
            outlineOffset: 2,
            cursor: "pointer",
          }}
        />
      ))}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "inline-flex",
        height: 36,
        alignItems: "center",
        borderRadius: 9,
        background: "#F5F2ED",
      }}
    >
      <button
        type="button"
        aria-label="Reducir"
        onClick={() => onChange(Math.max(8, value - 1))}
        style={{ ...toolbarButton, width: 30, padding: 0, justifyContent: "center" }}
      >
        −
      </button>
      <span style={{ minWidth: 30, textAlign: "center", color: "#17140F", fontSize: 13 }}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(Math.min(96, value + 1))}
        style={{ ...toolbarButton, width: 30, padding: 0, justifyContent: "center" }}
      >
        +
      </button>
    </div>
  );
}

function TextControls({
  product,
  field,
  prefix,
  onOpenInspector,
}: {
  product: BlockItem;
  field: Extract<ToolbarField, "title" | "description" | "price">;
  prefix: string;
  onOpenInspector: () => void;
}) {
  const { onInlineEdit } = useRender();
  const style =
    field === "description"
      ? (product.descriptionTypography ?? {})
      : field === "price"
        ? (product.priceTypography ?? {})
        : (product.typography ?? {});
  const defaultStyle =
    field === "title"
      ? { fontSize: 24, fontWeight: 400 }
      : field === "price"
        ? { fontSize: 20, fontWeight: 600 }
        : { fontSize: 15, fontWeight: 400 };
  const resolved = { ...defaultStyle, textColor: "#17140F", textAlign: "left" as const, ...style };
  const stylePath =
    field === "description"
      ? `${prefix}.descriptionTypography`
      : field === "price"
        ? `${prefix}.priceTypography`
        : `${prefix}.typography`;
  const apply = (patch: TypographyOverride) => onInlineEdit?.(stylePath, { ...style, ...patch });

  return (
    <>
      <Popover label="Fuente" icon={<Type size={16} strokeWidth={1.8} />} width={224}>
        {(close) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ marginBottom: 4, color: "#7A736A", fontSize: 11.5, fontWeight: 500 }}>
              Fuente
            </strong>
            {FONTS.map(([name, value]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  apply({ fontFamily: value });
                  close();
                }}
                style={{
                  ...toolbarButton,
                  justifyContent: "flex-start",
                  color: resolved.fontFamily === value ? "#1E4D44" : "#4A443C",
                }}
              >
                <span style={{ fontFamily: value }}>{name}</span>
              </button>
            ))}
          </div>
        )}
      </Popover>
      <Stepper
        value={resolved.fontSize ?? 16}
        label="Tamaño de texto"
        onChange={(fontSize) => apply({ fontSize })}
      />
      <Popover label="Color" icon={<Circle size={15} fill={resolved.textColor} />} width={196}>
        {(close) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Swatches
              value={resolved.textColor ?? "#17140F"}
              colors={COLORS}
              onPick={(textColor) => apply({ textColor })}
            />
            <button
              type="button"
              onClick={() => {
                close();
                onOpenInspector();
              }}
              style={{ ...toolbarButton, justifyContent: "flex-start", width: "100%" }}
            >
              Más…
            </button>
          </div>
        )}
      </Popover>
      <Divider />
      <ToolButton
        label="Negrita"
        icon={<Bold size={16} />}
        active={(resolved.fontWeight ?? 400) >= 600}
        onClick={() => apply({ fontWeight: (resolved.fontWeight ?? 400) >= 600 ? 400 : 700 })}
      />
      {field === "title" ? (
        <ToolButton
          label="Cursiva"
          icon={<Italic size={16} />}
          active={resolved.fontStyle === "italic"}
          onClick={() =>
            apply({ fontStyle: resolved.fontStyle === "italic" ? "normal" : "italic" })
          }
        />
      ) : null}
      {field === "title" ? (
        <ToolButton
          label="Subrayado"
          icon={<Underline size={16} />}
          active={resolved.textDecoration === "underline"}
          onClick={() =>
            apply({
              textDecoration: resolved.textDecoration === "underline" ? "none" : "underline",
            })
          }
        />
      ) : null}
      <div role="group" aria-label="Alineación" style={{ display: "inline-flex", gap: 2 }}>
        {(
          [
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const
        ).map(([align, Icon]) => (
          <ToolButton
            key={align}
            label={align === "left" ? "Izquierda" : align === "center" ? "Centro" : "Derecha"}
            icon={<Icon size={16} />}
            active={resolved.textAlign === align}
            onClick={() => apply({ textAlign: align })}
          />
        ))}
      </div>
      <ToolButton label="Más" icon={<ChevronDown size={15} />} onClick={onOpenInspector} />
    </>
  );
}

function ImagePickerPopover({
  onListImages,
  onSelectAsset,
  onUploadImage,
}: {
  onListImages?: () => Promise<UploadedAsset[]>;
  onSelectAsset: (asset: UploadedAsset) => void;
  onUploadImage?: (file: File) => void;
}) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const loadAssets = () => {
    if (!onListImages || loading) return;
    setLoading(true);
    void onListImages()
      .then((next) => setAssets(next.filter((asset) => asset.type === "image")))
      .finally(() => setLoading(false));
  };

  return (
    <Popover label="Cambiar imagen" icon={<Upload size={16} />} width={220} onOpen={loadAssets}>
      {(close) => {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? (
              <span style={{ color: "#7A736A", fontSize: 12 }}>Cargando imágenes…</span>
            ) : assets.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    aria-label={`Seleccionar ${asset.name}`}
                    onClick={() => {
                      onSelectAsset(asset);
                      close();
                    }}
                    style={{
                      overflow: "hidden",
                      height: 48,
                      border: "1px solid #E6E1DA",
                      borderRadius: 8,
                      background: "#EFEBE5",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={asset.url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <span style={{ color: "#7A736A", fontSize: 12 }}>No hay imágenes guardadas.</span>
            )}
            <span
              style={{
                display: "block",
                color: "#7A736A",
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: ".02em",
              }}
            >
              Mis imágenes
            </span>
            <label style={{ ...toolbarButton, justifyContent: "flex-start" }}>
              <ImageUp size={16} />
              Subir foto
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUploadImage?.(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        );
      }}
    </Popover>
  );
}

function MagicToolbarContent({
  product,
  field,
  prefix,
  blockId,
  blockStyle,
  itemId,
  onOpenInspector,
  onListImages,
  onUploadImage,
  onRemoveImage,
}: {
  product: BlockItem;
  field: ToolbarField;
  prefix: string;
  blockId: string;
  blockStyle: { background?: string; accentColor?: string; radius?: number };
  itemId: string;
  onOpenInspector: (field: ToolbarField) => void;
  onListImages?: () => Promise<UploadedAsset[]>;
  onUploadImage?: (file: File) => void;
  onRemoveImage?: () => void;
}) {
  const { onInlineEdit } = useRender();
  const ctaLabelInput = useRef<HTMLInputElement>(null);
  const ctaUrlInput = useRef<HTMLInputElement>(null);
  if (field === "title" || field === "description" || field === "price")
    return (
      <TextControls
        product={product}
        field={field}
        prefix={prefix}
        onOpenInspector={() => onOpenInspector(field)}
      />
    );
  if (field === "image") {
    const selectAsset = (asset: UploadedAsset) => {
      onInlineEdit?.(`${prefix}.imageUrl`, asset.url);
      onInlineEdit?.(`${prefix}.imageProvenance`, { origin: "owner" as const });
    };
    return (
      <>
        <ImagePickerPopover
          onListImages={onListImages}
          onSelectAsset={selectAsset}
          onUploadImage={onUploadImage}
        />
        <ToolButton
          label="Quitar"
          icon={<X size={16} />}
          disabled={!product.imageUrl}
          onClick={onRemoveImage}
        />
        <ToolButton label="Recortar" icon={<Crop size={16} />} disabled />
        <ToolButton label="Posición" icon={<MoveHorizontal size={16} />} disabled />
        <Divider />
        <ToolButton
          label="Más"
          icon={<ChevronDown size={15} />}
          onClick={() => onOpenInspector("image")}
        />
      </>
    );
  }
  if (field === "cta") {
    const ctaStyle = product.ctaStyle ?? {};
    const applyCta = (patch: Record<string, unknown>) =>
      onInlineEdit?.(`${prefix}.ctaStyle`, { ...ctaStyle, ...patch });
    return (
      <>
        <Popover label="Texto" icon={<Type size={16} />} width={248}>
          {(close) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "block", color: "#7A736A", fontSize: 11.5 }}>
                Texto del botón
                <input
                  ref={ctaLabelInput}
                  aria-label="Texto del botón"
                  defaultValue={product.ctaLabel ?? ""}
                  onBlur={(event) => onInlineEdit?.(`${prefix}.ctaLabel`, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onInlineEdit?.(`${prefix}.ctaLabel`, event.currentTarget.value);
                      close();
                    }
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    height: 38,
                    marginTop: 6,
                    border: "1px solid #E6E1DA",
                    borderRadius: 10,
                    padding: "0 10px",
                    color: "#17140F",
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  onInlineEdit?.(`${prefix}.ctaLabel`, ctaLabelInput.current?.value ?? "");
                  close();
                }}
                style={{
                  ...toolbarButton,
                  alignSelf: "flex-end",
                  background: "#17140F",
                  color: "#fff",
                }}
              >
                Aplicar
              </button>
            </div>
          )}
        </Popover>
        <Popover label="Enlace" icon={<Link size={16} />} width={288}>
          {(close) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: "#7A736A", fontSize: 11.5 }}>
                Enlace
                <input
                  ref={ctaUrlInput}
                  aria-label="Enlace del botón"
                  defaultValue={product.ctaUrl ?? ""}
                  onBlur={(event) => onInlineEdit?.(`${prefix}.ctaUrl`, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onInlineEdit?.(`${prefix}.ctaUrl`, event.currentTarget.value);
                      close();
                    }
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    height: 38,
                    marginTop: 6,
                    border: "1px solid #E6E1DA",
                    borderRadius: 10,
                    padding: "0 10px",
                    color: "#17140F",
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  onInlineEdit?.(`${prefix}.ctaUrl`, ctaUrlInput.current?.value ?? "");
                  close();
                }}
                style={{
                  ...toolbarButton,
                  alignSelf: "flex-end",
                  background: "#17140F",
                  color: "#fff",
                }}
              >
                Aplicar
              </button>
            </div>
          )}
        </Popover>
        <Popover
          label="Color"
          icon={<Circle size={15} fill={ctaStyle.backgroundColor ?? "#1E4D44"} />}
          width={196}
        >
          {(close) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Swatches
                value={ctaStyle.backgroundColor ?? "#1E4D44"}
                colors={COLORS}
                onPick={(backgroundColor) => applyCta({ backgroundColor })}
              />
              <button
                type="button"
                onClick={() => {
                  close();
                  onOpenInspector("cta");
                }}
                style={{ ...toolbarButton, justifyContent: "flex-start", width: "100%" }}
              >
                Más…
              </button>
            </div>
          )}
        </Popover>
        <Popover label="Estilo" icon={<Square size={16} />} width={220}>
          {(close) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {CTA_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    applyCta(preset.values);
                    close();
                  }}
                  style={{ ...toolbarButton, justifyContent: "flex-start", width: "100%" }}
                >
                  <Square size={14} />
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </Popover>
        <div role="group" aria-label="Alineación" style={{ display: "inline-flex" }}>
          {(
            [
              ["left", AlignLeft],
              ["center", AlignCenter],
              ["right", AlignRight],
            ] as const
          ).map(([align, Icon]) => (
            <ToolButton
              key={align}
              label={align === "left" ? "Izquierda" : align === "center" ? "Centro" : "Derecha"}
              icon={<Icon size={16} />}
              active={ctaStyle.textAlign === align}
              onClick={() => applyCta({ textAlign: align })}
            />
          ))}
        </div>
        <ToolButton
          label="Más"
          icon={<ChevronDown size={15} />}
          onClick={() => onOpenInspector("cta")}
        />
      </>
    );
  }

  return (
    <>
      <ToolButton label="Duplicar" icon={<Copy size={16} />} disabled />
      <ToolButton label="Mover" icon={<MoveHorizontal size={16} />} disabled />
      <ToolButton label="Ver detalle" icon={<Settings2 size={16} />} disabled />
      <Divider />
      <Popover label="Fondo" icon={<Palette size={16} />}>
        {() => (
          <Swatches
            value={blockStyle.background ?? "#FFFFFF"}
            colors={CARD_BACKGROUNDS}
            onPick={(background) =>
              onInlineEdit?.(`blocks.${blockId}.style.background`, background)
            }
          />
        )}
      </Popover>
      <Popover label="Borde" icon={<Square size={16} />}>
        {() => (
          <Swatches
            value={blockStyle.accentColor ?? "#E6E1DA"}
            colors={BORDERS}
            onPick={(accentColor) =>
              onInlineEdit?.(`blocks.${blockId}.style.accentColor`, accentColor)
            }
          />
        )}
      </Popover>
      <Popover label="Radio" icon={<Crop size={16} />} width={190}>
        {() => (
          <Stepper
            value={blockStyle.radius ?? 18}
            label="Radio de esquina"
            onChange={(radius) => onInlineEdit?.(`blocks.${blockId}.style.radius`, radius)}
          />
        )}
      </Popover>
      <Divider />
      <ToolButton
        label="Más"
        icon={<ChevronDown size={15} />}
        onClick={() => onOpenInspector("card")}
      />
    </>
  );
}

export function PremiumProductCardMagicToolbar({
  product,
  field,
  prefix,
  blockId,
  blockStyle,
  itemId,
  onListImages,
  onUploadImage,
  onRemoveImage,
}: {
  product: BlockItem;
  field: ToolbarField;
  prefix: string;
  blockId: string;
  blockStyle: { background?: string; accentColor?: string; radius?: number };
  itemId: string;
  onListImages?: () => Promise<UploadedAsset[]>;
  onUploadImage?: (file: File) => void;
  onRemoveImage?: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const anchorKey = `${itemId}:${field}`;
  const label = LABELS[field];
  const openInspector = (targetField: ToolbarField) =>
    requestInspectorFocus(
      collectionTarget(
        blockId,
        "product-grid",
        itemId,
        targetField === "card" ? "item" : targetField,
      ),
    );

  useLayoutEffect(() => {
    const measure = () => {
      const anchor = Array.from(
        document.querySelectorAll<HTMLElement>("[data-premium-edit-anchor]"),
      ).find((element) => element.dataset.premiumEditAnchor === anchorKey);
      const next = anchor?.getBoundingClientRect() ?? null;
      setRect((current) => {
        if (!current || !next) return next;
        return current.x === next.x &&
          current.y === next.y &&
          current.width === next.width &&
          current.height === next.height
          ? current
          : next;
      });
      if (anchor) anchorObserver.observe(anchor);
    };
    const anchorObserver = new ResizeObserver(measure);
    measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      anchorObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };

    function onResize() {
      measure();
    }
  }, [anchorKey]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const next = ref.current?.getBoundingClientRect();
      if (next) setSize({ width: next.width, height: next.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [field]);

  const position = useMemo(() => {
    const edge = 16;
    const gap = 12;
    const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
    if (!rect) return { top: edge, left: edge };
    const above = rect.top - gap - edge;
    const top =
      above >= size.height
        ? rect.top - gap - size.height
        : Math.min(viewportHeight - size.height - edge, rect.bottom + gap);
    return {
      top: Math.max(edge, top),
      left: Math.max(
        edge,
        Math.min(rect.left + rect.width / 2 - size.width / 2, viewportWidth - size.width - edge),
      ),
    };
  }, [rect, size]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label={`Acciones de ${label}`}
      data-magic-contextual-toolbar="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 1200,
        display: "flex",
        maxWidth: "min(94vw, 1000px)",
        alignItems: "center",
        gap: 2,
        overflowX: "auto",
        border: "1px solid #E6E1DA",
        borderRadius: 16,
        background: "rgba(255,255,255,.98)",
        padding: "6px 8px",
        boxShadow: "0 18px 46px rgba(23,20,15,.16), 0 2px 8px rgba(23,20,15,.08)",
        backdropFilter: "blur(10px)",
        opacity: rect ? 1 : 0,
        pointerEvents: rect ? "auto" : "none",
      }}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          // Find the canvas container and simulate a background click to dismiss,
          // or we can dispatch an escape keydown event which the workspace catches.
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: 0,
          background: "transparent",
          color: "#7A736A",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
      <Divider />
      <span
        style={{
          flexShrink: 0,
          borderRadius: 6,
          background: "#EAF1EE",
          color: "#1E4D44",
          padding: "6px 8px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 11.5,
          fontWeight: 600,
          marginRight: 2,
        }}
      >
        {label}
      </span>
      <MagicToolbarContent
        product={product}
        field={field}
        prefix={prefix}
        blockId={blockId}
        blockStyle={blockStyle}
        itemId={itemId}
        onOpenInspector={openInspector}
        onListImages={onListImages}
        onUploadImage={onUploadImage}
        onRemoveImage={onRemoveImage}
      />
    </div>,
    document.body,
  );
}
