import React from "react";
import { PlusIcon, StarIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { Editable } from "../editor/Editable";
import { EditableText } from "../editor/EditableText";
import { cx } from "../../utils/cx";
import { blockPrefix } from "../../utils/styles";
import {
  REVIEWS_MAX,
  addReview,
  readReview,
  reviewsOrder,
} from "../../utils/reviewsOps";
import type { BlockRef } from "../../types/editor";

interface ReviewsBlockProps {
  block: BlockRef;
  maxWidth?: number;
}

/** Five stars with `value` filled. Colours come from theme tokens (accent + line). */
function Stars({ value, accent, muted }: { value: number; accent: string; muted: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${value} de 5 estrellas`}
      data-review-rating={value}>
      {[1, 2, 3, 4, 5].map((index) => {
        const filled = index <= value;
        return (
          <StarIcon
            key={index}
            className="h-3.5 w-3.5"
            strokeWidth={1.6}
            style={{ color: filled ? accent : muted }}
            fill={filled ? accent : "none"}
          />
        );
      })}
    </span>
  );
}

/**
 * "Reseñas" — a clean, responsive grid of testimonial cards. Each card is a
 * single selectable unit (`kind="review"`) whose controls live in the shared
 * toolbar/panel. Self-contained: it does NOT reuse the card-family engine nor
 * any legacy testimonial card.
 */
export function ReviewsBlock({ block, maxWidth = 720 }: ReviewsBlockProps) {
  const ed = useEditor();
  const m = ed.isMobile;
  const t = useThemeTokens();
  const order = reviewsOrder(ed.doc, block.key);
  const canAdd = order.length < REVIEWS_MAX;
  const single = order.length === 1;
  const blockProps = ed.doc.props[`block:${block.key}`] ?? {};

  /**
   * The heading is opt-in: it renders only once a title has actually been
   * written. The Magic Patterns targets carry one ("Lo que dicen", …), but a
   * page that never had one must not sprout one on load.
   */
  const titleId = `${blockPrefix(block)}reviews.title`;
  const title = ed.doc.texts[titleId] ?? "";
  /** Avatars default ON so published reviews keep the bubble they already had. */
  const showAvatars = blockProps["showAvatars"] !== "off";

  return (
    <div className={cx("mx-auto w-full", m ? "px-5" : "px-10")} style={{ maxWidth: maxWidth + 80 }}>
      {title.trim() !== "" && (
        <EditableText
          id={titleId}
          value={title}
          as="h2"
          label="Título del bloque"
          className="cq-fg mb-5 text-[22px] leading-tight"
          style={{ fontFamily: t.displayFont }}
        />
      )}
      <div
        className={cx("grid", single ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2", m ? "gap-3" : "gap-4")}
        style={single && !m ? { maxWidth: 420, marginInline: "auto" } : undefined}>
        {order.map((slot, index) => {
          const review = readReview(ed.doc, block.key, slot, index);
          const initials = review.name.trim().slice(0, 1).toUpperCase() || "★";
          return (
            <Editable
              key={slot}
              id={review.id}
              kind="review"
              blockKey={block.key}
              label={`Reseña ${index + 1}`}
              as="article"
              className="cq-surface cq-line relative flex flex-col gap-3 border p-5"
              style={{ borderRadius: t.radius }}>
              <div className="flex items-center gap-3">
                {showAvatars && (review.avatar ? (
                  <img
                    src={review.avatar}
                    alt={review.name}
                    draggable={false}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-semibold"
                    style={{ background: t.accent, color: t.accentFg }}>
                    {initials}
                  </span>
                ))}
                <div className="min-w-0 flex-1">
                  <p className="cq-fg truncate text-[15px] font-semibold" style={{ fontFamily: t.displayFont }}>
                    {review.name}
                  </p>
                  <Stars value={review.rating} accent={t.accent} muted={t.page.line} />
                </div>
              </div>
              <p className="cq-muted text-[13.5px] leading-relaxed">{review.text}</p>
            </Editable>
          );
        })}
      </div>

      {ed.mode === "edit" && canAdd && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            ed.updateDoc((doc) => addReview(doc, block.key));
          }}
          className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-select/50 bg-white/80 px-5 text-[13px] font-medium text-select transition-colors duration-150 hover:bg-white">
          <PlusIcon className="h-4 w-4" /> Agregar reseña
        </button>
      )}
    </div>
  );
}
