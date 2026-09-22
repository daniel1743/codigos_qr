import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  ShoppingBag,
  Music,
  ArrowRight,
  Info,
  Home,
  Briefcase,
  User,
  Heart,
  X,
} from "lucide-react";
import { useRender } from "../../engine/RenderContext";
import {
  applyCTAStyle,
  applyTypographyOverride,
  cardStyle,
  headingStyle,
} from "../../engine/styleEngine";
import { hexToRgba, safeUrl } from "../../utils";
import type { BlockItem, TemplateBlock } from "../../types";
import { ContextualItemTarget, InlineText } from "./primitives";
import { ContextualEditingToolbar } from "../ContextualEditingToolbar";
import { PremiumProductCardMagicV1 } from "./PremiumProductCardMagicV1";

// Dynamic Icon resolver
function SmartIcon({
  name,
  size = 16,
  className,
  style,
}: {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!name) return null;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const icons: Record<string, React.ElementType> = {
    home: Home,
    services: Briefcase,
    portfolio: Briefcase,
    book: Calendar,
    booking: Calendar,
    profile: User,
    about: User,
    contact: MailIconPlaceholder,
    heart: Heart,
    shop: ShoppingBag,
    products: ShoppingBag,
    music: Music,
    map: MapPin,
    location: MapPin,
  };

  const IconCmp = icons[normalized];
  if (!IconCmp) return <ExternalLink size={size} className={className} style={style} />;
  return React.createElement(IconCmp, { size, className, style });
}

function MailIconPlaceholder({
  size = 16,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Product Card                                                    */
/* ------------------------------------------------------------------ */
export function ProductCardBlock({
  block,
  inlinePathPrefix,
  onOpenDetail,
  collectionBlockId,
  collectionItemId,
  isSelected,
}: {
  block: TemplateBlock;
  inlinePathPrefix?: string;
  onOpenDetail?: () => void;
  collectionBlockId?: string;
  collectionItemId?: string;
  isSelected?: boolean;
}) {
  const { theme, mode, onTrack, onSelectCollectionItem, onInlineEdit } = useRender();
  const c = block.content;
  const variant = block.variant ?? "card";
  const [selectedTextField, setSelectedTextField] = useState<string | null>(null);
  const [imageSelected, setImageSelected] = useState(false);

  const handleCTA = () => {
    if (!c.ctaUrl || mode === "edit") return;
    onTrack?.({
      type: "product_click",
      blockId: block.id,
      itemId: block.id,
      label: c.title,
      url: c.ctaUrl,
    });
    window.open(c.ctaUrl, "_blank", "noopener,noreferrer");
  };
  const inline = (field: string) =>
    inlinePathPrefix ? `${inlinePathPrefix}.${field}` : `blocks.${block.id}.content.${field}`;
  const typographyPath = (field: string) =>
    inline(field === "description" ? "descriptionTypography" : "typography");
  const activeTypography =
    selectedTextField === "description" ? c.descriptionTypography : c.typography;
  const isCatalogPremium = variant === "catalog-premium-card-v1";
  const selectField = (field: string) => {
    setSelectedTextField(field);
    setImageSelected(false);
    if (collectionBlockId && collectionItemId) {
      onSelectCollectionItem?.(collectionBlockId, "product-grid", collectionItemId, field);
    }
  };

  const isMinimal = variant === "minimal";
  const isImageFirst = variant === "image-first";
  const isFeatured = variant === "featured";

  const wrapperStyle = isCatalogPremium
    ? {
        ...cardStyle(theme, {
          ...block.style,
          background: block.style.background ?? "#ffffff",
          radius: block.style.radius ?? 22,
          borderWidth: block.style.borderWidth ?? 1,
          shadow: block.style.shadow ?? "sm",
        }),
        padding: 16,
        overflow: "visible",
      }
    : variant === "card" || isImageFirst || isFeatured
      ? { ...cardStyle(theme, block.style), padding: 0, overflow: "hidden" }
      : { padding: 12 };

  return (
    <div
      className="pts-hoverable"
      style={{
        ...wrapperStyle,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        outline: isSelected ? "2px solid #2563eb" : undefined,
        outlineOffset: isSelected ? 2 : undefined,
      }}
      data-premium-card={isCatalogPremium ? "true" : undefined}
      data-card-selected={isSelected ? "true" : undefined}
      onClick={() => {
        if (mode === "public") onOpenDetail?.();
      }}
    >
      {isCatalogPremium && isSelected && (
        <span
          data-selection-label="card"
          style={{
            position: "absolute",
            top: -13,
            left: 0,
            zIndex: 30,
            transform: "translateY(-100%)",
            borderRadius: 6,
            background: "#2f6fed",
            color: "#fff",
            padding: "3px 8px",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: ".02em",
          }}
        >
          Tarjeta
        </span>
      )}
      {mode === "edit" && isSelected && inlinePathPrefix && selectedTextField && onInlineEdit && (
        <ContextualEditingToolbar
          aria-label="Text styling"
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            top: -42,
            left: 0,
            zIndex: 20,
            display: "flex",
            gap: 4,
            padding: 5,
            borderRadius: 8,
            background: "#111827",
            color: "white",
            boxShadow: "0 6px 18px rgba(0,0,0,.22)",
            fontSize: 11,
          }}
        >
          <select
            aria-label="Font family"
            value={activeTypography?.fontFamily ?? ""}
            onChange={(event) =>
              onInlineEdit(
                `${typographyPath(selectedTextField)}.fontFamily`,
                event.target.value || undefined,
              )
            }
          >
            <option value="">Fuente</option>
            <option value="Inter, sans-serif">Inter</option>
            <option value="Georgia, serif">Serif</option>
            <option value="ui-monospace, monospace">Mono</option>
          </select>
          <input
            aria-label="Font size"
            type="number"
            min={8}
            max={96}
            value={activeTypography?.fontSize ?? ""}
            placeholder="px"
            onChange={(event) =>
              onInlineEdit(
                `${typographyPath(selectedTextField)}.fontSize`,
                event.target.value ? Number(event.target.value) : undefined,
              )
            }
            style={{ width: 42 }}
          />
          <select
            aria-label="Font weight"
            value={activeTypography?.fontWeight ?? ""}
            onChange={(event) =>
              onInlineEdit(
                `${typographyPath(selectedTextField)}.fontWeight`,
                event.target.value ? Number(event.target.value) : undefined,
              )
            }
          >
            <option value="">Peso</option>
            <option value="400">400</option>
            <option value="500">500</option>
            <option value="600">600</option>
            <option value="700">700</option>
          </select>
          <input
            aria-label="Text color"
            type="color"
            value={activeTypography?.textColor ?? "#000000"}
            onChange={(event) =>
              onInlineEdit(`${typographyPath(selectedTextField)}.textColor`, event.target.value)
            }
          />
          <select
            aria-label="Text alignment"
            value={activeTypography?.textAlign ?? ""}
            onChange={(event) =>
              onInlineEdit(
                `${typographyPath(selectedTextField)}.textAlign`,
                event.target.value || undefined,
              )
            }
          >
            <option value="">Alinear</option>
            <option value="left">Izq.</option>
            <option value="center">Centro</option>
            <option value="right">Der.</option>
          </select>
          <button
            type="button"
            aria-label="Bold"
            onClick={() =>
              onInlineEdit(
                `${typographyPath(selectedTextField)}.fontWeight`,
                activeTypography?.fontWeight === 700 ? 400 : 700,
              )
            }
          >
            B
          </button>
          <button
            type="button"
            aria-label="Italic"
            onClick={() =>
              onInlineEdit(
                `${typographyPath(selectedTextField)}.fontStyle`,
                activeTypography?.fontStyle === "italic" ? "normal" : "italic",
              )
            }
          >
            I
          </button>
          <button
            type="button"
            aria-label="Underline"
            onClick={() =>
              onInlineEdit(
                `${typographyPath(selectedTextField)}.textDecoration`,
                activeTypography?.textDecoration === "underline" ? "none" : "underline",
              )
            }
          >
            U
          </button>
          <button type="button" aria-label="More text options" title="More">
            ⋯
          </button>
          {selectedTextField === "ctaLabel" && (
            <input
              aria-label="CTA URL"
              value={c.ctaUrl ?? ""}
              placeholder="Enlace"
              onChange={(event) => onInlineEdit(inline("ctaUrl"), event.target.value)}
              style={{ width: 110 }}
            />
          )}
        </ContextualEditingToolbar>
      )}
      {mode === "edit" && isSelected && inlinePathPrefix && imageSelected && (
        <ContextualEditingToolbar
          aria-label="Image controls"
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            top: -42,
            right: 0,
            zIndex: 20,
            display: "flex",
            gap: 4,
            padding: 5,
            borderRadius: 8,
            background: "#111827",
            color: "white",
          }}
        >
          <button
            type="button"
            onClick={() =>
              collectionBlockId &&
              collectionItemId &&
              onSelectCollectionItem?.(collectionBlockId, "product-grid", collectionItemId, "image")
            }
          >
            Cambiar
          </button>
          <button type="button" onClick={() => onInlineEdit(inline("imageUrl"), "")}>
            Quitar
          </button>
          <button type="button" disabled title="Crop seam reserved for ImagePipeline">
            Recortar
          </button>
          <button type="button" disabled title="Position seam reserved for ImagePipeline">
            Posición
          </button>
        </ContextualEditingToolbar>
      )}
      {/* Badge */}
      {typeof c.badge === "string" && c.badge && (
        <span
          style={applyTypographyOverride(
            {
              position: "absolute",
              top: 12,
              left: 12,
              backgroundColor: theme.colors.accent,
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
              zIndex: 10,
            },
            c.typography,
          )}
        >
          <InlineText path={inline("badge")} value={c.badge} onFocus={() => selectField("badge")} />
        </span>
      )}

      {c.imageUrl && !isMinimal && (
        <div
          data-editor-target={inlinePathPrefix ? "product-image" : undefined}
          onClick={(event) => {
            if (mode !== "edit" || !collectionBlockId || !collectionItemId) return;
            event.stopPropagation();
            setSelectedTextField(null);
            setImageSelected(true);
            onSelectCollectionItem?.(collectionBlockId, "product-grid", collectionItemId, "image");
          }}
          style={{
            width: "100%",
            height: isCatalogPremium ? "auto" : isFeatured ? 220 : 160,
            aspectRatio: isCatalogPremium ? "4 / 3" : undefined,
            borderRadius: isCatalogPremium ? 14 : undefined,
            position: "relative",
            overflow: "hidden",
            background: isCatalogPremium ? "#efebe5" : undefined,
          }}
        >
          <img
            src={c.imageUrl}
            alt={c.title ?? "Product Image"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {isCatalogPremium && c.imageProvenance?.origin === "reference_stock" && (
            <span
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                borderRadius: 999,
                background: "rgba(23,20,15,.62)",
                color: "rgba(255,255,255,.95)",
                padding: "3px 8px",
                fontSize: 10.5,
                fontWeight: 500,
                backdropFilter: "blur(2px)",
              }}
            >
              Imagen de referencia
            </span>
          )}
        </div>
      )}

      <div
        style={{
          padding: isMinimal ? 0 : 16,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 8,
          ...(isCatalogPremium ? { padding: 0, marginTop: 20, gap: 12 } : {}),
        }}
      >
        <h3
          style={applyTypographyOverride(
            { ...headingStyle(theme, 0.85), fontSize: isFeatured ? "17px" : "14.5px" },
            c.typography,
          )}
        >
          <InlineText
            path={inline("title")}
            value={c.title ?? ""}
            placeholder="Product Title"
            onFocus={() => selectField("title")}
          />
        </h3>

        {c.description && (
          <div
            style={applyTypographyOverride(
              { fontSize: "12.5px", color: theme.colors.mutedText, lineHeight: 1.4, flex: 1 },
              c.descriptionTypography,
            )}
          >
            <InlineText
              as="p"
              path={inline("description")}
              value={c.description ?? ""}
              onFocus={() => selectField("description")}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 2px" }}>
          <span
            style={applyTypographyOverride(
              { fontSize: "16px", fontWeight: 700, color: theme.colors.text },
              c.typography,
            )}
          >
            <InlineText
              path={inline("price")}
              value={c.price ?? ""}
              placeholder="$0.00"
              onFocus={() => selectField("price")}
            />
          </span>
          {c.comparePrice && (
            <span
              style={{
                fontSize: "13px",
                color: theme.colors.mutedText,
                textDecoration: "line-through",
                opacity: 0.7,
              }}
            >
              {c.comparePrice}
            </span>
          )}
        </div>

        {c.ctaLabel && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (mode === "edit") selectField("cta");
              handleCTA();
            }}
            style={applyCTAStyle(
              applyTypographyOverride(
                {
                  width: "100%",
                  padding: isCatalogPremium ? "10px 20px" : "8px 14px",
                  borderRadius: isCatalogPremium ? 999 : theme.buttons.radius,
                  backgroundColor: theme.colors.primary,
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                },
                c.typography,
              ),
              c.ctaStyle ?? block.style.ctaStyle,
            )}
          >
            <ShoppingBag size={14} />
            <InlineText
              path={inline("ctaLabel")}
              value={c.ctaLabel ?? ""}
              onFocus={() => selectField("ctaLabel")}
            />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Product Grid                                                    */
/* ------------------------------------------------------------------ */
export function ProductGridBlock({ block }: { block: TemplateBlock }) {
  const {
    breakpoint,
    mode,
    selectedCollectionItem,
    onCollectionItemAction,
    onAddCollectionItem,
    onSelectCollectionItem,
  } = useRender();
  const products = block.content.products ?? [];
  const columns = block.layout.columns ?? 3;
  const gridColumns =
    breakpoint === "mobile" ? 1 : breakpoint === "tablet" ? Math.min(3, columns) : columns;
  const [detailProduct, setDetailProduct] = useState<BlockItem | null>(null);
  const isCatalogPremium = block.variant === "catalog-premium-card-v1";
  // Phase 1 intentionally proves one faithful Magic card at the same desktop
  // grid-cell width it will occupy when the full catalog grid is introduced.
  const productsForPhase = isCatalogPremium ? products.slice(0, 1) : products;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.max(1, gridColumns)}, minmax(0, 1fr))`,
        gap: isCatalogPremium ? 20 : 16,
        width: "100%",
      }}
    >
      {productsForPhase.map((prod: BlockItem, idx: number) => {
        // Build a mock child block definition to render child cards
        const prodBlock: TemplateBlock = {
          id: prod.id ?? `prod-${idx}`,
          type: "product",
          variant: isCatalogPremium
            ? "catalog-premium-card-v1"
            : block.variant === "minimal"
              ? "minimal"
              : "card",
          content: (() => {
            const { location: ignoredLocation, ...productContent } = prod;
            void ignoredLocation;
            return productContent;
          })(),
          style: block.style,
          layout: {},
          visibility: { desktop: true, tablet: true, mobile: true },
          interaction: block.interaction,
        };
        return (
          <div
            key={prodBlock.id}
            style={{
              position: "relative",
              minWidth: 0,
              paddingTop: isCatalogPremium ? 4 : 0,
            }}
          >
            {isCatalogPremium ? (
              <PremiumProductCardMagicV1
                product={prod}
                blockId={block.id}
                itemId={prod.id ?? `prod-${idx}`}
                inlinePathPrefix={`blocks.${block.id}.content.products.${idx}`}
                blockStyle={block.style}
              />
            ) : (
              <ContextualItemTarget
                blockId={block.id}
                collection="product-grid"
                itemId={prod.id ?? `prod-${idx}`}
              >
                <ProductCardBlock
                  block={prodBlock}
                  inlinePathPrefix={`blocks.${block.id}.content.products.${idx}`}
                  collectionBlockId={block.id}
                  collectionItemId={prodBlock.id}
                  isSelected={
                    selectedCollectionItem?.blockId === block.id &&
                    selectedCollectionItem?.itemId === prodBlock.id
                  }
                  onOpenDetail={() => setDetailProduct(prod)}
                />
              </ContextualItemTarget>
            )}
            {mode === "edit" &&
              selectedCollectionItem?.blockId === block.id &&
              selectedCollectionItem.itemId === prodBlock.id &&
              onCollectionItemAction && (
                <div
                  aria-label={`Product ${idx + 1} actions`}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    zIndex: 3,
                    display: "flex",
                    gap: 3,
                  }}
                >
                  <button
                    type="button"
                    aria-label="Mover producto arriba"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCollectionItemAction(block.id, "product-grid", prodBlock.id, "up");
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Mover producto abajo"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCollectionItemAction(block.id, "product-grid", prodBlock.id, "down");
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Duplicar producto"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCollectionItemAction(block.id, "product-grid", prodBlock.id, "duplicate");
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label="Ver detalle"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDetailProduct(prod);
                    }}
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    aria-label="Fondo de tarjeta"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectCollectionItem?.(
                        block.id,
                        "product-grid",
                        prodBlock.id,
                        "card-background",
                      );
                    }}
                  >
                    Fondo
                  </button>
                  <button
                    type="button"
                    aria-label="Borde de tarjeta"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectCollectionItem?.(
                        block.id,
                        "product-grid",
                        prodBlock.id,
                        "card-border",
                      );
                    }}
                  >
                    Borde
                  </button>
                  <button
                    type="button"
                    aria-label="Radio de tarjeta"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectCollectionItem?.(
                        block.id,
                        "product-grid",
                        prodBlock.id,
                        "card-radius",
                      );
                    }}
                  >
                    Radio
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar producto"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCollectionItemAction(block.id, "product-grid", prodBlock.id, "delete");
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
          </div>
        );
      })}
      {mode === "edit" && onAddCollectionItem && (
        <button
          type="button"
          onClick={() => onAddCollectionItem(block.id, "product-grid")}
          style={{
            minHeight: isCatalogPremium ? 180 : 48,
            border: "1px dashed currentColor",
            borderRadius: isCatalogPremium ? 18 : 12,
            background: "transparent",
            color: "inherit",
            fontWeight: 600,
          }}
        >
          + Añadir producto
        </button>
      )}
      {detailProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={detailProduct.title ?? "Product detail"}
          onClick={() => setDetailProduct(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(0,0,0,0.6)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(100%, 620px)",
              maxHeight: "90vh",
              overflow: "auto",
              borderRadius: 20,
              background: "var(--pts-surface, #fff)",
              padding: 20,
            }}
          >
            <button
              type="button"
              aria-label="Close product detail"
              onClick={() => setDetailProduct(null)}
              style={{ position: "absolute", top: 12, right: 12 }}
            >
              <X size={18} />
            </button>
            {detailProduct.imageUrl && (
              <img
                src={detailProduct.imageUrl}
                alt={detailProduct.title ?? "Product"}
                style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 14 }}
              />
            )}
            <h2 style={{ marginTop: 16 }}>{detailProduct.title}</h2>
            {detailProduct.badge && <div>{String(detailProduct.badge)}</div>}
            <p>{detailProduct.description}</p>
            <strong>{detailProduct.price}</strong>
            {detailProduct.ctaLabel && detailProduct.ctaUrl && (
              <a href={safeUrl(detailProduct.ctaUrl) ?? undefined}>{detailProduct.ctaLabel}</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Booking Block                                                   */
/* ------------------------------------------------------------------ */
export function BookingBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const c = block.content;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const dates = c.availableDates ?? ["Mon, Aug 24", "Tue, Aug 25", "Wed, Aug 26"];
  const times = c.availableTimes ?? ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"];

  const handleBooking = () => {
    if (!selectedDate || !selectedTime || mode === "edit") return;
    if (c.ctaUrl) {
      const destination = safeUrl(c.ctaUrl);
      if (destination) {
        window.open(destination, "_blank", "noopener,noreferrer");
        return;
      }
    }
    setConfirmed(true);
    // Integration point: call external webhook/adapter if present
    const adapter = (
      window as Window & {
        pts?: {
          adapters?: {
            booking?: (payload: { service?: string; date: string; time: string }) => void;
          };
        };
      }
    ).pts?.adapters?.booking;
    if (adapter) {
      adapter({
        ...(c.service !== undefined ? { service: c.service } : {}),
        date: selectedDate,
        time: selectedTime,
      });
    }
  };

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <h3 style={headingStyle(theme, 0.8)}>{c.title || "Book an Appointment"}</h3>
        {c.description && (
          <p style={{ fontSize: "12.5px", color: theme.colors.mutedText, marginTop: 4 }}>
            {c.description}
          </p>
        )}
      </div>

      {c.service && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            backgroundColor: hexToRgba(theme.colors.text, 0.04),
            fontSize: "13px",
          }}
        >
          <div className="flex justify-between font-semibold">
            <span>{c.service}</span>
            <span style={{ color: theme.colors.accent }}>{c.price}</span>
          </div>
          {c.duration && (
            <span style={{ fontSize: "11px", color: theme.colors.mutedText }}>
              Duration: {c.duration}
            </span>
          )}
        </div>
      )}

      {confirmed ? (
        <div
          style={{
            textAlign: "center",
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: hexToRgba(theme.colors.accent, 0.15),
              color: theme.colors.accent,
              display: "grid",
              placeItems: "center",
              fontSize: 20,
            }}
          >
            ✓
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700 }}>Reserva Solicitada!</span>
          <span style={{ fontSize: "12px", color: theme.colors.mutedText }}>
            {selectedDate} a las {selectedTime}
          </span>
          <button
            onClick={() => {
              setConfirmed(false);
              setSelectedDate(null);
              setSelectedTime(null);
            }}
            style={{
              marginTop: 8,
              fontSize: "11px",
              color: theme.colors.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Modificar reserva
          </button>
        </div>
      ) : (
        <>
          {/* Date Picker Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: theme.colors.mutedText,
              }}
            >
              Select Date
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {dates.map((date: string) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    borderRadius: 8,
                    border: `1px solid ${selectedDate === date ? theme.colors.accent : theme.colors.border}`,
                    backgroundColor:
                      selectedDate === date ? hexToRgba(theme.colors.accent, 0.1) : "transparent",
                    color: selectedDate === date ? theme.colors.accent : theme.colors.text,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {date}
                </button>
              ))}
            </div>
          </div>

          {/* Time Picker Grid */}
          {selectedDate && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: theme.colors.mutedText,
                }}
              >
                Select Time
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {times.map((time: string) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: `1px solid ${selectedTime === time ? theme.colors.accent : theme.colors.border}`,
                      backgroundColor:
                        selectedTime === time ? hexToRgba(theme.colors.accent, 0.1) : "transparent",
                      color: selectedTime === time ? theme.colors.accent : theme.colors.text,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className="pts-hoverable pts-press-feedback"
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime}
            style={applyCTAStyle(
              {
                width: "100%",
                padding: "10px 16px",
                borderRadius: theme.buttons.radius,
                backgroundColor:
                  selectedDate && selectedTime
                    ? theme.colors.primary
                    : hexToRgba(theme.colors.text, 0.1),
                color: selectedDate && selectedTime ? "#ffffff" : theme.colors.mutedText,
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: selectedDate && selectedTime ? "pointer" : "default",
                marginTop: 4,
              },
              block.style.ctaStyle,
            )}
          >
            {c.ctaLabel || "Confirm Reservation"}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Calendar Block                                                  */
/* ------------------------------------------------------------------ */
export function CalendarBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const c = block.content;
  const disabledDates = c.disabledDates ?? [];

  const [selectedDay, setSelectedDay] = useState<number | null>(24);

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleSelectDay = (day: number) => {
    const dateStr = `2026-08-${String(day).padStart(2, "0")}`;
    if (disabledDates.includes(dateStr)) return;
    setSelectedDay(day);
  };

  return (
    <div style={{ ...cardStyle(theme, block.style), padding: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "14.5px" }}>August 2026</h3>
        <span style={{ fontSize: "12px", color: theme.colors.mutedText }}>Mock Calendar</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          textAlign: "center",
        }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span
            key={i}
            style={{ fontSize: "11px", fontWeight: 700, color: theme.colors.mutedText }}
          >
            {d}
          </span>
        ))}

        {/* Empty cells to offset start day (August 1, 2026 is Saturday, so offset of 6 cells) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} />
        ))}

        {daysInMonth.map((day) => {
          const dateStr = `2026-08-${String(day).padStart(2, "0")}`;
          const isDisabled = disabledDates.includes(dateStr);
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => handleSelectDay(day)}
              disabled={isDisabled}
              style={{
                aspectRatio: "1/1",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: isDisabled ? "default" : "pointer",
                backgroundColor: isSelected ? theme.colors.accent : "transparent",
                color: isSelected
                  ? "#ffffff"
                  : isDisabled
                    ? hexToRgba(theme.colors.text, 0.25)
                    : theme.colors.text,
                textDecoration: isDisabled ? "line-through" : "none",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Events Block                                                    */
/* ------------------------------------------------------------------ */
export function EventsBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant ?? "list";

  const handleCTA = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ display: "grid", gap: 14, width: "100%" }}>
      {items.map((event: BlockItem, idx: number) => {
        const isFeatured = variant === "featured" && idx === 0;
        const isCards = variant === "cards" || isFeatured;

        return (
          <ContextualItemTarget
            key={event.id ?? idx}
            blockId={block.id}
            collection="events"
            itemId={event.id ?? String(idx)}
          >
            <div
              style={{
                ...cardStyle(
                  theme,
                  isCards
                    ? block.style
                    : { background: "transparent", borderWidth: 0, shadow: "none" },
                ),
                display: "flex",
                flexDirection: isFeatured ? "column" : "row",
                alignItems: isFeatured ? "stretch" : "center",
                padding: isCards ? "16px" : "8px",
                gap: 14,
                overflow: "hidden",
              }}
            >
              {event.imageUrl && (
                <div
                  style={{
                    width: isFeatured ? "100%" : 70,
                    height: isFeatured ? 160 : 70,
                    borderRadius: 8,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={event.imageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}

              <div
                style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: theme.colors.accent,
                  }}
                >
                  <span>{event.date}</span>
                  {event.time && <span>· {event.time}</span>}
                </div>
                <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "14px" }}>{event.title}</h3>
                {event.location && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "11px",
                      color: theme.colors.mutedText,
                    }}
                  >
                    <MapPin size={11} style={{ flexShrink: 0 }} />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>

              {event.ctaLabel && (
                <button
                  onClick={() => handleCTA(event.ctaUrl)}
                  style={applyCTAStyle(
                    {
                      padding: "6px 12px",
                      borderRadius: theme.buttons.radius,
                      backgroundColor: theme.colors.primary,
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                      alignSelf: isFeatured ? "flex-start" : "center",
                    },
                    event.ctaStyle,
                  )}
                >
                  {event.ctaLabel}
                </button>
              )}
            </div>
          </ContextualItemTarget>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Map Block                                                       */
/* ------------------------------------------------------------------ */
export function MapBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const loc = block.content.location ?? { lat: -33.45, lng: -70.66, label: "Santiago, Chile" };

  // Free map frame using Google Maps embed query params (which requires zero billing keys)
  const embedUrl = `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", width: "100%", paddingBottom: "50%", height: 0 }}>
        <iframe
          src={embedUrl}
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>
      {loc.label && (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "12.5px",
          }}
        >
          <MapPin size={14} style={{ color: theme.colors.accent, flexShrink: 0 }} />
          <span style={{ color: theme.colors.text, fontWeight: 500 }} className="truncate">
            {loc.label}
          </span>
          <a
            href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              fontWeight: 600,
              color: theme.colors.accent,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            Open Maps <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Music / Media Player                                            */
/* ------------------------------------------------------------------ */
export function MusicBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const c = block.content;
  const variant = block.variant ?? "card";

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // Fallback mock duration

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current || mode === "edit") return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    // Reset play state if source URL changes
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      setCurrentTime(0);
    }
  }, [c.audioUrl]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  return (
    <div
      style={{
        ...cardStyle(
          theme,
          isCompact ? { background: "transparent", borderWidth: 0, shadow: "none" } : block.style,
        ),
        display: "flex",
        flexDirection: isCompact ? "row" : "column",
        alignItems: "center",
        padding: isCompact ? "8px 12px" : "18px",
        gap: 12,
      }}
    >
      {/* Cover image */}
      {(c.coverUrl || !isCompact) && (
        <div
          style={{
            width: isCompact ? 48 : isFeatured ? 110 : 80,
            height: isCompact ? 48 : isFeatured ? 110 : 80,
            borderRadius: 8,
            backgroundColor: hexToRgba(theme.colors.accent, 0.12),
            color: theme.colors.accent,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {c.coverUrl ? (
            <img
              src={c.coverUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Music size={isFeatured ? 36 : 28} />
          )}
        </div>
      )}

      {/* Controls & details */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ textAlign: isCompact ? "left" : "center" }}>
          <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "14px" }} className="truncate">
            {c.title || "Track Title"}
          </h3>
          <span
            style={{ fontSize: "12px", color: theme.colors.mutedText }}
            className="truncate block"
          >
            {c.artist || "Unknown Artist"}
          </span>
        </div>

        {/* Audio tag */}
        {c.audioUrl && (
          <audio
            ref={audioRef}
            src={c.audioUrl}
            onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
            onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
            onEnded={() => setPlaying(false)}
          />
        )}

        {/* Progress bar */}
        {!isCompact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, margin: "6px 0" }}>
            <div
              style={{
                height: 4,
                width: "100%",
                backgroundColor: theme.colors.border,
                borderRadius: 2,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${(currentTime / duration) * 100}%`,
                  backgroundColor: theme.colors.accent,
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: theme.colors.mutedText,
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Button */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
          <button
            onClick={togglePlay}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: theme.colors.accent,
              color: "#ffffff",
              border: "none",
              cursor: mode === "edit" ? "default" : "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: `0 4px 10px ${hexToRgba(theme.colors.accent, 0.2)}`,
            }}
          >
            {playing ? (
              <Pause size={16} fill="#ffffff" />
            ) : (
              <Play size={16} fill="#ffffff" style={{ marginLeft: 2 }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Carousel                                                        */
/* ------------------------------------------------------------------ */
export function CarouselBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];
  const [active, setActive] = useState(0);

  const prev = () => {
    setActive((a) => (a === 0 ? items.length - 1 : a - 1));
  };

  const next = () => {
    setActive((a) => (a === items.length - 1 ? 0 : a + 1));
  };

  const handleCTA = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!items.length) {
    return <div className="text-center py-6 text-muted-foreground">No slides added</div>;
  }

  const current = items[active];

  if (!current) {
    return <div className="text-center py-6 text-muted-foreground">No slides added</div>;
  }

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        padding: 0,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Slide track — smooth translateX transition */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
          height: 0,
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${items.length * 100}%`,
            transform: `translateX(-${active * (100 / items.length)}%)`,
            transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
          }}
        >
          {items.map((item: BlockItem, i: number) => (
            <ContextualItemTarget
              key={item.id ?? i}
              blockId={block.id}
              collection="carousel"
              itemId={item.id ?? String(i)}
              field="image"
            >
              <div style={{ width: `${100 / items.length}%`, height: "100%", flexShrink: 0 }}>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
                  />
                )}
              </div>
            </ContextualItemTarget>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            zIndex: 10,
            transition: "background-color 0.15s ease",
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={next}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            zIndex: 10,
            transition: "background-color 0.15s ease",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          textAlign: "center",
        }}
      >
        {current.title && <h3 style={headingStyle(theme, 0.8)}>{current.title}</h3>}
        {current.description && (
          <p style={{ fontSize: "12.5px", color: theme.colors.mutedText }}>{current.description}</p>
        )}

        {current.linkUrl && (
          <button
            onClick={() => handleCTA(current.linkUrl)}
            style={{
              alignSelf: "center",
              marginTop: 4,
              fontSize: "11px",
              fontWeight: 600,
              color: theme.colors.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            Saber más <ArrowRight size={11} />
          </button>
        )}

        {/* Indicator dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {items.map((_: BlockItem, i: number) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: active === i ? theme.colors.accent : theme.colors.border,
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "background-color 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Tabs                                                            */
/* ------------------------------------------------------------------ */
export function TabsBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const items = block.content.items ?? [];

  const [activeTab, setActiveTab] = useState<string | null>(items[0]?.id ?? null);
  const activeItem = items.find((i: BlockItem) => i.id === activeTab);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      const nextIndex = (index + 1) % items.length;
      const nextItem = items[nextIndex];
      if (nextItem) setActiveTab(nextItem.id);
    } else if (e.key === "ArrowLeft") {
      const prevIndex = (index - 1 + items.length) % items.length;
      const previousItem = items[prevIndex];
      if (previousItem) setActiveTab(previousItem.id);
    }
  };

  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Tab bar header */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: hexToRgba(theme.colors.text, 0.02),
        }}
        role="tablist"
      >
        {items.map((item: BlockItem, idx: number) => {
          const isSelected = activeTab === item.id;
          return (
            <ContextualItemTarget
              key={item.id}
              blockId={block.id}
              collection="tabs"
              itemId={item.id ?? String(idx)}
              field="label"
            >
              <button
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(item.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: isSelected ? theme.colors.accent : theme.colors.mutedText,
                  borderBottom: isSelected ? `2.5px solid ${theme.colors.accent}` : "none",
                  marginBottom: -1.5,
                  transition: "color 0.16s ease",
                }}
              >
                {item.label}
              </button>
            </ContextualItemTarget>
          );
        })}
      </div>

      {/* Tab panel body */}
      <div
        style={{ padding: 16, fontSize: "13px", color: theme.colors.text, lineHeight: 1.5 }}
        role="tabpanel"
      >
        {activeItem ? (
          activeItem.contentText
        ) : (
          <span style={{ color: theme.colors.mutedText }}>No content</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Bottom Navigation                                              */
/* ------------------------------------------------------------------ */
export function BottomNavigationBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];

  const handleNav = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        backgroundColor: theme.colors.card,
        borderTop: `1px solid ${theme.colors.border}`,
        borderRadius: block.style.radius ?? 12,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
        padding: "8px 10px",
        justifyContent: "space-around",
        alignItems: "center",
      }}
    >
      {items.map((item: BlockItem, idx: number) => (
        <ContextualItemTarget
          key={item.id ?? idx}
          blockId={block.id}
          collection="bottom-nav"
          itemId={item.id ?? String(idx)}
          field="item"
        >
          <button
            onClick={() => handleNav(item.url)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              flex: 1,
              color: theme.colors.mutedText,
              transition: "color 0.16s ease",
            }}
            title={item.label}
          >
            <div style={{ color: theme.colors.accent }}>
              <SmartIcon name={item.icon ?? ""} size={20} />
            </div>
            <span style={{ fontSize: "10px", fontWeight: 500 }}>{item.label}</span>
          </button>
        </ContextualItemTarget>
      ))}
    </div>
  );
}
