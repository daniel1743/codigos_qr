import React, { useState } from "react";
import { TemplateRenderer } from "../../../premium-template-studio/engine/TemplateRenderer";
import { useEditor } from "../contexts/EditorContext";
import { cx } from "../utils/cx";
import { SelectionLayer } from "../components/editor/SelectionLayer";

export function CanonicalCanvas() {
  const ed = useEditor();
  const config = ed.canonicalDocument;
  const isNew = ed.canonicalIsNew;
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);

  if (!config) return null;

  return (
    <div className="relative h-full" data-bridge-document="canonical" data-bridge-write="enabled">
      <div ref={setScroller} className="h-full overflow-y-auto overflow-x-hidden">
        {isNew ? (
          <p className="mx-auto max-w-3xl px-5 py-3 text-center text-xs text-mute" role="status">
            Vista inicial canónica. Los cambios se guardan como borrador en esta página.
          </p>
        ) : null}
        <div ref={setContent} className={cx("relative flex min-h-full flex-col", ed.isMobile ? "mx-auto max-w-[390px] bg-white shadow-lg" : "")}>
          <TemplateRenderer
            config={config}
            documentKind="page"
            mode={ed.mode === "preview" ? "view" : "edit"}
            breakpoint={ed.isMobile ? "mobile" : "desktop"}
            editing={{
              onSelect: (id) => ed.select(id),
              onSelectHeroImage: (id) => ed.select(`${id}:hero-image`),
              onSelectHeroBackground: (id) => ed.select(`${id}:hero-background`),
              onSelectHeroText: (id, target) => ed.select(`${id}:hero-${target}`),
              onSelectHeroCta: (id, target) => ed.select(`${id}:hero-${target}`),
              onSelectCollectionItem: (id, collection, itemId, field) =>
                ed.select(`${id}:${collection}:${itemId}:${field ?? "item"}`),
              onSelectPageBackground: () => ed.select("page-background"),
            }}
          />
          <SelectionLayer container={content} scroller={scroller} />
        </div>
      </div>
    </div>
  );
}
