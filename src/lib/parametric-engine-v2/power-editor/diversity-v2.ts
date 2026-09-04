import type { PowerEditorCandidateV2 } from "./generate-v2";
import type { TopSignatureV2 } from "./top-composition-v2";
import type { PowerEditorRecipeV2 } from "./types-v2";

export interface StructuralSignatureV2 {
  layout: string;
  blockSequence: string;
  mediaStrategy: string;
  backgroundStrategy: string;
  buttonCardStrategy: string;
  primaryCtaPlacement: string;
  majorMediaPresence: string;
  topSignature: TopSignatureV2;
}

function backgroundStrategy(recipe: PowerEditorRecipeV2): string {
  const background = recipe.visual.background;
  if (background.type === "gradient") return `gradient:${background.gradient?.kind ?? "unknown"}`;
  if (background.type === "pattern") return `pattern:${background.pattern ?? "unknown"}`;
  if (background.type === "image") return "image-background";
  return "solid";
}

function buttonCardStrategy(recipe: PowerEditorRecipeV2): string {
  const buttons = recipe.visual.buttons.variant;
  const cards = recipe.visual.cards.preset;
  const blockPresentation = recipe.structure.blocks
    .filter((block) => block.type === "buttonGroup" || block.type === "links" || block.type === "mediaCard")
    .map((block) => {
      const columns = block.layout.columns ?? 1;
      const items = block.content.items;
      const presentations = Array.isArray(items)
        ? items.map((item) => (typeof item === "object" && item ? item.presentation : undefined)).filter(Boolean).join(",")
        : "";
      return `${block.type}:${block.variant}:${columns}:${presentations}`;
    })
    .join("|");
  return `${buttons}/${cards}/${blockPresentation}`;
}

export function structuralSignatureV2(
  candidate: Pick<PowerEditorCandidateV2, "recipe">,
): StructuralSignatureV2 {
  const recipe = candidate.recipe;
  const blocks = recipe.structure.blocks;
  const primaryCta = blocks.findIndex(
    (block) => block.type === "cta" || block.type === "booking" || block.type === "buttonGroup",
  );
  const majorMedia = blocks
    .filter((block) =>
      ["video", "gallery", "portfolio", "mediaCard", "productGrid", "music", "image"].includes(
        block.type,
      ),
    )
    .map((block) => block.type)
    .join(",");
  return {
    layout: recipe.layout.id,
    blockSequence: blocks.map((block) => block.type).join(">"),
    mediaStrategy: recipe.semantics.media_strategy,
    backgroundStrategy: backgroundStrategy(recipe),
    buttonCardStrategy: buttonCardStrategy(recipe),
    primaryCtaPlacement: primaryCta < 0 ? "none" : `${primaryCta}:${blocks[primaryCta]!.type}`,
    majorMediaPresence: `${recipe.visual.background.type}:${majorMedia || "none"}`,
    topSignature: recipe.semantics.top_signature,
  };
}

export function structuralSignatureKey(signature: StructuralSignatureV2): string {
  return [
    signature.layout,
    signature.blockSequence,
    signature.mediaStrategy,
    signature.backgroundStrategy,
    signature.buttonCardStrategy,
    signature.primaryCtaPlacement,
    signature.majorMediaPresence,
    signature.topSignature,
  ].join("||");
}

function compositionKey(signature: StructuralSignatureV2): string {
  return signature.topSignature;
}

/**
 * Selects high-quality candidates while limiting repeated compositions. The
 * candidate pool is already quality-filtered by Engine V1.5; this gate only
 * changes final ordering/selection and ignores cosmetic-only differences.
 */
export function selectStructurallyDiverseCandidates(
  candidates: readonly PowerEditorCandidateV2[],
  count: number,
  maxSameComposition = 2,
): PowerEditorCandidateV2[] {
  const ranked = [...candidates].sort(
    (a, b) => (b.total_score - a.total_score) || a.id.localeCompare(b.id),
  );
  const selected: PowerEditorCandidateV2[] = [];
  const selectedKeys = new Set<string>();
  const compositionCounts = new Map<string, number>();
  const remaining = [...ranked];

  while (selected.length < count && remaining.length > 0) {
    const eligible = remaining.filter((candidate) => {
      const composition = compositionKey(structuralSignatureV2(candidate));
      return (compositionCounts.get(composition) ?? 0) < maxSameComposition;
    });
    if (eligible.length === 0) break;

    const novel = eligible.filter((candidate) => {
      const signature = structuralSignatureV2(candidate);
      return !selectedKeys.has(structuralSignatureKey(signature));
    });
    const pool = novel.length > 0 ? novel : eligible;
    const candidate = pool[0]!;
    const signature = structuralSignatureV2(candidate);
    const key = structuralSignatureKey(signature);
    const composition = compositionKey(signature);
    selected.push(candidate);
    selectedKeys.add(key);
    compositionCounts.set(composition, (compositionCounts.get(composition) ?? 0) + 1);
    remaining.splice(remaining.indexOf(candidate), 1);
  }

  return selected;
}
