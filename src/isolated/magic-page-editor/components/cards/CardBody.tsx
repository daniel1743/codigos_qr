import React from "react";
import { ArrowRightIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { EditableText } from "../editor/EditableText";
import { EditableCTA, type CtaVariants } from "../editor/EditableCTA";
import { EditableBadge } from "./EditableBadge";
import { cx } from "../../utils/cx";
import type { CardFamilyDef, CardItem } from "../../types/editor";

export type BodySize = "sm" | "md" | "lg";

interface CardBodyProps {
  id: string;
  family: CardFamilyDef;
  item: CardItem;
  size: BodySize;
  show: { price: boolean; prev: boolean; badge: boolean; cta: boolean };
  inlineBadge: boolean;
  sale: boolean;
  onAccent: boolean;
  className?: string;
}

const justify: Record<string, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
  full: "",
};

/** Content column shared by every family: eyebrow → title → description → price / CTA footer. */
export function CardBody({
  id,
  family,
  item,
  size,
  show,
  inlineBadge,
  sale,
  onAccent,
  className,
}: CardBodyProps) {
  const { doc, isMobile: m } = useEditor();
  const t = useThemeTokens();
  const display: React.CSSProperties = { fontFamily: t.displayFont };
  const isMenu = family.id === "menu";
  const pill = t.radius < 8 ? "rounded-[4px]" : "rounded-full";

  const titleSize =
    size === "lg"
      ? m
        ? "text-[26px]"
        : "text-[38px]"
      : size === "sm"
        ? "text-[15.5px] font-semibold"
        : m
          ? "text-[19px]"
          : "text-[22px]";
  const ctaVariants: CtaVariants = {
    solid: onAccent
      ? { background: "var(--fg)", color: t.accent }
      : { background: t.accent, color: t.accentFg },
    outline: { boxShadow: "inset 0 0 0 1px var(--fg)", color: "var(--fg)" },
    soft: { background: "var(--surface)", color: "var(--fg)", boxShadow: "0 0 0 1px var(--line)" },
  };
  const ctaAlign = doc.props[`${id}.cta`]?.align ?? "left";

  const price = show.price && item.price && (
    <EditableText
      id={`${id}.price`}
      value={item.price}
      as="span"
      kind="price"
      label="Precio"
      className={cx(
        "cq-fg font-semibold tabular-nums",
        sale ? "text-[20px]" : size === "sm" ? "text-[14.5px]" : "text-[17px]",
      )}
      style={sale && !onAccent ? { color: t.accent } : undefined}
    />
  );

  const prev = show.prev && item.previousPrice && (
    <EditableText
      id={`${id}.prev`}
      value={item.previousPrice}
      as="span"
      kind="price"
      label="Precio anterior"
      className="cq-muted text-[13.5px] tabular-nums line-through"
    />
  );

  return (
    <div className={cx("flex min-w-0 flex-col", className)}>
      {inlineBadge && show.badge && item.badge && (
        <EditableBadge
          id={`${id}.badge`}
          label={item.badge}
          defaultStyle={sale ? "solid" : "soft"}
          className="mb-2.5"
        />
      )}
      {(item.eyebrow || item.meta) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {item.eyebrow && (
            <EditableText
              id={`${id}.eyebrow`}
              value={item.eyebrow}
              as="span"
              label={family.id === "portfolio" ? "Categoría" : "Antetítulo"}
              className="cq-muted text-[11.5px] font-semibold uppercase tracking-[0.12em]"
            />
          )}
          {item.meta && (
            <>
              <span className="cq-muted text-[11px]" aria-hidden>
                ·
              </span>
              <EditableText
                id={`${id}.meta`}
                value={item.meta}
                as="span"
                label="Fecha"
                className="cq-muted text-[12px] tabular-nums"
              />
            </>
          )}
        </div>
      )}

      <div data-slot="title" className={cx(isMenu && "flex items-baseline justify-between gap-3")}>
        <EditableText
          id={`${id}.title`}
          value={item.title}
          as="h3"
          label="Título"
          className={cx("cq-fg leading-tight", titleSize, isMenu && "min-w-0 flex-1")}
          style={size === "sm" ? undefined : display}
        />
        {isMenu && price && <span className="shrink-0">{price}</span>}
      </div>

      <EditableText
        id={`${id}.desc`}
        value={item.description}
        label="Descripción"
        multiline
        className={cx(
          "cq-muted mt-1.5 leading-relaxed",
          size === "sm"
            ? "line-clamp-2 text-[13px]"
            : size === "lg"
              ? "text-[15.5px]"
              : "text-[14px]",
        )}
      />

      {((!isMenu && (price || prev)) || (show.cta && item.cta)) && (
        <div
          className={cx(
            "mt-auto flex flex-wrap items-center gap-x-4 gap-y-3",
            size === "sm" ? "pt-2.5" : "pt-4",
          )}
        >
          {!isMenu && (price || prev) && (
            <span className="flex items-baseline gap-2">
              {price}
              {prev}
            </span>
          )}
          {show.cta && item.cta && (
            <div
              data-slot="cta"
              className={cx("flex", ctaAlign === "full" ? "w-full" : "flex-1", justify[ctaAlign])}
            >
              <EditableCTA
                id={`${id}.cta`}
                label={item.cta}
                href="https://"
                variants={ctaVariants}
                defaultVariant={size === "sm" ? "soft" : "solid"}
                fullDefault={ctaAlign === "full"}
                className={cx(
                  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold",
                  pill,
                  size === "sm" ? "h-8 px-3.5 text-[12.5px]" : "h-10 px-4 text-[13px]",
                )}
                trailing={<ArrowRightIcon className="h-3.5 w-3.5" />}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
