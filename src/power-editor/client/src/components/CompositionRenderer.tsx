import type { CSSProperties, ReactNode } from "react";
import { getBlock, type Breakpoint, type PageBlock, type PageConfig } from "../lib/editorCandidateModel";
import { resolveCompositionStyle, type Anchor, type CompositionBranchNode, type CompositionNode, type CompositionRootNode } from "../lib/compositionModel";
import "./composition-renderer.css";

type CompositionRendererProps = {
  page: PageConfig;
  composition: CompositionRootNode;
  breakpoint: Breakpoint;
  renderBlock: (block: PageBlock) => ReactNode;
};

function isBranch(node: CompositionNode): node is CompositionBranchNode {
  return node.kind !== "block";
}

function anchorPosition(anchor: Anchor, offsetX: number, offsetY: number): CSSProperties {
  const style: CSSProperties = { position: "absolute" };
  const [vertical, horizontal] = anchor.split("-") as ["top" | "center" | "bottom", "left" | "center" | "right"];
  if (vertical === "top") style.top = offsetY;
  if (vertical === "center") style.top = `calc(50% + ${offsetY}px)`;
  if (vertical === "bottom") style.bottom = offsetY;
  if (horizontal === "left") style.left = offsetX;
  if (horizontal === "center") style.left = `calc(50% + ${offsetX}px)`;
  if (horizontal === "right") style.right = offsetX;
  const translateX = horizontal === "center" ? "-50%" : "0";
  const translateY = vertical === "center" ? "-50%" : "0";
  style.transform = `translate(${translateX}, ${translateY})`;
  return style;
}

function nodeStyle(node: CompositionNode, breakpoint: Breakpoint): CSSProperties {
  const resolved = resolveCompositionStyle(node.style, breakpoint);
  const style: CSSProperties = {
    order: resolved.order,
    width: resolved.width === undefined ? undefined : `${resolved.width}%`,
    maxWidth: resolved.maxWidth === undefined ? undefined : `${resolved.maxWidth}%`,
    minWidth: resolved.minWidth === undefined ? undefined : `${resolved.minWidth}%`,
    minHeight: resolved.minHeight,
    padding: resolved.padding,
    gap: resolved.gap,
    alignItems: resolved.align === "start" ? "flex-start" : resolved.align === "end" ? "flex-end" : resolved.align,
    justifyContent: resolved.justify === "start" ? "flex-start" : resolved.justify === "end" ? "flex-end" : resolved.justify === "between" ? "space-between" : resolved.justify,
    overflow: resolved.overflow,
  };
  if (node.kind === "section" && resolved.heightMode === "viewport") style.minHeight = `${resolved.minViewportHeight ?? resolved.viewportHeight ?? 100}%`;
  if (node.kind === "grid" && resolved.grid) {
    style.gridTemplateColumns = `repeat(${resolved.grid.columns}, minmax(0, 1fr))`;
    if (resolved.grid.rows) style.gridTemplateRows = `repeat(${resolved.grid.rows}, minmax(0, auto))`;
    style.gridAutoFlow = resolved.grid.autoFlow;
  }
  if (node.kind === "row" && resolved.split) {
    const collapseForMobile = breakpoint === "mobile" && resolved.split.collapse !== "preserve";
    style.gridTemplateColumns = collapseForMobile ? "minmax(0, 1fr)" : `${resolved.split.tracks[0]}fr ${resolved.split.tracks[1]}fr`;
    style.direction = resolved.split.direction === "row-reverse" ? "rtl" : undefined;
  }
  if (resolved.placement) {
    style.gridColumn = `${resolved.placement.columnStart ?? "auto"} / span ${resolved.placement.columnSpan ?? 1}`;
    if (resolved.placement.rowStart) style.gridRow = `${resolved.placement.rowStart} / span ${resolved.placement.rowSpan ?? 1}`;
  }
  const position = resolved.position;
  if (position?.positionMode === "anchored" && position.anchor) Object.assign(style, anchorPosition(position.anchor, position.offsetX ?? 0, position.offsetY ?? 0));
  if (position?.positionMode === "free") {
    style.position = "absolute";
    style.left = `calc(${position.x ?? 0}% + ${position.offsetX ?? 0}px)`;
    style.top = `calc(${position.y ?? 0}% + ${position.offsetY ?? 0}px)`;
    style.transform = `translate(-50%, -50%) rotate(${position.rotation ?? 0}deg)`;
  }
  if (position?.zIndex !== undefined) style.zIndex = position.zIndex;
  if (node.kind === "fixed" && resolved.fixed) {
    style.position = "absolute";
    style.zIndex = resolved.fixed.zIndex;
    style.left = "50%";
    style.transform = "translateX(-50%)";
    style.width = resolved.fixed.width === undefined ? "calc(100% - 32px)" : `${resolved.fixed.width}%`;
    style.maxWidth = resolved.fixed.maxWidth;
    if (resolved.fixed.edge === "bottom") style.bottom = `calc(${resolved.fixed.inset}px + env(safe-area-inset-bottom))`;
    else style.top = `calc(${resolved.fixed.inset}px + env(safe-area-inset-top))`;
  }
  return style;
}

function legacyNodes(root: CompositionRootNode): { hero?: CompositionBranchNode; body?: CompositionBranchNode } | undefined {
  if (!root.children.every((node) => node.id === "legacy-hero" || node.id === "legacy-body")) return undefined;
  const hero = root.children.find((node) => node.id === "legacy-hero");
  const body = root.children.find((node) => node.id === "legacy-body");
  const nodes: { hero?: CompositionBranchNode; body?: CompositionBranchNode } = {};
  if (hero && isBranch(hero)) nodes.hero = hero;
  if (body && isBranch(body)) nodes.body = body;
  return nodes;
}

function reservedFixedSpace(root: CompositionRootNode, breakpoint: Breakpoint): number {
  let reserved = 0;
  const visit = (node: CompositionNode) => {
    if (node.kind === "fixed") {
      const fixed = resolveCompositionStyle(node.style, breakpoint).fixed;
      if (fixed?.edge === "bottom" && fixed.reserveSpace) reserved = Math.max(reserved, fixed.inset + 86);
    }
    if (isBranch(node)) node.children.forEach(visit);
  };
  visit(root);
  return reserved;
}

export function CompositionRenderer({ page, composition, breakpoint, renderBlock }: CompositionRendererProps) {
  const renderNode = (node: CompositionNode): ReactNode => {
    const resolved = resolveCompositionStyle(node.style, breakpoint);
    if (!node.enabled || resolved.hidden) return null;
    if (node.kind === "block") {
      const block = getBlock(page, node.blockId);
      return block ? <div key={node.id} className="ep-composition-node ep-composition-block" style={nodeStyle(node, breakpoint)}>{renderBlock(block)}</div> : null;
    }
    return <section key={node.id} className={`ep-composition-node ep-composition-${node.kind}`} style={nodeStyle(node, breakpoint)}>{node.children.map(renderNode)}</section>;
  };
  const legacy = legacyNodes(composition);
  const opener = <button className="ep-composition-canvas-action" type="button" onClick={(event) => { event.stopPropagation(); window.dispatchEvent(new Event("cripqer:open-composition")); }}>Layout</button>;
  if (legacy) {
    return <>{opener}{legacy.hero?.children.map((node) => node.kind === "block" ? getBlock(page, node.blockId) && <span key={node.id}>{renderBlock(getBlock(page, node.blockId)!)}</span> : renderNode(node))}<div className="ep-template-content">{legacy.body?.children.map((node) => node.kind === "block" ? getBlock(page, node.blockId) && <span key={node.id}>{renderBlock(getBlock(page, node.blockId)!)}</span> : renderNode(node))}</div></>;
  }
  return <>{opener}<div className="ep-composition-root" style={{ paddingBottom: reservedFixedSpace(composition, breakpoint) }}>{composition.children.map(renderNode)}</div></>;
}
