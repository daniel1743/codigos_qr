/**
 * PREMIUM TEMPLATE ENGINE
 *
 * React defines capabilities.
 * Configuration defines composition.
 * Themes define visual identity.
 * Layouts define structure.
 * Content defines user information.
 *
 * The public renderer must remain independent
 * from the editing application.
 *
 * New visual templates should normally be created
 * through configuration, composition and variants,
 * not by duplicating React applications.
 */

import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { EyeOff, Copy, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import type { BioTemplateConfig, Breakpoint, MotionConfig, TemplateBlock } from "../types";
import { getBlockComponent } from "./BlockRegistry";
import { RenderProvider, useRender } from "./RenderContext";
import {
  ANIMATION_CLASS,
  HOVER_CLASS,
  backgroundLayerStyle,
  decorativeFrameStyle,
  motionCssVars,
  pageBackground,
  textureStyle,
  themeToCssVars,
} from "./styleEngine";
import { getMotionConfig } from "../constants/motionPresets";
import { ProfileHeader } from "../components/canvas/ProfileHeader";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { cx } from "../utils";

export interface EditingHandlers {
  selectedBlockId?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onInlineEdit?: ((path: string, value: string) => void) | undefined;
  onMove?: ((id: string, direction: -1 | 1) => void) | undefined;
  onDuplicate?: ((id: string) => void) | undefined;
  onToggleHidden?: ((id: string) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onReorder?: ((sourceId: string, targetId: string) => void) | undefined;
}

export interface TemplateRendererProps {
  config: BioTemplateConfig;
  breakpoint?: Breakpoint | undefined;
  mode?: "edit" | "public" | undefined;
  editing?: EditingHandlers | undefined;
  onTrack?:
    | ((event: { type: string; blockId?: string | undefined; url?: string | undefined }) => void)
    | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function isVisible(block: TemplateBlock, breakpoint: Breakpoint): boolean {
  const overrides = block.responsive?.[breakpoint];
  if (overrides?.visible !== undefined) {
    return overrides.visible;
  }
  return block.visibility[breakpoint] !== false;
}

function getMergedBlock(block: TemplateBlock, breakpoint: Breakpoint): TemplateBlock {
  const overrides = block.responsive?.[breakpoint];
  if (!overrides) return block;

  const mergedLayout = { ...block.layout };
  if (overrides.align !== undefined) mergedLayout.align = overrides.align;
  if (overrides.colSpan !== undefined) mergedLayout.colSpan = overrides.colSpan;
  if (overrides.rowSpan !== undefined) mergedLayout.rowSpan = overrides.rowSpan;
  if (overrides.zIndex !== undefined) mergedLayout.zIndex = overrides.zIndex;
  if (overrides.constraints) {
    mergedLayout.constraints = { ...block.layout.constraints, ...overrides.constraints };
  }
  if (overrides.overlap) mergedLayout.overlap = { ...block.layout.overlap, ...overrides.overlap };
  if (overrides.offset) mergedLayout.offset = { ...block.layout.offset, ...overrides.offset };
  if (overrides.sticky) mergedLayout.sticky = { ...block.layout.sticky, ...overrides.sticky };
  if (overrides.floating)
    mergedLayout.floating = { ...block.layout.floating, ...overrides.floating };

  const mergedStyle = { ...block.style };
  if (overrides.padding !== undefined) mergedStyle.padding = overrides.padding;
  if (overrides.minHeight !== undefined) mergedStyle.minHeight = overrides.minHeight;

  const merged = {
    ...block,
    layout: mergedLayout,
    style: mergedStyle,
  };

  // Merge content responsive overrides
  if (overrides.avatarSize !== undefined || overrides.ctaDirection !== undefined) {
    const mergedContent = { ...block.content };
    if (block.content.avatar && overrides.avatarSize !== undefined) {
      mergedContent.avatar = { ...block.content.avatar, size: overrides.avatarSize };
    }
    if (overrides.ctaDirection !== undefined) mergedContent.ctaDirection = overrides.ctaDirection;
    merged.content = mergedContent;
  }

  return merged;
}

/**
 * Resolves the effective entrance and hover classes for a block,
 * considering global motion config and local block overrides.
 */
function resolveBlockMotion(
  block: TemplateBlock,
  motionConfig: MotionConfig,
): {
  entranceClass: string;
  hoverClass: string;
  stagger: number;
  duration: number;
  disabled: boolean;
} {
  const m = block.motion;

  // If block has local override and useGlobal is false
  if (m && m.useGlobal === false) {
    if (m.disableMotion) {
      return { entranceClass: "", hoverClass: "", stagger: 0, duration: 0, disabled: true };
    }
    return {
      entranceClass: ANIMATION_CLASS[m.entrance ?? motionConfig.entrance] ?? "",
      hoverClass: HOVER_CLASS[m.hover ?? motionConfig.hover] ?? "",
      stagger: motionConfig.stagger,
      duration: motionConfig.duration,
      disabled: false,
    };
  }

  // A block interaction animation is a serializable local contract. It wins
  // over the global preset when present, while legacy blocks without it keep
  // inheriting the global motion settings.
  if (block.interaction.animation) {
    if (block.interaction.animation === "none") {
      return { entranceClass: "", hoverClass: "", stagger: 0, duration: 0, disabled: true };
    }
    return {
      entranceClass: ANIMATION_CLASS[block.interaction.animation] ?? "",
      hoverClass: HOVER_CLASS[motionConfig.hover] ?? "",
      stagger: motionConfig.stagger,
      duration: motionConfig.duration,
      disabled: false,
    };
  }

  // Use global motion config
  if (motionConfig.preset === "none") {
    return { entranceClass: "", hoverClass: "", stagger: 0, duration: 0, disabled: true };
  }

  return {
    entranceClass: ANIMATION_CLASS[motionConfig.entrance] ?? "",
    hoverClass: HOVER_CLASS[motionConfig.hover] ?? "",
    stagger: motionConfig.stagger,
    duration: motionConfig.duration,
    disabled: false,
  };
}

/** Wrapper that triggers entrance animation when entering the viewport (public mode only). */
function ScrollRevealWrapper({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1, once: true });

  return (
    <div
      ref={ref}
      className={cx(isVisible ? className : "pts-reveal", isVisible && "pts-reveal--visible")}
      style={isVisible ? style : { opacity: 0 }}
    >
      {children}
    </div>
  );
}

function BlockFrame({
  block,
  index,
  total,
  editing,
  children,
  span,
  rowSpan = 1,
  order,
}: {
  block: TemplateBlock;
  index: number;
  total: number;
  editing: EditingHandlers | undefined;
  children: React.ReactNode;
  span: number;
  rowSpan?: number;
  order?: number;
}) {
  const { theme } = useRender();
  const selected = editing?.selectedBlockId === block.id;
  const hidden = !block.visibility.desktop && !block.visibility.tablet && !block.visibility.mobile;

  const l = block.layout;
  const c = l.constraints ?? {};
  const overlap = l.overlap ?? {};
  const offset = l.offset ?? {};
  const sticky = l.sticky ?? {};
  const floating = l.floating ?? {};

  // Resolve base styles
  const baseStyle: React.CSSProperties = {
    gridColumn: `span ${span}`,
    gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
    order,
    ...decorativeFrameStyle(block.style.frame, block.style.accentColor ?? theme.colors.accent),
  };

  if (c.position) baseStyle.position = c.position as CSSProperties["position"];

  // Sizing and aspect ratio
  if (c.aspectRatio) baseStyle.aspectRatio = c.aspectRatio;
  if (c.minWidth !== undefined && c.minWidth !== null) baseStyle.minWidth = c.minWidth;
  if (c.maxWidth !== undefined && c.maxWidth !== null) baseStyle.maxWidth = c.maxWidth;
  if (c.minHeight !== undefined && c.minHeight !== null) baseStyle.minHeight = c.minHeight;
  if (c.maxHeight !== undefined && c.maxHeight !== null) baseStyle.maxHeight = c.maxHeight;
  if (c.overflow) baseStyle.overflow = c.overflow;

  // Layering
  if (l.zIndex !== undefined) baseStyle.zIndex = l.zIndex;

  // Overlap
  if (overlap.enabled && overlap.amount) {
    const dir = overlap.direction ?? "top";
    if (dir === "top") baseStyle.marginTop = -overlap.amount;
    if (dir === "bottom") baseStyle.marginBottom = -overlap.amount;
    if (dir === "left") baseStyle.marginLeft = -overlap.amount;
    if (dir === "right") baseStyle.marginRight = -overlap.amount;
  }

  // Offsets
  if (offset.x || offset.y || l.zIndex !== undefined) {
    baseStyle.position = "relative";
    if (offset.x) baseStyle.left = offset.x;
    if (offset.y) baseStyle.top = offset.y;
  }

  // Sticky positioning
  if (sticky.enabled) {
    baseStyle.position = "sticky";
    baseStyle.top = sticky.top ?? 16;
    if (l.zIndex === undefined) baseStyle.zIndex = 10;
  }

  // Floating positioning
  if (floating.enabled) {
    baseStyle.position = "fixed";
    if (l.zIndex === undefined) baseStyle.zIndex = 100;
    const fOffset = floating.offset ?? 20;
    const anchor = floating.anchor ?? "bottom-right";

    if (anchor === "bottom-right") {
      baseStyle.bottom = fOffset;
      baseStyle.right = fOffset;
    } else if (anchor === "bottom-left") {
      baseStyle.bottom = fOffset;
      baseStyle.left = fOffset;
    } else if (anchor === "bottom-center") {
      baseStyle.bottom = fOffset;
      baseStyle.left = "50%";
      baseStyle.transform = "translateX(-50%)";
    } else if (anchor === "top-right") {
      baseStyle.top = fOffset;
      baseStyle.right = fOffset;
    } else if (anchor === "top-left") {
      baseStyle.top = fOffset;
      baseStyle.left = fOffset;
    }
  }

  if (!editing) {
    return <section style={baseStyle}>{children}</section>;
  }

  return (
    <section
      role="button"
      tabIndex={0}
      aria-label={`${block.type} block`}
      aria-pressed={selected}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/pts-block", block.id)}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/pts-block")) e.preventDefault();
      }}
      onDrop={(e) => {
        const sourceId = e.dataTransfer.getData("text/pts-block");
        if (sourceId && sourceId !== block.id) editing.onReorder?.(sourceId, block.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        editing.onSelect?.(block.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          editing.onSelect?.(block.id);
        }
      }}
      className={cx("pts-block", selected && "pts-block--selected")}
      style={{
        ...baseStyle,
        position: (floating.enabled
          ? "fixed"
          : sticky.enabled
            ? "sticky"
            : (baseStyle.position ?? "relative")) as CSSProperties["position"],
        opacity: hidden ? 0.45 : 1,
      }}
    >
      {selected ? (
        <div className="pts-block__chrome" contentEditable={false}>
          <span className="pts-block__label">
            <GripVertical size={11} aria-hidden />
            {block.type}
          </span>
          <span className="pts-block__actions">
            <button
              type="button"
              aria-label="Move up"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                editing.onMove?.(block.id, -1);
              }}
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={index === total - 1}
              onClick={(e) => {
                e.stopPropagation();
                editing.onMove?.(block.id, 1);
              }}
            >
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              aria-label="Duplicate block"
              onClick={(e) => {
                e.stopPropagation();
                editing.onDuplicate?.(block.id);
              }}
            >
              <Copy size={12} />
            </button>
            <button
              type="button"
              aria-label="Hide block"
              onClick={(e) => {
                e.stopPropagation();
                editing.onToggleHidden?.(block.id);
              }}
            >
              <EyeOff size={12} />
            </button>
            <button
              type="button"
              aria-label="Delete block"
              onClick={(e) => {
                e.stopPropagation();
                editing.onDelete?.(block.id);
              }}
            >
              <Trash2 size={12} />
            </button>
          </span>
        </div>
      ) : null}
      {children}
    </section>
  );
}

function TemplateRendererImpl({
  config,
  breakpoint = "desktop",
  mode = "public",
  editing,
  onTrack,
  className,
  style,
}: TemplateRendererProps) {
  const { theme, layout, profile, blocks } = config;
  const rule = layout.responsive[breakpoint];

  const isGridOrBento = layout.type === "grid" || layout.type === "bento";
  let columns = 1;
  if (isGridOrBento) {
    if (layout.responsive?.[breakpoint]?.columns !== undefined) {
      columns = layout.responsive[breakpoint].columns;
    } else {
      // Default fallback values
      if (layout.type === "bento") {
        columns = breakpoint === "mobile" ? 1 : breakpoint === "tablet" ? 2 : 4;
      } else {
        columns = breakpoint === "mobile" ? 1 : 2;
      }
    }
  } else if (layout.type === "stack") {
    columns = 1;
  } else {
    // Standard default layout columns
    columns = breakpoint === "mobile" ? 1 : rule.columns;
  }

  const gridGap =
    layout.responsive?.[breakpoint]?.gap ??
    layout.responsive?.[breakpoint]?.gutter ??
    layout.gap ??
    theme.spacing.block;
  const alignItems = layout.responsive?.[breakpoint]?.alignItems ?? layout.alignItems ?? "stretch";
  const justifyItems =
    layout.responsive?.[breakpoint]?.justifyItems ?? layout.justifyItems ?? "stretch";
  const contentWidth =
    layout.responsive?.[breakpoint]?.contentWidth ??
    layout.contentWidth ??
    theme.spacing.contentWidth;

  const ctx = useMemo(
    () => ({
      theme,
      breakpoint,
      mode,
      selectedBlockId: editing?.selectedBlockId,
      onSelectBlock: editing?.onSelect,
      onInlineEdit: editing?.onInlineEdit,
      onTrack,
    }),
    [
      theme,
      breakpoint,
      mode,
      editing?.selectedBlockId,
      editing?.onSelect,
      editing?.onInlineEdit,
      onTrack,
    ],
  );

  const visibleBlocks = mode === "edit" ? blocks : blocks.filter((b) => isVisible(b, breakpoint));
  const motionConfig = getMotionConfig(config);
  const motionVars = motionCssVars(motionConfig.duration);
  const backgroundLayer = backgroundLayerStyle(theme);
  const textureLayer = textureStyle(theme.texture);

  return (
    <RenderProvider value={ctx}>
      <div
        className={cx("pts-page", className)}
        data-breakpoint={breakpoint}
        style={{
          ...themeToCssVars(theme),
          ...pageBackground(theme),
          ...motionVars,
          minHeight: "100%",
          width: "100%",
          position: "relative",
          overflowX: "clip",
          ...style,
        }}
        onClick={() => editing?.onSelect?.("")}
      >
        {backgroundLayer ? <div aria-hidden style={backgroundLayer} /> : null}
        {textureLayer ? <div aria-hidden style={textureLayer} /> : null}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: contentWidth + (columns > 1 ? 180 : 0),
            margin: "0 auto",
            padding: `${rule.padding + 12}px ${rule.padding}px ${rule.padding + 48}px`,
            display: "grid",
            gap: theme.spacing.section,
          }}
        >
          <ProfileHeader profile={profile} layout={layout} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: gridGap,
              alignItems: isGridOrBento ? alignItems : "start",
              justifyItems: isGridOrBento ? justifyItems : undefined,
            }}
          >
            {visibleBlocks.map((block, index) => {
              const Component = getBlockComponent(block.type);
              if (!Component) return null;

              // Pre-merge responsive overrides for the current breakpoint
              const mergedBlock = getMergedBlock(block, breakpoint);

              let span = 1;
              let rowSpan = 1;

              if (isGridOrBento) {
                let colSpan = 1;
                if (mergedBlock.layout.colSpan !== undefined) {
                  colSpan = mergedBlock.layout.colSpan;
                } else if (mergedBlock.layout.span !== undefined) {
                  colSpan = mergedBlock.layout.span;
                }
                span = columns === 1 ? 1 : Math.min(colSpan, columns);
                rowSpan = mergedBlock.layout.rowSpan ?? 1;
              } else {
                const wide =
                  mergedBlock.layout.width === "full" || (mergedBlock.layout.span ?? 2) >= 2;
                span = columns === 1 ? 1 : Math.min(wide ? 2 : 1, columns);
              }

              // Compute CSS order property dynamically
              const blockOrder =
                block.responsive?.[breakpoint]?.order !== undefined
                  ? block.responsive[breakpoint].order
                  : index;

              // Resolve motion for this block
              const bm = resolveBlockMotion(mergedBlock, motionConfig);
              const staggerDelay = bm.disabled ? 0 : Math.min(index, 12) * bm.stagger;
              const animStyle: CSSProperties = bm.disabled
                ? {}
                : { animationDelay: `${staggerDelay}ms` };

              // Sticky/floating polish classes
              const sticky = mergedBlock.layout.sticky;
              const floating = mergedBlock.layout.floating;
              const stickyClass = sticky?.enabled ? "pts-sticky-active" : "";
              const floatingClass = floating?.enabled ? "pts-floating-enter" : "";

              // Press feedback for interactive blocks
              const isInteractive =
                !!mergedBlock.content.url ||
                mergedBlock.type === "cta" ||
                mergedBlock.type === "buttonGroup";
              const pressClass = isInteractive && !bm.disabled ? "pts-press-feedback" : "";

              const innerClasses = cx(
                bm.entranceClass,
                bm.hoverClass,
                pressClass,
                stickyClass,
                floatingClass,
              );

              // In public mode, use scroll reveal for entrance animations
              const AnimWrapper =
                mode === "public" && bm.entranceClass
                  ? ScrollRevealWrapper
                  : ("div" as unknown as typeof ScrollRevealWrapper);

              return (
                <BlockFrame
                  key={block.id}
                  block={mergedBlock}
                  index={index}
                  total={visibleBlocks.length}
                  editing={editing}
                  span={span}
                  rowSpan={rowSpan}
                  order={blockOrder}
                >
                  <AnimWrapper className={innerClasses} style={animStyle}>
                    <Component block={mergedBlock} />
                  </AnimWrapper>
                </BlockFrame>
              );
            })}
          </div>

          {config.settings.showBranding ? (
            <footer
              style={{
                textAlign: "center",
                fontSize: 11.5,
                color: theme.colors.mutedText,
                opacity: 0.8,
              }}
            >
              Made with Premium Template Studio
            </footer>
          ) : null}
        </div>
      </div>
    </RenderProvider>
  );
}

export const TemplateRenderer = memo(TemplateRendererImpl);
