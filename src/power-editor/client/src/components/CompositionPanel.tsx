import { Box, Columns2, Grid2X2, Layers3, RotateCcw, Rows3, SquareStack, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { allBlocks, type Breakpoint } from "../lib/editorCandidateModel";
import { findCompositionNode, resetCompositionNodePosition, setCompositionNodeStyle, upgradeV5ToV6, type CompositionBranchNode, type CompositionNode, type PageConfigV6 } from "../lib/compositionModel";

type CompositionPanelProps = {
  page: PageConfigV6;
  breakpoint: Breakpoint;
  onCommit: (next: PageConfigV6) => void;
};

type LayoutPreset = "legacy" | "overlay" | "split" | "grid" | "fixed";

function ref(blockId: string, style?: CompositionNode["style"]): CompositionNode {
  return style ? { id: `ref-${blockId}`, kind: "block", enabled: true, blockId, style } : { id: `ref-${blockId}`, kind: "block", enabled: true, blockId };
}

function branch(id: string, kind: CompositionBranchNode["kind"], children: CompositionNode[], style?: CompositionNode["style"]): CompositionBranchNode {
  return style ? { id, kind, enabled: true, children, style } : { id, kind, enabled: true, children };
}

export function compositionFromPreset(page: PageConfigV6, preset: LayoutPreset): PageConfigV6 {
  if (preset === "legacy") return upgradeV5ToV6(page);
  const blocks = allBlocks(page);
  const ids = new Set(blocks.map((block) => block.id));
  const banner = blocks.find((block) => block.type === "banner")?.id;
  const profile = blocks.find((block) => block.type === "profile")?.id;
  const heading = blocks.find((block) => block.type === "heading")?.id;
  const text = blocks.find((block) => block.type === "text")?.id;
  const links = blocks.find((block) => block.type === "links")?.id;
  const media = blocks.find((block) => block.type === "video" || block.type === "image")?.id ?? banner;
  const take = (...values: Array<string | undefined>) => values.filter((id): id is string => Boolean(id && ids.delete(id)));
  const remaining = () => blocks.filter((block) => ids.has(block.id)).map((block) => ref(block.id));
  const initialIds = new Set(ids);

  if (preset === "overlay" && banner) {
    take(banner, profile);
    const heroChildren = [ref(banner)];
    if (profile) heroChildren.push(ref(profile, { position: { positionMode: "anchored", anchor: "bottom-center", offsetY: 24, zIndex: 8, width: 72 } }));
    return { ...page, version: 6, composition: { id: "root", kind: "root", enabled: true, children: [branch("hero-overlay", "overlay", heroChildren, { minHeight: 218, overflow: "visible" }), branch("editorial-body", "stack", remaining(), { gap: 16, padding: 28 })] } };
  }

  if (preset === "split" && media) {
    take(media);
    const mediaColumn = branch("split-media", "column", [ref(media)], { gap: 10 });
    const copyColumn = branch("split-copy", "column", take(profile, heading, text, links).map((id) => ref(id)), { gap: 14, justify: "center" });
    return { ...page, version: 6, composition: { id: "root", kind: "root", enabled: true, children: [branch("media-copy", "row", [mediaColumn, copyColumn], { split: { direction: "row", tracks: [40, 60], collapse: "stack", minColumnWidth: 180 }, responsive: { mobile: { gap: 18 }, tablet: { gap: 20 }, desktop: { gap: 24 } }, padding: 20 }), branch("split-followup", "stack", remaining(), { gap: 16, padding: 24 })] } };
  }

  if (preset === "grid") {
    const intro = take(profile, heading, text).map((id) => ref(id));
    const gridChildren = take(...blocks.filter((block) => ids.has(block.id) && block.id !== "footer").map((block) => block.id)).map((id, index) => ref(id, { placement: { columnStart: (index % 3) + 1, columnSpan: 1 }, responsive: { mobile: { placement: { columnStart: 1, columnSpan: 1 } }, tablet: { placement: { columnStart: (index % 2) + 1, columnSpan: 1 } } } }));
    const footer = take("footer").map((id) => ref(id));
    return { ...page, version: 6, composition: { id: "root", kind: "root", enabled: true, children: [branch("catalog-intro", "stack", intro, { gap: 12, padding: 24 }), branch("catalog-grid", "grid", gridChildren, { grid: { columns: 3, autoFlow: "row" }, responsive: { mobile: { grid: { columns: 1 }, gap: 12 }, tablet: { grid: { columns: 2 }, gap: 16 }, desktop: { grid: { columns: 3 }, gap: 18 } }, padding: 24 }), branch("catalog-footer", "stack", footer, { padding: 24 })] } };
  }

  if (preset === "fixed" && links) {
    take(links);
    return { ...page, version: 6, composition: { id: "root", kind: "root", enabled: true, children: [branch("fixed-body", "stack", remaining(), { gap: 16, padding: 28 }), branch("fixed-cta", "fixed", [ref(links)], { fixed: { edge: "bottom", inset: 14, zIndex: 16, safeArea: true, maxWidth: 340, reserveSpace: true } })] } };
  }

  return { ...page, composition: { id: "root", kind: "root", enabled: true, children: [branch("fallback-body", "stack", Array.from(initialIds).map((id) => ref(id)), { gap: 16, padding: 28 })] } };
}

function structuralNodes(root: CompositionNode): CompositionNode[] {
  if (root.kind === "block") return [];
  return [root, ...root.children.flatMap(structuralNodes)];
}

const presetLabels: Array<{ id: LayoutPreset; title: string; description: string; icon: typeof Rows3 }> = [
  { id: "legacy", title: "Flujo clásico", description: "Hero y contenido vertical", icon: Rows3 },
  { id: "overlay", title: "Hero overlay", description: "Perfil sobre banner", icon: Layers3 },
  { id: "split", title: "Media + copy", description: "Dos columnas adaptables", icon: Columns2 },
  { id: "grid", title: "Catálogo grid", description: "Secciones modulares", icon: Grid2X2 },
  { id: "fixed", title: "CTA fijo", description: "Acción persistente", icon: SquareStack },
];

export function CompositionPanel({ page, breakpoint, onCommit }: CompositionPanelProps) {
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const structural = useMemo(() => structuralNodes(page.composition), [page.composition]);
  const selected = findCompositionNode(page.composition, selectedNodeId)?.node;
  const selectedStyle = selected?.style;

  const updateStyle = (patch: Parameters<typeof setCompositionNodeStyle>[2]) => {
    if (!selected) return;
    const result = setCompositionNodeStyle(page, selected.id, patch);
    if (result.ok) onCommit(result.config);
  };

  return <div className="ep-panel ep-composition-panel">
    <p className="ep-guidance"><Box size={14} />La estructura organiza los bloques; el contenido y sus estilos siguen editándose en las herramientas actuales.</p>
    <div className="ep-composition-presets" aria-label="Presets de composición">
      {presetLabels.map((preset) => {
        const Icon = preset.icon;
        return <button key={preset.id} type="button" onClick={() => { onCommit(compositionFromPreset(page, preset.id)); setSelectedNodeId("root"); }}><Icon size={15} /><span><b>{preset.title}</b><small>{preset.description}</small></span></button>;
      })}
    </div>
    <label className="ep-field">Nodo estructural<select value={selectedNodeId} onChange={(event) => setSelectedNodeId(event.target.value)}>{structural.map((node) => <option key={node.id} value={node.id}>{node.kind === "root" ? "Página" : `${node.kind} · ${node.id}`}</option>)}</select></label>
    {selected && selected.kind !== "block" && <div className="ep-composition-controls">
      <label className="ep-field">Espaciado interno<input type="number" min="0" max="80" value={Number(selectedStyle?.padding ?? 0)} onChange={(event) => updateStyle({ padding: Number(event.target.value) })} /></label>
      <label className="ep-field">Separación entre hijos<input type="number" min="0" max="80" value={Number(selectedStyle?.gap ?? 0)} onChange={(event) => updateStyle({ gap: Number(event.target.value) })} /></label>
      {selected.kind === "grid" && <label className="ep-field">Columnas en {breakpoint}<select value={String(selectedStyle?.responsive?.[breakpoint]?.grid?.columns ?? selectedStyle?.grid?.columns ?? 1)} onChange={(event) => updateStyle({ responsive: { ...selectedStyle?.responsive, [breakpoint]: { ...selectedStyle?.responsive?.[breakpoint], grid: { ...selectedStyle?.responsive?.[breakpoint]?.grid, columns: Number(event.target.value) } } } })}><option value="1">1 columna</option><option value="2">2 columnas</option><option value="3">3 columnas</option><option value="4">4 columnas</option><option value="5">5 columnas</option><option value="6">6 columnas</option></select></label>}
      {selected.kind === "row" && <label className="ep-field">Proporción de columnas<select value={String(selectedStyle?.split?.tracks?.[0] ?? 50)} onChange={(event) => { const first = Number(event.target.value); updateStyle({ split: { direction: selectedStyle?.split?.direction ?? "row", tracks: [first, 100 - first], collapse: selectedStyle?.split?.collapse ?? "stack" } }); }}><option value="40">40 / 60</option><option value="50">50 / 50</option><option value="60">60 / 40</option></select></label>}
      <div className="ep-panel-actions"><button type="button" onClick={() => { const result = resetCompositionNodePosition(page, selected.id, breakpoint); if (result.ok) onCommit(result.config); }}><RotateCcw size={14} />Restablecer posición</button><button type="button" onClick={() => { onCommit(upgradeV5ToV6(page)); setSelectedNodeId("root"); }}><Undo2 size={14} />Restaurar flujo</button></div>
    </div>}
  </div>;
}
