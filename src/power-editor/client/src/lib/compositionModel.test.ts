import { describe, expect, it } from "vitest";
import { createAllBlocksV5Fixture, createLegacyV6Fixture, createV5Fixture } from "./compositionFixtures";
import { compositionFromPreset } from "../components/CompositionPanel";
import { COMPOSITION_LIMITS, appendBlockReference, findCompositionNode, flattenForLegacy, hydrateCompositionPageConfig, moveCompositionNode, reconcileCompositionPageConfig, resolveCompositionStyle, setCompositionNodeResponsive, setCompositionNodeStyle, unwrapCompositionNode, upgradeV5ToV6, validateComposition, wrapCompositionNodes, type CompositionBranchNode, type CompositionNode, type PageConfigV6 } from "./compositionModel";

function ref(id: string): CompositionNode {
  return { id: `ref-${id}`, kind: "block", enabled: true, blockId: id };
}

function withRoot(children: CompositionNode[]): PageConfigV6 {
  const page = createV5Fixture();
  return { ...page, version: 6, composition: { id: "root", kind: "root", enabled: true, children } };
}

describe("compositionModel", () => {
  it("hidrata V5 sin mutar el input y preserva bloques/props/orden", () => {
    const input = createV5Fixture();
    const before = JSON.stringify(input);
    const result = hydrateCompositionPageConfig(input);
    expect(result.version).toBe(6);
    expect(JSON.stringify(input)).toBe(before);
    expect(result.blocks).toEqual(input.blocks);
    expect(findCompositionNode(result.composition, "legacy-hero")).toBeDefined();
  });

  it("referencia los veinticinco tipos de bloque una sola vez", () => {
    const input = createAllBlocksV5Fixture();
    const result = upgradeV5ToV6(input);
    const refs: string[] = [];
    const visit = (node: CompositionNode) => {
      if (node.kind === "block") refs.push(node.blockId);
      else node.children.forEach(visit);
    };
    visit(result.composition);
    expect(refs).toHaveLength(25);
    expect(new Set(refs).size).toBe(25);
    expect(validateComposition(result)).toEqual([]);
  });

  it("fusiona responsive en precedencia base, móvil, tablet y desktop", () => {
    const result = resolveCompositionStyle({ gap: 8, grid: { columns: 3, rows: 2 }, responsive: { mobile: { gap: 12, grid: { columns: 1 } }, tablet: { grid: { rows: 3 } }, desktop: { gap: 20 } } }, "desktop");
    expect(result.gap).toBe(20);
    expect(result.grid).toMatchObject({ columns: 1, rows: 3 });
  });

  it("acepta grid válido y rechaza span fuera de columnas", () => {
    const valid = withRoot([{ id: "grid", kind: "grid", enabled: true, style: { grid: { columns: 3, rows: 2 } }, children: [{ ...ref("heading"), style: { placement: { columnStart: 2, columnSpan: 2 } } }] }]);
    expect(validateComposition(valid)).toEqual([]);
    const invalid = structuredClone(valid);
    const child = (invalid.composition.children[0]! as CompositionBranchNode).children[0];
    if (child) child.style = { placement: { columnStart: 3, columnSpan: 2 } };
    expect(validateComposition(invalid).some((issue) => issue.code === "invalid-grid-placement")).toBe(true);
  });

  it("valida split y prohíbe tracks que no suman cien", () => {
    const page = withRoot([{ id: "split", kind: "row", enabled: true, style: { split: { direction: "row", tracks: [40, 60], collapse: "stack" } }, children: [{ id: "left", kind: "column", enabled: true, children: [ref("heading")] }, { id: "right", kind: "column", enabled: true, children: [ref("links")] }] }]);
    expect(validateComposition(page)).toEqual([]);
    const invalid = structuredClone(page);
    const split = invalid.composition.children[0]! as CompositionBranchNode;
    split.style = { split: { direction: "row", tracks: [30, 60], collapse: "stack" } };
    expect(validateComposition(invalid).some((issue) => issue.code === "invalid-split")).toBe(true);
  });

  it("permite posición libre sólo debajo de overlay", () => {
    const outside = withRoot([{ ...ref("heading"), style: { position: { positionMode: "free", x: 30, y: 40 } } }]);
    expect(validateComposition(outside).some((issue) => issue.code === "invalid-position")).toBe(true);
    const inside = withRoot([{ id: "overlay", kind: "overlay", enabled: true, children: [{ ...ref("heading"), style: { position: { positionMode: "free", x: 30, y: 40, zIndex: 4 } } }] }]);
    expect(validateComposition(inside)).toEqual([]);
  });

  it("exige CTA/contacto, safe-area y reserva de espacio en fixed", () => {
    const valid = withRoot([{ id: "fixed", kind: "fixed", enabled: true, style: { fixed: { edge: "bottom", inset: 16, zIndex: 16, safeArea: true, reserveSpace: true } }, children: [ref("links")] }]);
    expect(validateComposition(valid)).toEqual([]);
    const invalid = structuredClone(valid);
    const fixed = invalid.composition.children[0]! as CompositionBranchNode;
    fixed.children = [ref("heading")];
    expect(validateComposition(invalid).some((issue) => issue.code === "invalid-fixed")).toBe(true);
  });

  it("rechaza una segunda referencia al mismo bloque", () => {
    const invalid = withRoot([ref("heading"), { id: "stack", kind: "stack", enabled: true, children: [ref("heading")] }]);
    expect(validateComposition(invalid).some((issue) => issue.code === "duplicate-block-ref")).toBe(true);
  });

  it("rechaza profundidad superior al límite y no muta cuando falla", () => {
    let node: CompositionNode = ref("heading");
    for (let depth = 0; depth <= COMPOSITION_LIMITS.maxDepth; depth += 1) node = { id: `stack-${depth}`, kind: "stack", enabled: true, children: [node] };
    expect(validateComposition(withRoot([node])).some((issue) => issue.code === "max-depth")).toBe(true);
    const source = createLegacyV6Fixture();
    const before = JSON.stringify(source);
    const result = moveCompositionNode(source, "legacy-body", "legacy-body", 0);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("envuelve y desenvuelve hermanos sin alterar los bloques", () => {
    const source = createLegacyV6Fixture();
    const beforeBlocks = structuredClone(source.blocks);
    const wrapped = wrapCompositionNodes(source, ["ref-heading", "ref-subtitle"], { id: "copy-stack", kind: "stack", enabled: true, name: "Copy" });
    expect(wrapped.ok).toBe(true);
    const unwrapped = unwrapCompositionNode(wrapped.config, "copy-stack");
    expect(unwrapped.ok).toBe(true);
    expect(unwrapped.config.blocks).toEqual(beforeBlocks);
    const body = findCompositionNode(unwrapped.config.composition, "legacy-body")?.node;
    expect(body?.kind === "stack" && body.children.map((child) => child.id)).toContain("ref-heading");
  });

  it("mantiene el merge profundo de breakpoint y permite restablecer una posición", () => {
    const source = withRoot([{ id: "overlay", kind: "overlay", enabled: true, children: [ref("profile")] }]);
    const first = setCompositionNodeStyle(source, "ref-profile", { position: { positionMode: "anchored", anchor: "bottom-center", offsetY: 18, zIndex: 5 } });
    const second = setCompositionNodeResponsive(first.config, "ref-profile", "desktop", { position: { positionMode: "free", x: 50, y: 85 } });
    expect(second.ok).toBe(true);
    expect(resolveCompositionStyle(findCompositionNode(second.config.composition, "ref-profile")?.node.style, "desktop").position).toMatchObject({ positionMode: "free", anchor: "bottom-center", offsetY: 18, x: 50, y: 85 });
  });

  it("agrega referencias nuevas sin alterar el bloque existente", () => {
    const source = createLegacyV6Fixture();
    const expanded = { ...source, blocks: [...source.blocks, { id: "new-card", type: "cards" as const, order: source.blocks.length, enabled: true, props: {} }] };
    const result = appendBlockReference(expanded, "new-card");
    expect(result.ok).toBe(true);
    expect(result.config.blocks.at(-1)?.id).toBe("new-card");
    expect(findCompositionNode(result.config.composition, "legacy-body")?.node.kind).toBe("stack");
  });

  it("aplana solamente composición lineal sin pérdida", () => {
    const source = createLegacyV6Fixture();
    const flattened = flattenForLegacy(source);
    expect(flattened.ok).toBe(true);
    if (flattened.ok) expect(flattened.config.blocks.map((block) => block.id)).toEqual(source.blocks.map((block) => block.id));
    const grid = withRoot([{ id: "grid", kind: "grid", enabled: true, style: { grid: { columns: 2 } }, children: [ref("heading")] }]);
    expect(flattenForLegacy(grid).ok).toBe(false);
  });

  it("mantiene los cinco presets válidos y evita reconciliarlos accidentalmente a legacy", () => {
    const source = upgradeV5ToV6(createV5Fixture());
    const expectedKinds = { legacy: "stack", overlay: "overlay", split: "row", grid: "grid", fixed: "fixed" } as const;
    (Object.keys(expectedKinds) as Array<keyof typeof expectedKinds>).forEach((preset) => {
      const candidate = compositionFromPreset(source, preset);
      expect(validateComposition(candidate)).toEqual([]);
      const reconciled = reconcileCompositionPageConfig(candidate);
      expect(validateComposition(reconciled)).toEqual([]);
      expect(reconciled.composition.children.some((node) => node.kind === expectedKinds[preset])).toBe(true);
    });
  });
});
