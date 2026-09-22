import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent } from "react";
import type { BlockItem, BlockStyle, TypographyOverride } from "../../types";
import { useRender } from "../../engine/RenderContext";
import { PremiumProductCardMagicToolbar } from "./PremiumProductCardMagicToolbar";

type MagicField = "card" | "image" | "title" | "description" | "price" | "cta";

function typographyStyle(
  style: TypographyOverride | undefined,
  defaults: CSSProperties,
): CSSProperties {
  if (!style) return defaults;
  return {
    ...defaults,
    fontFamily: style.fontFamily ?? defaults.fontFamily,
    fontSize: style.fontSize ?? defaults.fontSize,
    fontWeight: style.fontWeight ?? defaults.fontWeight,
    color: style.textColor ?? defaults.color,
    textAlign: style.textAlign ?? defaults.textAlign,
    fontStyle: style.fontStyle ?? defaults.fontStyle,
    textDecoration: style.textDecoration ?? defaults.textDecoration,
  };
}

function EditableText({
  value,
  tag: Tag,
  style,
  editable,
  anchor,
  selected,
  onSelect,
  onCommit,
}: {
  value: string;
  tag: "h3" | "p" | "div" | "span";
  style: CSSProperties;
  editable: boolean;
  anchor: string;
  selected: boolean;
  onSelect: (event: MouseEvent<HTMLElement>) => void;
  onCommit: (event: FormEvent<HTMLElement>) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") (event.currentTarget as HTMLElement).blur();
    if (event.key === "Enter" && tag !== "p" && tag !== "div") {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    }
  };

  return (
    <Tag
      data-premium-edit-anchor={anchor}
      data-premium-editable={editable ? "true" : undefined}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={false}
      onMouseDown={onSelect}
      onClick={onSelect}
      onFocus={onSelect}
      onBlur={onCommit}
      style={{
        ...style,
        outline: selected ? "2px solid #2F6FED" : undefined,
        outlineOffset: selected ? 3 : undefined,
        cursor: editable ? "text" : undefined,
        borderRadius: selected ? 4 : undefined,
      }}
    >
      {value}
    </Tag>
  );
}

/**
 * Faithful Phase 1 presentation port of Magic Patterns' ProductCard.
 *
 * This component is intentionally editor-neutral: it renders real catalog
 * data, but does not own selection, inline editing, toolbar, modal, or image
 * picker behavior. Those seams belong to the later integration phase.
 */
export function PremiumProductCardMagicV1({
  product,
  blockId,
  itemId,
  inlinePathPrefix,
  blockStyle,
}: {
  product: BlockItem;
  blockId: string;
  itemId: string;
  inlinePathPrefix: string;
  blockStyle: BlockStyle;
}) {
  const {
    mode,
    selectedCollectionItem,
    onSelectCollectionItem,
    onInlineEdit,
    onUploadCollectionItemImage,
    onRemoveCollectionItemImage,
    onListCollectionItemImages,
  } = useRender();
  const selectedField: MagicField | null =
    selectedCollectionItem?.blockId === blockId && selectedCollectionItem.itemId === itemId
      ? ((selectedCollectionItem.field === "item"
          ? "card"
          : selectedCollectionItem.field) as MagicField)
      : null;
  const editable = mode === "edit";
  const select = (field: MagicField) => {
    if (!editable) return;
    onSelectCollectionItem?.(blockId, "product-grid", itemId, field);
  };
  const commit = (field: string, event: FormEvent<HTMLElement>) => {
    const value = event.currentTarget.innerText.replace(/\n+$/, "");
    if (value !== (product[field as keyof BlockItem] ?? ""))
      onInlineEdit?.(`${inlinePathPrefix}.${field}`, value);
  };
  const selected = (field: MagicField) => selectedField === field;
  const image = product.imageUrl;
  const hasReferenceImage = product.imageProvenance?.origin === "reference_stock";

  const titleStyle: CSSProperties = typographyStyle(product.typography, {
    margin: 0,
    color: "#17140F",
    fontFamily: 'Marcellus, "Playfair Display", Georgia, serif',
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    overflowWrap: "anywhere",
  });

  const descriptionStyle: CSSProperties = typographyStyle(product.descriptionTypography, {
    margin: 0,
    color: "#4A443C",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  });

  const priceStyle: CSSProperties = typographyStyle(product.priceTypography, {
    color: "#17140F",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.2,
    fontVariantNumeric: "tabular-nums",
  });
  const ctaStyle = product.ctaStyle ?? {};
  const cardBackground = blockStyle.background ?? "#FFFFFF";
  const cardBorder = blockStyle.accentColor ?? "#E6E1DA";
  const cardRadius = blockStyle.radius ?? 18;
  const textAlign = ctaStyle.textAlign ?? "left";
  const selectCard = (event: MouseEvent<HTMLElement>) => {
    if (!editable) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-premium-editable="true"], [data-premium-image-target], button'))
      return;
    select("card");
  };

  return (
    <article
      aria-label={product.title ?? "Producto"}
      data-premium-card="magic-v1"
      data-premium-edit-anchor={`${itemId}:card`}
      onMouseDown={selectCard}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 16,
        border: `1px solid ${cardBorder}`,
        borderRadius: cardRadius,
        background: cardBackground,
        boxShadow: "0 1px 2px rgba(23,20,15,.06), 0 4px 14px -8px rgba(23,20,15,.18)",
        color: "#17140F",
        outline: selected("card") ? "2px solid #2F6FED" : undefined,
        outlineOffset: selected("card") ? 3 : undefined,
      }}
    >
      {editable && selected("card") ? (
        <span
          data-premium-selection-label="card"
          style={{
            position: "absolute",
            top: -13,
            left: 0,
            zIndex: 30,
            transform: "translateY(-100%)",
            borderRadius: 6,
            background: "#2F6FED",
            color: "#fff",
            padding: "3px 8px",
            fontSize: 10.5,
            fontWeight: 600,
          }}
        >
          Tarjeta
        </span>
      ) : null}
      <div
        data-premium-card-image="magic-v1"
        data-premium-edit-anchor={`${itemId}:image`}
        data-premium-image-target="true"
        role={editable ? "button" : undefined}
        tabIndex={editable ? 0 : undefined}
        onMouseDown={(event) => {
          if (!editable) return;
          event.stopPropagation();
          select("image");
        }}
        onClick={(event) => {
          if (!editable) return;
          event.stopPropagation();
          select("image");
        }}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          overflow: "hidden",
          borderRadius: 14,
          background: "#EFEBE5",
          outline: selected("image") ? "2px solid #2F6FED" : undefined,
          outlineOffset: selected("image") ? 3 : undefined,
        }}
      >
        {image ? (
          <img
            src={image}
            alt={product.title ?? "Producto"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
        {hasReferenceImage && image ? (
          <span
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              borderRadius: 999,
              background: "rgba(23,20,15,.62)",
              color: "rgba(255,255,255,.95)",
              padding: "3px 8px",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 10.5,
              fontWeight: 500,
              lineHeight: 1.2,
              backdropFilter: "blur(2px)",
            }}
          >
            Imagen de referencia
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: 12,
          marginTop: 20,
        }}
      >
        <EditableText
          value={product.title ?? "Producto"}
          tag="h3"
          style={titleStyle}
          editable={editable}
          anchor={`${itemId}:title`}
          selected={selected("title")}
          onSelect={(event) => {
            event.stopPropagation();
            select("title");
          }}
          onCommit={(event) => commit("title", event)}
        />
        {product.description ? (
          <EditableText
            value={product.description}
            tag="p"
            style={descriptionStyle}
            editable={editable}
            anchor={`${itemId}:description`}
            selected={selected("description")}
            onSelect={(event) => {
              event.stopPropagation();
              select("description");
            }}
            onCommit={(event) => commit("description", event)}
          />
        ) : null}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingTop: 16,
          }}
        >
          <EditableText
            value={product.price ?? ""}
            tag="div"
            style={{
              ...priceStyle,
              outline: selected("price") ? "2px solid #2F6FED" : undefined,
              outlineOffset: selected("price") ? 3 : undefined,
              borderRadius: selected("price") ? 4 : undefined,
            }}
            editable={editable}
            anchor={`${itemId}:price`}
            selected={selected("price")}
            onSelect={(event) => {
              event.stopPropagation();
              select("price");
            }}
            onCommit={(event) => commit("price", event)}
          />

          {product.ctaLabel ? (
            <button
              type="button"
              data-premium-edit-anchor={`${itemId}:cta`}
              aria-disabled={editable ? "true" : undefined}
              onMouseDown={(event) => {
                if (!editable) return;
                event.stopPropagation();
                select("cta");
              }}
              onClick={(event) => {
                event.preventDefault();
                if (editable) select("cta");
              }}
              style={{
                display: "inline-flex",
                width: "100%",
                minHeight: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: ctaStyle.radius ?? 999,
                border: ctaStyle.borderWidth
                  ? `${ctaStyle.borderWidth}px solid ${ctaStyle.borderColor ?? "#1E4D44"}`
                  : 0,
                padding: `${ctaStyle.paddingY ?? 10}px ${ctaStyle.paddingX ?? 20}px`,
                background: ctaStyle.backgroundColor ?? "#1E4D44",
                color: ctaStyle.textColor ?? "#FFFFFF",
                fontFamily: ctaStyle.fontFamily ?? "Inter, system-ui, sans-serif",
                fontSize: ctaStyle.fontSize ?? 14,
                fontWeight: ctaStyle.fontWeight ?? 500,
                lineHeight: 1.25,
                cursor: "default",
                justifyContent:
                  textAlign === "left"
                    ? "flex-start"
                    : textAlign === "right"
                      ? "flex-end"
                      : "center",
                outline: selected("cta") ? "2px solid #2F6FED" : undefined,
                outlineOffset: selected("cta") ? 3 : undefined,
              }}
            >
              <span
                data-premium-editable={editable ? "true" : undefined}
                contentEditable={editable}
                suppressContentEditableWarning
                spellCheck={false}
                onBlur={(event) =>
                  onInlineEdit?.(
                    `${inlinePathPrefix}.ctaLabel`,
                    event.currentTarget.innerText.replace(/\n+$/, ""),
                  )
                }
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {product.ctaLabel}
              </span>
            </button>
          ) : null}
        </div>
      </div>
      {editable && selectedField ? (
        <PremiumProductCardMagicToolbar
          product={product}
          field={selectedField}
          prefix={inlinePathPrefix}
          itemId={itemId}
          blockId={blockId}
          blockStyle={blockStyle}
          onListImages={onListCollectionItemImages}
          onUploadImage={(file) => onUploadCollectionItemImage?.(blockId, itemId, file)}
          onRemoveImage={() => onRemoveCollectionItemImage?.(blockId, itemId)}
        />
      ) : null}
    </article>
  );
}
