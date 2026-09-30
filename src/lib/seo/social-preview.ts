import { isMagicPageDocument } from "../../features/magic-page-editor-production/magic-document";
import { resolveCanonicalEditorConfig } from "../../components/profile/canonicalRenderBridge";
import { readDirectPageEnvelope } from "../canonical-page";
import type { PublicPageResult } from "../../services/page.service";

/**
 * Ensures the URL is an absolute URL. If it's relative, attaches the baseUrl.
 */
function makeAbsolute(url: string | undefined | null, baseUrl: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Ignore blob/data urls which are useless for crawlers
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }
  return null;
}

export interface ResolvedSocialMetadata {
  title: string;
  description: string;
  imageUrl: string;
}

/**
 * Inspects a PublicPageResult and its deeply nested editor configs
 * to extract the best possible social preview image, title, and description.
 */
export function resolveSocialMetadata(page: PublicPageResult, baseUrl: string): ResolvedSocialMetadata {
  const defaultTitle = page.title ? `${page.title} | Cripqer` : `Página ${page.public_id} | Cripqer`;
  const defaultDescription = page.title
    ? `${page.title} - página pública creada con Cripqer.`
    : `Página pública creada con Cripqer.`;
  const defaultImage = `${baseUrl}/brand-assets/cripqer-icon-512.png`;

  if (!page.published_template_config) {
    return { title: defaultTitle, description: defaultDescription, imageUrl: defaultImage };
  }

  // 1. Check if it's a Direct Page
  const direct = readDirectPageEnvelope(page.published_template_config);
  if (direct) {
    const config = direct.editorConfig;
    let imgUrl: string | null = null;
    
    // Find image in blocks (prioritize hero, then profile, then first image)
    const blocks = config.blocks || [];
    const hero = blocks.find((b) => b.type === "hero");
    if (hero?.content?.image || hero?.content?.imageUrl) {
      imgUrl = (hero.content.image || hero.content.imageUrl) as string;
    }
    
    if (!imgUrl) {
      const profile = blocks.find((b) => b.type === "profile");
      if (profile?.content?.image || profile?.content?.imageUrl) {
        imgUrl = (profile.content.image || profile.content.imageUrl) as string;
      }
    }
    
    if (!imgUrl) {
      const imgBlock = blocks.find((b) => b.type === "image" && (b.content?.image || b.content?.imageUrl));
      if (imgBlock) {
        imgUrl = (imgBlock.content.image || imgBlock.content.imageUrl) as string;
      }
    }

    return {
      title: defaultTitle, // Direct pages usually rely on page.title
      description: defaultDescription,
      imageUrl: makeAbsolute(imgUrl, baseUrl) || defaultImage,
    };
  }

  // 2. Check if it's a Magic V1 Page
  const isMagic = isMagicPageDocument(page.published_template_config);
  if (isMagic) {
    const config = page.published_template_config as any; // MagicPageDocumentV1
    const blocks = config.blocks || [];
    const props = config.props || {};
    
    let imgUrl: string | null = null;
    let bioDesc: string | null = null;
    let bioName: string | null = null;

    // Scan blocks for best image and bio text
    for (const b of blocks) {
      if (!b || !b.id) continue;
      
      // Look for text in profile templates
      if (b.type === "bio" || b.type === "profile") {
        const titleProp = config.texts?.[`${b.id}.title`] || props[b.id]?.title;
        const descProp = config.texts?.[`${b.id}.desc`] || props[b.id]?.desc;
        if (titleProp && typeof titleProp === "string") bioName = titleProp;
        if (descProp && typeof descProp === "string") bioDesc = descProp;
      }
    }

    // Try finding a Hero image first
    const heroBlock = blocks.find((b: any) => b.type === "hero");
    if (heroBlock && props[heroBlock.id]?.src) {
      imgUrl = props[heroBlock.id].src;
    }

    // Then Avatar
    if (!imgUrl) {
      const avatarBlock = blocks.find((b: any) => b.type === "avatar");
      if (avatarBlock && props[avatarBlock.id]?.src) {
        imgUrl = props[avatarBlock.id].src;
      }
    }

    // Then first generic Image
    if (!imgUrl) {
      const imgBlock = blocks.find((b: any) => b.type === "image");
      if (imgBlock && props[imgBlock.id]?.src) {
        imgUrl = props[imgBlock.id].src;
      }
    }

    const resolvedTitle = bioName ? `${bioName} | Cripqer` : defaultTitle;
    const resolvedDesc = bioDesc ? (bioDesc.length > 155 ? bioDesc.substring(0, 155) + "..." : bioDesc) : defaultDescription;

    return {
      title: resolvedTitle,
      description: resolvedDesc,
      imageUrl: makeAbsolute(imgUrl, baseUrl) || defaultImage,
    };
  }

  // 3. Check if it's a Premium Template
  const premium = resolveCanonicalEditorConfig(page.published_template_config);
  if (premium) {
    const seoTitle = premium.seo?.title || premium.profile?.name || defaultTitle;
    const seoDesc = premium.seo?.description || premium.profile?.description || defaultDescription;
    let seoImg = premium.seo?.socialImage || premium.profile?.avatarUrl;

    if (!seoImg) {
      // Find a hero block image
      const hero = premium.blocks?.find((b: any) => b.type === "hero" || b.type === "banner");
      if (hero && (hero as any).content?.image) {
        seoImg = (hero as any).content.image;
      }
    }

    return {
      title: seoTitle.includes("Cripqer") ? seoTitle : `${seoTitle} | Cripqer`,
      description: seoDesc.length > 155 ? seoDesc.substring(0, 155) + "..." : seoDesc,
      imageUrl: makeAbsolute(seoImg, baseUrl) || defaultImage,
    };
  }

  // Fallback
  return { title: defaultTitle, description: defaultDescription, imageUrl: defaultImage };
}
