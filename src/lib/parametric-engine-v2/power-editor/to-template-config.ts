/**
 * PowerEditorRecipeV2 -> BioTemplateConfig
 *
 * Pure, deterministic and side-effect free: no uid(), no Date.now().
 * The output is exactly what the Power Editor renderer consumes.
 */

import { getLayout } from "@/premium-template-studio/constants/layouts";
import {
  SCHEMA_VERSION,
  type BioTemplateConfig,
  type TemplateBlock,
  type TemplateCategory,
  type TemplateLayout,
} from "@/premium-template-studio/types";
import type { FamilyId } from "../types";
import type { PowerEditorRecipeV2 } from "./types-v2";

const CATEGORY: Record<FamilyId, TemplateCategory> = {
  editorial: "Personal",
  luxury: "Luxury",
  corporate: "Corporate",
  minimal: "Minimal",
  creator: "Creator",
  energetic: "Business",
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "profile"
  );
}

function layoutFor(recipe: PowerEditorRecipeV2): TemplateLayout {
  const base = getLayout(recipe.layout.id) ?? getLayout("centered")!;
  return {
    ...base,
    header: recipe.layout.header,
    responsive: {
      desktop: { ...base.responsive.desktop, columns: recipe.layout.columns_desktop },
      tablet: { ...base.responsive.tablet, columns: recipe.layout.columns_tablet },
      mobile: { ...base.responsive.mobile, columns: 1 },
    },
  };
}

function toBlocks(recipe: PowerEditorRecipeV2): TemplateBlock[] {
  return recipe.structure.blocks.map((block) => ({
    id: block.id,
    type: block.type,
    variant: block.variant,
    content: block.content,
    style: block.style,
    layout: block.layout,
    visibility: block.visibility,
    interaction: { newTab: true, animation: block.animation },
    motion: block.motion,
    ...(block.responsive ? { responsive: block.responsive } : {}),
  }));
}

export function toBioTemplateConfig(recipe: PowerEditorRecipeV2): BioTemplateConfig {
  const slug = slugify(recipe.identity.name);
  const themeId = `engine-${recipe.semantics.family}`;
  const title = `${recipe.identity.name}${
    recipe.identity.profession ? ` — ${recipe.identity.profession}` : ""
  }`;

  const config: BioTemplateConfig = {
    schemaVersion: SCHEMA_VERSION,
    pageInstanceId: `page-${recipe.meta.fingerprint}`,
    templateDefinitionId: `engine-${recipe.semantics.family}-${recipe.layout.id}`,
    metadata: {
      templateDefinitionId: `engine-${recipe.semantics.family}-${recipe.layout.id}`,
      name: `${recipe.semantics.family} · ${recipe.semantics.pattern}`,
      category: CATEGORY[recipe.semantics.family],
      premium: true,
      createdAt: recipe.meta.generated_at,
      updatedAt: recipe.meta.generated_at,
      author: "Cripqer Parametric Engine",
      tags: [recipe.semantics.family, recipe.semantics.pattern, recipe.semantics.primary_goal],
    },
    theme: {
      id: themeId,
      name: `Engine ${recipe.semantics.family}`,
      colors: recipe.visual.colors,
      typography: recipe.visual.typography,
      background: recipe.visual.background,
      cards: recipe.visual.cards,
      buttons: recipe.visual.buttons,
      spacing: recipe.visual.spacing,
      animation: recipe.visual.animation,
      texture: recipe.visual.texture,
    },
    layout: layoutFor(recipe),
    profile: {
      name: recipe.identity.name,
      username: slug,
      role: recipe.identity.profession,
      description: recipe.identity.bio,
      verified: recipe.source_recipe.structure.hero.show_professional_badge,
      avatar: { ...recipe.avatar },
      banner: {
        enabled: recipe.banner.enabled,
        height: recipe.banner.height,
        mobileHeight: recipe.banner.mobileHeight,
        overlay: recipe.banner.overlay,
        blur: recipe.banner.blur,
        gradient: recipe.banner.gradient,
        focalX: recipe.banner.focalX,
        focalY: recipe.banner.focalY,
        radius: recipe.banner.radius,
      },
    },
    blocks: toBlocks(recipe),
    seo: {
      title: title.slice(0, 60),
      description: (recipe.identity.bio || title).slice(0, 155),
      index: true,
    },
    motion: recipe.visual.motion,
    settings: {
      showBranding: true,
      slug,
      animation: recipe.visual.animation,
      language: "es",
    },
  };

  if (recipe.identity.avatar) config.profile.avatarUrl = recipe.identity.avatar;
  if (recipe.identity.banner?.trim() && recipe.banner.enabled) {
    config.profile.banner.imageUrl = recipe.identity.banner;
  }
  return config;
}
