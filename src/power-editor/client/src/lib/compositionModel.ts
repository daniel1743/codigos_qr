import {
  allBlocks,
  clonePageConfig,
  hydratePageConfig as hydrateLegacyPageConfig,
  stableId,
  type Breakpoint,
  type PageBlock,
  type PageConfig,
} from "./editorCandidateModel";

export type CompositionBreakpoint = Breakpoint;
export type CompositionNodeKind = "root" | "section" | "container" | "stack" | "row" | "grid" | "column" | "overlay" | "fixed" | "block";
export type Anchor = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type PositionMode = "flow" | "anchored" | "free";
export type HeightMode = "content" | "minimum" | "viewport";
export type AutoFlow = "row" | "column" | "dense";
export type RowDirection = "row" | "row-reverse";
export type CollapseMode = "stack" | "stack-reverse" | "preserve";

export const COMPOSITION_LIMITS = {
  maxDepth: 6,
  maxNodes: 96,
  maxGridColumns: 6,
  maxGridRows: 12,
  minSplitTrack: 25,
  maxSplitTrack: 75,
  minWidth: 0,
  maxWidth: 100,
  minHeight: 0,
  maxOffsetPercent: 40,
  maxOffsetPixels: 160,
  minZIndex: 0,
  maxZIndex: 20,
} as const;

export type GridOverride = { columns?: number; rows?: number; autoFlow?: AutoFlow };
export type SplitOverride = { direction?: RowDirection; tracks?: readonly [number, number]; collapse?: CollapseMode; minColumnWidth?: number; maxColumnWidth?: number };
export type PositionOverride = { positionMode?: PositionMode; anchor?: Anchor; x?: number; y?: number; offsetX?: number; offsetY?: number; zIndex?: number; width?: number; height?: number; rotation?: number };
export type CompositionResponsive = { hidden?: boolean; order?: number; columns?: number; gap?: number; direction?: RowDirection; collapse?: CollapseMode; align?: "start" | "center" | "end" | "stretch"; justify?: "start" | "center" | "end" | "between"; width?: number; maxWidth?: number; minWidth?: number; minHeight?: number; position?: PositionOverride; placement?: GridPlacement; grid?: GridOverride; split?: SplitOverride };
export type CompositionResponsiveMap = Partial<Record<CompositionBreakpoint, CompositionResponsive>>;
export type ResolvedCompositionStyle = CompositionStyle & Pick<CompositionResponsive, "hidden" | "order">;
export type GridPlacement = { columnStart?: number; columnSpan?: number; rowStart?: number; rowSpan?: number };
export type GridLayout = { columns: number; rows?: number; autoFlow?: AutoFlow; tracks?: { columns?: number[]; rows?: number[] } };
export type SplitLayout = { direction: RowDirection; tracks: readonly [number, number]; collapse: CollapseMode; minColumnWidth?: number; maxColumnWidth?: number };
export type Position = { positionMode: PositionMode; anchor?: Anchor; x?: number; y?: number; offsetX?: number; offsetY?: number; zIndex?: number; width?: number; height?: number; rotation?: number };
export type FixedLayout = { edge: "top" | "bottom"; inset: number; zIndex: number; safeArea: boolean; width?: number; maxWidth?: number; reserveSpace: boolean };
export type CompositionStyle = { width?: number; maxWidth?: number; minWidth?: number; minHeight?: number; padding?: number; gap?: number; align?: "start" | "center" | "end" | "stretch"; justify?: "start" | "center" | "end" | "between"; heightMode?: HeightMode; viewportHeight?: number; minViewportHeight?: number; verticalAlign?: "top" | "center" | "bottom"; overflow?: "visible" | "hidden" | "clip"; grid?: GridLayout; split?: SplitLayout; position?: Position; fixed?: FixedLayout; placement?: GridPlacement; responsive?: CompositionResponsiveMap };

export type CompositionNodeBase = { id: string; kind: CompositionNodeKind; enabled: boolean; locked?: boolean; name?: string; style?: CompositionStyle };
export type CompositionBranchNode = CompositionNodeBase & { kind: Exclude<CompositionNodeKind, "block">; children: CompositionNode[] };
export type BlockReferenceNode = CompositionNodeBase & { kind: "block"; blockId: string };
export type CompositionNode = CompositionBranchNode | BlockReferenceNode;
export type CompositionRootNode = CompositionBranchNode & { kind: "root" };
export type PageConfigV5 = Omit<PageConfig, "version"> & { version: 5 };
export type PageConfigV6 = Omit<PageConfig, "version"> & { version: 6; composition: CompositionRootNode };
export type HydratablePageConfig = PageConfig | PageConfigV6;

export type CompositionIssueCode = "invalid-root" | "duplicate-node-id" | "missing-block" | "duplicate-block-ref" | "invalid-child" | "max-depth" | "max-nodes" | "invalid-grid" | "invalid-grid-placement" | "invalid-split" | "invalid-position" | "invalid-fixed" | "invalid-responsive" | "invalid-node" | "operation" | "not-flattenable";
export type CompositionIssue = { code: CompositionIssueCode; nodeId?: string; path: string[]; message: string };
export type CompositionOperationResult = { ok: boolean; config: PageConfigV6; issues: CompositionIssue[] };
export type CompositionLookup = { node: CompositionNode; parent?: CompositionBranchNode; index: number; path: string[] };
export type FlattenResult = { ok: true; config: PageConfigV5; issues: [] } | { ok: false; config: PageConfigV6; issues: CompositionIssue[] };

const branchKinds = new Set<CompositionBranchNode["kind"]>(["root", "section", "container", "stack", "row", "grid", "column", "overlay", "fixed"]);
const anchors = new Set<Anchor>(["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"]);
const responsiveKeys: CompositionBreakpoint[] = ["mobile", "tablet", "desktop"];
const allowedChildren: Record<CompositionBranchNode["kind"], ReadonlySet<CompositionNodeKind>> = {
  root: new Set(["section", "container", "stack", "row", "grid", "overlay", "fixed", "block"]),
  section: new Set(["container", "stack", "row", "grid", "column", "overlay", "fixed", "block"]),
  container: new Set(["container", "stack", "row", "grid", "column", "overlay", "fixed", "block"]),
  stack: new Set(["container", "stack", "row", "grid", "column", "overlay", "fixed", "block"]),
  row: new Set(["column"]),
  grid: new Set(["container", "stack", "row", "column", "block"]),
  column: new Set(["container", "stack", "row", "grid", "overlay", "block"]),
  overlay: new Set(["container", "stack", "row", "grid", "column", "block"]),
  fixed: new Set(["container", "stack", "row", "column", "block"]),
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneV6(config: PageConfigV6): PageConfigV6 {
  return deepClone(config);
}

function isBranchNode(node: CompositionNode): node is CompositionBranchNode {
  return branchKinds.has(node.kind as CompositionBranchNode["kind"]);
}

function createRef(blockId: string, enabled = true): BlockReferenceNode {
  return { id: `ref-${blockId}`, kind: "block", enabled, blockId };
}

function operationIssue(message: string, nodeId?: string): CompositionIssue {
  return nodeId ? { code: "operation", nodeId, path: [], message } : { code: "operation", path: [], message };
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function mergeResponsive(base: CompositionStyle, patch?: CompositionResponsive): CompositionStyle {
  if (!patch) return deepClone(base);
  const { grid, split, position, placement, ...flat } = patch;
  return {
    ...base,
    ...flat,
    ...(grid ? { grid: { ...base.grid, ...grid } as GridLayout } : {}),
    ...(split ? { split: { ...base.split, ...split } as SplitLayout } : {}),
    ...(position ? { position: { ...base.position, ...position } as Position } : {}),
    ...(placement ? { placement: { ...base.placement, ...placement } as GridPlacement } : {}),
  };
}

export function resolveCompositionStyle(style: CompositionStyle | undefined, breakpoint: CompositionBreakpoint): ResolvedCompositionStyle {
  const source = style ? deepClone(style) : {};
  const { responsive, ...base } = source;
  const chain: CompositionBreakpoint[] = breakpoint === "mobile" ? ["mobile"] : breakpoint === "tablet" ? ["mobile", "tablet"] : ["mobile", "tablet", "desktop"];
  return chain.reduce<CompositionStyle>((result, key) => mergeResponsive(result, responsive?.[key]), base) as ResolvedCompositionStyle;
}

function normalizeToV5(input: PageConfig): PageConfigV5 {
  const raw = clonePageConfig(input);
  const legacy = hydrateLegacyPageConfig(raw);
  const { composition: _composition, ...withoutComposition } = legacy as PageConfig & { composition?: unknown };
  return { ...withoutComposition, version: 5 };
}

export function upgradeV5ToV6(input: PageConfig): PageConfigV6 {
  const legacy = normalizeToV5(input);
  const blocks = allBlocks(legacy);
  const banner = blocks.find((block) => block.type === "banner" && block.enabled);
  const nonBannerBlocks = blocks.filter((block) => block.id !== banner?.id);
  const children: CompositionNode[] = [];
  if (banner) {
    children.push({ id: "legacy-hero", kind: "section", enabled: true, name: "Hero heredado", children: [createRef(banner.id)] });
  }
  children.push({ id: "legacy-body", kind: "stack", enabled: true, name: "Contenido heredado", children: nonBannerBlocks.map((block) => createRef(block.id)) });
  return { ...legacy, version: 6, composition: { id: "root", kind: "root", enabled: true, name: "Página", children } };
}

export function hydrateCompositionPageConfig(input: HydratablePageConfig): PageConfigV6 {
  const raw = deepClone(input);
  const composition = (raw as PageConfig & { composition?: CompositionRootNode }).composition;
  if (Number(raw.version) === 6 && composition) {
    const normalized = hydrateLegacyPageConfig(raw as PageConfig);
    const result: PageConfigV6 = { ...(normalized as Omit<PageConfig, "version">), version: 6, composition: deepClone(composition) };
    const issues = validateComposition(result);
    return issues.length ? upgradeV5ToV6(normalized) : result;
  }
  return upgradeV5ToV6(raw as PageConfig);
}

function isLegacyComposition(root: CompositionRootNode): boolean {
  return root.children.every((node) => node.id === "legacy-hero" || node.id === "legacy-body");
}

function pruneCompositionReferences(root: CompositionRootNode, validBlockIds: Set<string>): CompositionRootNode {
  const usedBlockIds = new Set<string>();
  const prune = (node: CompositionNode): CompositionNode | undefined => {
    if (node.kind === "block") {
      if (!validBlockIds.has(node.blockId) || usedBlockIds.has(node.blockId)) return undefined;
      usedBlockIds.add(node.blockId);
      return node;
    }
    node.children = node.children.flatMap((child) => {
      const next = prune(child);
      return next ? [next] : [];
    });
    return node;
  };
  return prune(deepClone(root)) as CompositionRootNode;
}

function collectReferencedBlockIds(root: CompositionRootNode): Set<string> {
  const refs = new Set<string>();
  const visit = (node: CompositionNode) => {
    if (node.kind === "block") {
      refs.add(node.blockId);
      return;
    }
    node.children.forEach(visit);
  };
  visit(root);
  return refs;
}

/**
 * Conserva una composición válida cuando las herramientas V5 añaden o eliminan
 * bloques. La forma legacy se vuelve a derivar para que el orden clásico siga
 * respondiendo al canvas; en una composición personalizada sólo se podan refs
 * desaparecidas y se anexan refs nuevas en un contenedor de fallback.
 */
export function reconcileCompositionPageConfig(input: HydratablePageConfig): PageConfigV6 {
  const raw = deepClone(input);
  const sourceComposition = (raw as PageConfig & { composition?: CompositionRootNode }).composition;
  if (Number(raw.version) !== 6 || !sourceComposition) return upgradeV5ToV6(raw as PageConfig);
  const legacy = normalizeToV5(raw as PageConfig);
  if (isLegacyComposition(sourceComposition)) return upgradeV5ToV6(legacy);
  const root = pruneCompositionReferences(sourceComposition, new Set(legacy.blocks.map((block) => block.id)));
  const existing = collectReferencedBlockIds(root);
  const fallback = findCompositionNode(root, "legacy-body")?.node;
  const destination = fallback && isBranchNode(fallback) ? fallback : root;
  allBlocks(legacy).filter((block) => !existing.has(block.id)).forEach((block) => {
    destination.children.push({ id: `ref-${block.id}-${stableId("composition")}`, kind: "block", enabled: true, blockId: block.id });
  });
  const candidate: PageConfigV6 = { ...legacy, version: 6, composition: root };
  return validateComposition(candidate).length ? upgradeV5ToV6(legacy) : candidate;
}

export function findCompositionNode(root: CompositionRootNode, nodeId: string): CompositionLookup | undefined {
  const visit = (node: CompositionNode, parent: CompositionBranchNode | undefined, index: number, path: string[]): CompositionLookup | undefined => {
    const nextPath = [...path, node.id];
    if (node.id === nodeId) return parent ? { node, parent, index, path: nextPath } : { node, index, path: nextPath };
    if (!isBranchNode(node)) return undefined;
    for (let childIndex = 0; childIndex < node.children.length; childIndex += 1) {
      const child = node.children[childIndex];
      if (!child) continue;
      const found = visit(child, node, childIndex, nextPath);
      if (found) return found;
    }
    return undefined;
  };
  return visit(root, undefined, 0, []);
}

function subtreeContains(node: CompositionNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  return isBranchNode(node) && node.children.some((child) => subtreeContains(child, targetId));
}

function validateNumber(value: unknown, min: number, max: number, issues: CompositionIssue[], nodeId: string, path: string[], label: string, integer = false) {
  if (value === undefined) return;
  const valid = integer ? isIntegerInRange(value, min, max) : isNumberInRange(value, min, max);
  if (!valid) issues.push({ code: "invalid-node", nodeId, path, message: `${label} debe estar entre ${min} y ${max}.` });
}

function validateSplit(split: SplitLayout | SplitOverride | undefined, issues: CompositionIssue[], nodeId: string, path: string[]) {
  if (!split) return;
  if (split.direction !== undefined && split.direction !== "row" && split.direction !== "row-reverse") issues.push({ code: "invalid-split", nodeId, path, message: "La dirección del split no es válida." });
  if (split.collapse !== undefined && !["stack", "stack-reverse", "preserve"].includes(split.collapse)) issues.push({ code: "invalid-split", nodeId, path, message: "El colapso del split no es válido." });
  if (split.tracks) {
    const [first, second] = split.tracks;
    if (!isNumberInRange(first, COMPOSITION_LIMITS.minSplitTrack, COMPOSITION_LIMITS.maxSplitTrack) || !isNumberInRange(second, COMPOSITION_LIMITS.minSplitTrack, COMPOSITION_LIMITS.maxSplitTrack) || first + second !== 100) {
      issues.push({ code: "invalid-split", nodeId, path, message: "Los tracks deben sumar 100 y estar entre 25 y 75." });
    }
  }
  validateNumber(split.minColumnWidth, 0, Number.MAX_SAFE_INTEGER, issues, nodeId, path, "El ancho mínimo");
  validateNumber(split.maxColumnWidth, 0, Number.MAX_SAFE_INTEGER, issues, nodeId, path, "El ancho máximo");
}

function validatePosition(position: Position | PositionOverride | undefined, hasOverlayAncestor: boolean, issues: CompositionIssue[], nodeId: string, path: string[]) {
  if (!position) return;
  if (position.positionMode === "anchored" && (!position.anchor || !anchors.has(position.anchor))) issues.push({ code: "invalid-position", nodeId, path, message: "Una posición anclada requiere un anchor válido." });
  if (position.positionMode === "free") {
    if (!hasOverlayAncestor) issues.push({ code: "invalid-position", nodeId, path, message: "La posición libre sólo está permitida dentro de un overlay." });
    if (!isNumberInRange(position.x, 0, 100) || !isNumberInRange(position.y, 0, 100)) issues.push({ code: "invalid-position", nodeId, path, message: "La posición libre requiere x e y entre 0 y 100." });
  }
  validateNumber(position.offsetX, -COMPOSITION_LIMITS.maxOffsetPixels, COMPOSITION_LIMITS.maxOffsetPixels, issues, nodeId, path, "offsetX");
  validateNumber(position.offsetY, -COMPOSITION_LIMITS.maxOffsetPixels, COMPOSITION_LIMITS.maxOffsetPixels, issues, nodeId, path, "offsetY");
  validateNumber(position.zIndex, COMPOSITION_LIMITS.minZIndex, COMPOSITION_LIMITS.maxZIndex, issues, nodeId, path, "zIndex", true);
  validateNumber(position.width, COMPOSITION_LIMITS.minWidth, COMPOSITION_LIMITS.maxWidth, issues, nodeId, path, "Ancho");
  validateNumber(position.height, COMPOSITION_LIMITS.minHeight, COMPOSITION_LIMITS.maxWidth, issues, nodeId, path, "Alto");
}

function validateStyle(style: CompositionStyle | undefined, node: CompositionNode, hasOverlayAncestor: boolean, issues: CompositionIssue[], path: string[]) {
  if (!style) return;
  const nodeId = node.id;
  validateNumber(style.width, COMPOSITION_LIMITS.minWidth, COMPOSITION_LIMITS.maxWidth, issues, nodeId, path, "Ancho");
  validateNumber(style.maxWidth, COMPOSITION_LIMITS.minWidth, COMPOSITION_LIMITS.maxWidth, issues, nodeId, path, "Ancho máximo");
  validateNumber(style.minWidth, COMPOSITION_LIMITS.minWidth, COMPOSITION_LIMITS.maxWidth, issues, nodeId, path, "Ancho mínimo");
  validateNumber(style.minHeight, COMPOSITION_LIMITS.minHeight, Number.MAX_SAFE_INTEGER, issues, nodeId, path, "Alto mínimo");
  validateNumber(style.padding, 0, Number.MAX_SAFE_INTEGER, issues, nodeId, path, "Padding");
  validateNumber(style.gap, 0, Number.MAX_SAFE_INTEGER, issues, nodeId, path, "Gap");
  if (style.heightMode === "viewport") {
    validateNumber(style.viewportHeight, 1, 100, issues, nodeId, path, "Altura viewport");
    validateNumber(style.minViewportHeight, 1, 100, issues, nodeId, path, "Altura viewport mínima");
  }
  const grid = style.grid;
  if (grid) {
    if (!isIntegerInRange(grid.columns, 1, COMPOSITION_LIMITS.maxGridColumns)) issues.push({ code: "invalid-grid", nodeId, path, message: "El grid debe tener entre 1 y 6 columnas." });
    if (grid.rows !== undefined && !isIntegerInRange(grid.rows, 1, COMPOSITION_LIMITS.maxGridRows)) issues.push({ code: "invalid-grid", nodeId, path, message: "El grid debe tener entre 1 y 12 filas." });
  }
  validateSplit(style.split, issues, nodeId, path);
  validatePosition(style.position, hasOverlayAncestor, issues, nodeId, path);
  if (style.fixed) {
    const fixed = style.fixed;
    if (!(["top", "bottom"] as const).includes(fixed.edge) || !isNumberInRange(fixed.inset, 0, Number.MAX_SAFE_INTEGER) || !isIntegerInRange(fixed.zIndex, COMPOSITION_LIMITS.minZIndex, COMPOSITION_LIMITS.maxZIndex) || fixed.safeArea !== true || fixed.reserveSpace !== true) {
      issues.push({ code: "invalid-fixed", nodeId, path, message: "Un fixed requiere edge, inset no negativo, zIndex válido, safeArea y reserveSpace." });
    }
  }
  if (style.responsive) {
    for (const [breakpoint, override] of Object.entries(style.responsive)) {
      if (!responsiveKeys.includes(breakpoint as CompositionBreakpoint) || !override) {
        issues.push({ code: "invalid-responsive", nodeId, path, message: "El breakpoint responsive no es válido." });
        continue;
      }
      validateNumber(override.width, 0, 100, issues, nodeId, path, `Ancho ${breakpoint}`);
      validateNumber(override.maxWidth, 0, 100, issues, nodeId, path, `Ancho máximo ${breakpoint}`);
      validateNumber(override.minWidth, 0, 100, issues, nodeId, path, `Ancho mínimo ${breakpoint}`);
      validateNumber(override.minHeight, 0, Number.MAX_SAFE_INTEGER, issues, nodeId, path, `Alto mínimo ${breakpoint}`);
      if (override.grid) {
        if (override.grid.columns !== undefined && !isIntegerInRange(override.grid.columns, 1, COMPOSITION_LIMITS.maxGridColumns)) issues.push({ code: "invalid-grid", nodeId, path, message: `Grid ${breakpoint} requiere 1–6 columnas.` });
        if (override.grid.rows !== undefined && !isIntegerInRange(override.grid.rows, 1, COMPOSITION_LIMITS.maxGridRows)) issues.push({ code: "invalid-grid", nodeId, path, message: `Grid ${breakpoint} requiere 1–12 filas.` });
      }
      validateSplit(override.split, issues, nodeId, path);
      validatePosition(override.position, hasOverlayAncestor, issues, nodeId, path);
    }
  }
}

function validateGridPlacement(node: CompositionNode, parent: CompositionBranchNode | undefined, issues: CompositionIssue[], path: string[]) {
  const hasPlacement = Boolean(node.style?.placement || Object.values(node.style?.responsive ?? {}).some((patch) => patch?.placement));
  if (!hasPlacement) return;
  if (parent?.kind !== "grid") {
    issues.push({ code: "invalid-grid-placement", nodeId: node.id, path, message: "La colocación sólo puede ser hija directa de un grid." });
    return;
  }
  for (const breakpoint of responsiveKeys) {
    const grid = resolveCompositionStyle(parent.style, breakpoint).grid;
    const placement = resolveCompositionStyle(node.style, breakpoint).placement;
    const columns = grid?.columns;
    const rows = grid?.rows;
    if (!columns || !placement) continue;
    const start = placement.columnStart ?? 1;
    const span = placement.columnSpan ?? 1;
    if (!isIntegerInRange(start, 1, columns) || !isIntegerInRange(span, 1, columns) || start + span - 1 > columns) issues.push({ code: "invalid-grid-placement", nodeId: node.id, path, message: `El placement excede las columnas en ${breakpoint}.` });
    if (rows && placement.rowStart !== undefined) {
      const rowStart = placement.rowStart;
      const rowSpan = placement.rowSpan ?? 1;
      if (!isIntegerInRange(rowStart, 1, rows) || !isIntegerInRange(rowSpan, 1, rows) || rowStart + rowSpan - 1 > rows) issues.push({ code: "invalid-grid-placement", nodeId: node.id, path, message: `El placement excede las filas en ${breakpoint}.` });
    }
  }
}

export function validateComposition(config: PageConfigV6): CompositionIssue[] {
  const issues: CompositionIssue[] = [];
  const ids = new Set<string>();
  const blockRefs = new Set<string>();
  const blockMap = new Map(config.blocks.map((block) => [block.id, block]));
  let count = 0;
  const visit = (node: CompositionNode, parent: CompositionBranchNode | undefined, depth: number, path: string[], hasOverlayAncestor: boolean, fixedAncestor?: CompositionBranchNode) => {
    count += 1;
    const currentPath = [...path, node.id];
    if (!node.id.trim()) issues.push({ code: "invalid-node", nodeId: node.id, path: currentPath, message: "Todo nodo requiere id." });
    if (ids.has(node.id)) issues.push({ code: "duplicate-node-id", nodeId: node.id, path: currentPath, message: "El id estructural está duplicado." });
    ids.add(node.id);
    if (depth > COMPOSITION_LIMITS.maxDepth) issues.push({ code: "max-depth", nodeId: node.id, path: currentPath, message: "Se excedió la profundidad máxima de seis niveles bajo root." });
    if (parent && !allowedChildren[parent.kind].has(node.kind)) issues.push({ code: "invalid-child", nodeId: node.id, path: currentPath, message: `${node.kind} no es hijo válido de ${parent.kind}.` });
    validateStyle(node.style, node, hasOverlayAncestor, issues, currentPath);
    validateGridPlacement(node, parent, issues, currentPath);
    if (node.kind === "block") {
      if (!node.blockId || !blockMap.has(node.blockId)) issues.push({ code: "missing-block", nodeId: node.id, path: currentPath, message: "La referencia apunta a un bloque inexistente." });
      if (blockRefs.has(node.blockId)) issues.push({ code: "duplicate-block-ref", nodeId: node.id, path: currentPath, message: "Un bloque sólo puede referenciarse una vez." });
      blockRefs.add(node.blockId);
      if (fixedAncestor) {
        const block = blockMap.get(node.blockId);
        if (block && !["links", "booking", "contact"].includes(block.type)) issues.push({ code: "invalid-fixed", nodeId: fixedAncestor.id, path: currentPath, message: "Un contenedor fijo sólo puede incluir CTA o contacto existentes." });
      }
      return;
    }
    if (!Array.isArray(node.children)) {
      issues.push({ code: "invalid-node", nodeId: node.id, path: currentPath, message: "Un nodo estructural requiere children." });
      return;
    }
    const nextOverlay = hasOverlayAncestor || node.kind === "overlay";
    const nextFixed = node.kind === "fixed" ? node : fixedAncestor;
    node.children.forEach((child, index) => visit(child, node, depth + 1, [...currentPath, String(index)], nextOverlay, nextFixed));
  };
  if (!config.composition || config.composition.kind !== "root") {
    return [{ code: "invalid-root", path: [], message: "La composición debe tener una única raíz kind root." }];
  }
  visit(config.composition, undefined, 0, [], false);
  if (count > COMPOSITION_LIMITS.maxNodes) issues.push({ code: "max-nodes", path: [config.composition.id], message: "Se excedió el máximo de 96 nodos." });
  return issues;
}

function withValidatedMutation(config: PageConfigV6, mutate: (draft: PageConfigV6) => CompositionIssue | undefined): CompositionOperationResult {
  const draft = cloneV6(config);
  const operationFailure = mutate(draft);
  if (operationFailure) return { ok: false, config, issues: [operationFailure] };
  const issues = validateComposition(draft);
  return issues.length ? { ok: false, config, issues } : { ok: true, config: draft, issues: [] };
}

export function insertCompositionNode(config: PageConfigV6, parentId: string, index: number, node: CompositionNode): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    const parent = findCompositionNode(draft.composition, parentId);
    if (!parent || !isBranchNode(parent.node)) return operationIssue("No existe un contenedor destino válido.", parentId);
    if (!allowedChildren[parent.node.kind].has(node.kind)) return operationIssue(`${node.kind} no puede insertarse en ${parent.node.kind}.`, node.id);
    if (findCompositionNode(draft.composition, node.id)) return operationIssue("El id de nodo ya existe.", node.id);
    parent.node.children.splice(Math.max(0, Math.min(parent.node.children.length, index)), 0, deepClone(node));
    return undefined;
  });
}

export function removeCompositionNode(config: PageConfigV6, nodeId: string): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    const found = findCompositionNode(draft.composition, nodeId);
    if (!found?.parent) return operationIssue("La raíz no puede eliminarse.", nodeId);
    found.parent.children.splice(found.index, 1);
    return undefined;
  });
}

export function moveCompositionNode(config: PageConfigV6, nodeId: string, parentId: string, index: number): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    const source = findCompositionNode(draft.composition, nodeId);
    const destination = findCompositionNode(draft.composition, parentId);
    if (!source?.parent) return operationIssue("La raíz no puede moverse.", nodeId);
    if (!destination || !isBranchNode(destination.node)) return operationIssue("No existe un destino estructural válido.", parentId);
    if (subtreeContains(source.node, parentId)) return operationIssue("No se puede crear un ciclo en la composición.", nodeId);
    if (!allowedChildren[destination.node.kind].has(source.node.kind)) return operationIssue(`${source.node.kind} no puede moverse a ${destination.node.kind}.`, nodeId);
    source.parent.children.splice(source.index, 1);
    const refreshedDestination = findCompositionNode(draft.composition, parentId);
    if (!refreshedDestination || !isBranchNode(refreshedDestination.node)) return operationIssue("El destino desapareció durante el movimiento.", parentId);
    refreshedDestination.node.children.splice(Math.max(0, Math.min(refreshedDestination.node.children.length, index)), 0, source.node);
    return undefined;
  });
}

export function wrapCompositionNodes(config: PageConfigV6, nodeIds: string[], wrapper: Omit<CompositionBranchNode, "children">): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    if (!nodeIds.length || wrapper.kind === "root") return operationIssue("Selecciona nodos hermanos y un wrapper estructural válido.", wrapper.id);
    if (findCompositionNode(draft.composition, wrapper.id)) return operationIssue("El id del wrapper ya existe.", wrapper.id);
    const found = nodeIds.map((id) => findCompositionNode(draft.composition, id));
    if (found.some((item) => !item?.parent)) return operationIssue("La raíz no puede envolverse.");
    const parent = found[0]?.parent;
    if (!parent || found.some((item) => item?.parent?.id !== parent.id)) return operationIssue("Sólo se pueden envolver nodos hermanos.");
    if (!allowedChildren[parent.kind].has(wrapper.kind) || found.some((item) => !item || !allowedChildren[wrapper.kind].has(item.node.kind))) return operationIssue("El wrapper no admite esta combinación de hijos.", wrapper.id);
    const ordered = [...found].filter((item): item is CompositionLookup & { parent: CompositionBranchNode } => Boolean(item?.parent)).sort((a, b) => a.index - b.index);
    const selectedIds = new Set(nodeIds);
    const firstIndex = ordered[0]?.index ?? 0;
    const children = ordered.map((item) => item.node);
    parent.children = parent.children.filter((child) => !selectedIds.has(child.id));
    parent.children.splice(firstIndex, 0, { ...deepClone(wrapper), children });
    return undefined;
  });
}

export function unwrapCompositionNode(config: PageConfigV6, nodeId: string): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    const found = findCompositionNode(draft.composition, nodeId);
    if (!found?.parent || !isBranchNode(found.node) || found.node.kind === "root") return operationIssue("Sólo puede desenvolverse un contenedor no raíz.", nodeId);
    if (found.node.children.some((child) => !allowedChildren[found.parent!.kind].has(child.kind))) return operationIssue("El padre no admite todos los hijos del wrapper.", nodeId);
    found.parent.children.splice(found.index, 1, ...found.node.children);
    return undefined;
  });
}

function mergeStyle(base: CompositionStyle | undefined, patch: Partial<CompositionStyle>): CompositionStyle {
  return {
    ...base,
    ...patch,
    ...(patch.grid ? { grid: { ...base?.grid, ...patch.grid } as GridLayout } : {}),
    ...(patch.split ? { split: { ...base?.split, ...patch.split } as SplitLayout } : {}),
    ...(patch.position ? { position: { ...base?.position, ...patch.position } as Position } : {}),
    ...(patch.placement ? { placement: { ...base?.placement, ...patch.placement } } : {}),
    ...(patch.responsive ? { responsive: { ...base?.responsive, ...patch.responsive } } : {}),
  };
}

export function setCompositionNodeStyle(config: PageConfigV6, nodeId: string, patch: Partial<CompositionStyle>): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    const found = findCompositionNode(draft.composition, nodeId);
    if (!found) return operationIssue("No existe el nodo que se desea editar.", nodeId);
    found.node.style = mergeStyle(found.node.style, patch);
    return undefined;
  });
}

export function setCompositionNodeResponsive(config: PageConfigV6, nodeId: string, breakpoint: CompositionBreakpoint, patch: CompositionResponsive): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    const found = findCompositionNode(draft.composition, nodeId);
    if (!found) return operationIssue("No existe el nodo que se desea editar.", nodeId);
    found.node.style = mergeStyle(found.node.style, { responsive: { ...found.node.style?.responsive, [breakpoint]: { ...found.node.style?.responsive?.[breakpoint], ...patch, grid: patch.grid ? { ...found.node.style?.responsive?.[breakpoint]?.grid, ...patch.grid } : found.node.style?.responsive?.[breakpoint]?.grid, split: patch.split ? { ...found.node.style?.responsive?.[breakpoint]?.split, ...patch.split } : found.node.style?.responsive?.[breakpoint]?.split, position: patch.position ? { ...found.node.style?.responsive?.[breakpoint]?.position, ...patch.position } : found.node.style?.responsive?.[breakpoint]?.position } } });
    return undefined;
  });
}

export function resetCompositionNodePosition(config: PageConfigV6, nodeId: string, breakpoint?: CompositionBreakpoint): CompositionOperationResult {
  return withValidatedMutation(config, (draft) => {
    const found = findCompositionNode(draft.composition, nodeId);
    if (!found) return operationIssue("No existe el nodo que se desea restablecer.", nodeId);
    if (breakpoint) {
      found.node.style = mergeStyle(found.node.style, { responsive: { ...found.node.style?.responsive, [breakpoint]: { ...found.node.style?.responsive?.[breakpoint], position: { positionMode: "flow" } } } });
    } else if (found.node.style?.position) {
      const { position: _position, ...style } = found.node.style;
      found.node.style = style;
    }
    return undefined;
  });
}

export function appendBlockReference(config: PageConfigV6, blockId: string, parentId = "legacy-body"): CompositionOperationResult {
  const block = config.blocks.find((item) => item.id === blockId);
  if (!block) return { ok: false, config, issues: [operationIssue("El bloque no existe.", blockId)] };
  return insertCompositionNode(config, parentId, Number.MAX_SAFE_INTEGER, { id: `ref-${blockId}-${stableId("composition")}`, kind: "block", enabled: true, blockId });
}

function isFlattenableStyle(style: CompositionStyle | undefined): boolean {
  if (!style) return true;
  const { position, responsive, ...rest } = style;
  if (Object.keys(rest).length > 0) return false;
  if (position && position.positionMode && position.positionMode !== "flow") return false;
  return !responsive || Object.values(responsive).every((override) => !override || Object.keys(override).every((key) => key === "position" && override.position?.positionMode === "flow"));
}

export function flattenForLegacy(config: PageConfigV6): FlattenResult {
  const issues = validateComposition(config);
  if (issues.length) return { ok: false, config, issues };
  const refs: string[] = [];
  let notFlattenable: CompositionIssue | undefined;
  const visit = (node: CompositionNode, path: string[]) => {
    if (notFlattenable) return;
    if (["grid", "overlay", "fixed", "row"].includes(node.kind) || !isFlattenableStyle(node.style)) {
      notFlattenable = { code: "not-flattenable", nodeId: node.id, path, message: "La composición contiene layout que no puede aplanarse sin pérdida." };
      return;
    }
    if (node.kind === "block") {
      refs.push(node.blockId);
      return;
    }
    node.children.forEach((child, index) => visit(child, [...path, node.id, String(index)]));
  };
  visit(config.composition, []);
  if (notFlattenable) return { ok: false, config, issues: [notFlattenable] };
  if (refs.length !== config.blocks.length) return { ok: false, config, issues: [{ code: "not-flattenable", path: [config.composition.id], message: "No se pueden restaurar bloques sin referencia de forma silenciosa." }] };
  const byId = new Map(config.blocks.map((block) => [block.id, block]));
  const blocks = refs.map((id, index) => ({ ...(byId.get(id) as PageBlock), order: index }));
  const { composition: _composition, ...legacy } = config;
  return { ok: true, config: { ...legacy, version: 5, blocks }, issues: [] };
}
