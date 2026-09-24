import React from "react";
import { PlusIcon } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { EditableText } from "../editor/EditableText";
import { FamilyCard } from "./FamilyCard";
import { baseIndex, cardOrder } from "../../utils/cardOps";
import { cardSpan, resolveCard } from "../../utils/cardLayout";
import { blockPrefix } from "../../utils/styles";
import { cx } from "../../utils/cx";
import type { BlockRef, CardFamilyDef } from "../../types/editor";

interface CardFamilyBlockProps {
  block: BlockRef;
  family: CardFamilyDef;
}

/** A block of structured cards. Each card picks its own layout; the 12-col grid keeps mixed layouts aligned. */
export function CardFamilyBlock({ block, family }: CardFamilyBlockProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const m = ed.isMobile;
  const p = blockPrefix(block);
  const blockId = `block:${block.key}`;
  const blockProps = ed.doc.props[blockId] ?? {};
  const order = cardOrder(ed.doc, block.key, family.items.length);

  return (
    <div className={cx("mx-auto w-full", m ? "px-5" : "px-10")} style={{ maxWidth: 1120 }}>
      <div className="mb-7 max-w-[620px]">
        <EditableText
          id={`${p}cards.title`}
          value={family.heading}
          as="h2"
          label="Título"
          className={cx("cq-fg leading-tight", m ? "text-[28px]" : "text-[38px]")}
          style={{ fontFamily: t.displayFont }}
        />

        <EditableText
          id={`${p}cards.sub`}
          value={family.sub}
          label="Subtítulo"
          className="cq-muted mt-2 text-[15px] leading-relaxed"
        />
      </div>

      {order.length > 0 ? (
        <div className="grid grid-cols-12" style={{ gap: m ? 12 : 20 }}>
          {order.map((itemId) => {
            const item = family.items[baseIndex(itemId)] ?? family.items[0];
            const id = `${p}card.${itemId}`;
            const r = resolveCard(family, blockProps, ed.doc.props[id] ?? {});
            return (
              <FamilyCard
                key={itemId}
                id={id}
                family={family}
                item={item}
                blockProps={blockProps}
                className={cardSpan(r.layout, r.dense, m)}
              />
            );
          })}
        </div>
      ) : (
        ed.mode === "edit" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ed.setProp(blockId, "order", family.items.map((_, i) => String(i)).join(","));
            }}
            className="flex h-28 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-select/50 bg-white/70 text-[13.5px] font-medium text-select"
          >
            <PlusIcon className="h-4 w-4" /> Restaurar tarjetas de ejemplo
          </button>
        )
      )}
    </div>
  );
}
