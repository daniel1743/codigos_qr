import { clonePageConfig, initialPageConfig, type BlockType, type PageConfig } from "./editorCandidateModel";
import { hydrateCompositionPageConfig, type PageConfigV6 } from "./compositionModel";

const blockTypes: BlockType[] = ["banner", "profile", "heading", "text", "links", "socials", "image", "video", "cards", "separator", "spacer", "gallery", "services", "reviews", "products", "booking", "faq", "contact", "map", "shape", "ring", "ornament", "frame", "particles", "footer"];

export function createV5Fixture(): PageConfig {
  return { ...clonePageConfig(initialPageConfig), version: 5 };
}

export function createAllBlocksV5Fixture(): PageConfig {
  const page = createV5Fixture();
  const existing = new Set(page.blocks.map((block) => block.type));
  const additions = blockTypes.filter((type) => !existing.has(type)).map((type, index) => ({ id: `fixture-${type}`, type, order: page.blocks.length + index, enabled: true, name: `Fixture ${type}`, props: {} }));
  return { ...page, blocks: [...page.blocks, ...additions] };
}

export function createLegacyV6Fixture(): PageConfigV6 {
  return hydrateCompositionPageConfig(createV5Fixture());
}
