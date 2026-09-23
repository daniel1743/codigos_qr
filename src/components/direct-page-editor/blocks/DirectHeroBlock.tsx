import React from "react";
import type { PageDocumentBlockV1 } from "../../../lib/direct-page-editor/page-document";
import { editable, text, cta, type DirectBlockContext, type DirectBlockComponent } from "../DirectBlockRegistry";
import { cx } from "../../../utils/cx"; // Might not exist, I should implement it inside or find it. Wait, I will just write a local cx.

function localCx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export type HeroShape = "curve" | "straight" | "inset";
export type HeroHeight = "S" | "M" | "L";

const HEIGHTS: Record<HeroHeight, number> = { S: 220, M: 320, L: 460 };

export const DirectHeroBlock: DirectBlockComponent = (block, context) => {
  const content = block.content || {};
  const variant = block.variant || "centered_overlap";
  const shape = (content.shapePreset as HeroShape) || "curve";
  const heightPreset = (content.heightPreset as HeroHeight) || "M";
  const m = context.breakpoint === "mobile";

  const H = Math.round(HEIGHTS[heightPreset] * (m ? 0.68 : 1));
  const curve = m ? 40 : 72;
  const inset = m ? 12 : 20;

  const radius = block.style?.radius ? Number(block.style.radius) : 16;
  const media = (content.image as string) || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80";

  const img = (
    <img
      src={media}
      alt=""
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ objectPosition: (content.mediaPosition as string) || "center" }}
    />
  );

  const bandShape: React.CSSProperties =
    shape === "curve"
      ? { borderBottomLeftRadius: `50% ${curve}px`, borderBottomRightRadius: `50% ${curve}px` }
      : shape === "inset"
      ? { borderRadius: radius, margin: inset }
      : {};

  const renderContent = (align: "center" | "left", onMedia: boolean) => {
    const eyebrow = text(content, "eyebrow");
    const title = text(content, "title");
    const subtitle = text(content, "subtitle");
    const description = text(content, "description");
    const hasCTA = !!content.primaryCTA;

    if (!eyebrow && !title && !subtitle && !description && !hasCTA && context.mode !== "edit") {
      return null;
    }

    return (
      <div className={localCx("flex flex-col gap-4", align === "center" ? "items-center text-center" : "items-start text-left")}>
        {eyebrow || context.mode === "edit" ? (
          <div>{editable(context, `blocks.${block.id}.content.eyebrow`, eyebrow, "span")}</div>
        ) : null}
        
        {title || context.mode === "edit" ? (
          <div className={localCx("text-4xl md:text-5xl font-bold tracking-tight", onMedia ? "text-white" : "text-gray-900")}>
            {editable(context, `blocks.${block.id}.content.title`, title || (context.mode === "edit" ? "T\u00edtulo Principal" : ""), "h1")}
          </div>
        ) : null}

        {subtitle || context.mode === "edit" ? (
          <div className={localCx("text-lg opacity-80", onMedia ? "text-white" : "text-gray-600")}>
            {editable(context, `blocks.${block.id}.content.subtitle`, subtitle, "h2")}
          </div>
        ) : null}

        {description || context.mode === "edit" ? (
          <div className={localCx("text-base opacity-75", onMedia ? "text-white" : "text-gray-600")}>
            {editable(context, `blocks.${block.id}.content.description`, description, "p")}
          </div>
        ) : null}

        {cta(
          block.id,
          undefined,
          content.primaryCTA as { label?: string; url?: string } | undefined,
          context,
        )}
      </div>
    );
  };

  if (variant === "split_media") {
    const frameRadius =
      shape === "curve"
        ? `9999px 9999px ${radius}px ${radius}px`
        : shape === "inset"
        ? `${radius}px`
        : "0px";
    return (
      <div
        data-hero={variant}
        data-shape={shape}
        className={localCx(
          "mx-auto grid items-center w-full",
          m ? "grid-cols-1 gap-12 px-5 pb-6 pt-5" : "grid-cols-[1.05fr_1fr] gap-16 px-10 py-16"
        )}
        style={{ maxWidth: 1180 }}
      >
        <div className={localCx("flex flex-col w-full", m && "order-2")}>
          {renderContent("left", false)}
        </div>
        <div className={localCx("relative w-full", m && "order-1")}>
          <div
            className="relative overflow-hidden bg-gray-200"
            style={{ borderRadius: frameRadius, aspectRatio: m ? "1 / 1" : "4 / 5" }}
          >
            {img}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "image_overlay") {
    const minHeight = H + (m ? 250 : 210);
    return (
      <div
        data-hero={variant}
        data-shape={shape}
        className="relative overflow-hidden w-full"
        style={{ minHeight, ...bandShape }}
      >
        {img}
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="relative flex flex-col justify-end z-10 w-full h-full"
          style={{
            minHeight,
            padding: m ? "96px 20px 36px" : "140px 56px 60px",
          }}
        >
          {renderContent("left", true)}
        </div>
      </div>
    );
  }

  if (variant === "simple") {
    return (
      <div
        data-hero={variant}
        data-shape={shape}
        className="flex flex-col w-full"
        style={{
          padding: m ? "52px 20px" : "84px 40px",
          ...(shape === "inset" ? { borderRadius: radius, margin: inset } : {}),
        }}
      >
        {renderContent("center", false)}
      </div>
    );
  }

  // Default: centered_overlap
  return (
    <div data-hero={variant} data-shape={shape} className="pb-2 relative z-0 w-full">
      <div className="relative overflow-hidden bg-gray-200" style={{ height: H, ...bandShape }}>
        {img}
      </div>
      {/* The overlap is handled by the negative margin of the Profile block */}
    </div>
  );
};
