import {
  generateBestRecipe,
  type OnboardingIntentV1,
  type PageRecipeV1,
} from "../parametric-engine";
import { getRendererCapabilities, toEngineRendererCapabilities } from "../renderer-capabilities";
import { adaptRecipeToBasicTemplate } from "./recipeToBasicTemplate";
import { validateProjectedContrast } from "./qualityGuards";
import type { BasicEditorAdapterContentV1 } from "./types";

export interface BasicEditorAdapterSelfCheckCaseV1 {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface BasicEditorAdapterSelfCheckResultV1 {
  readonly passed: boolean;
  readonly total: number;
  readonly passedCount: number;
  readonly cases: readonly BasicEditorAdapterSelfCheckCaseV1[];
}

const RUNTIME = { containerWidth: 390, surface: "editor_preview" as const };

const FIXTURE_INTENT: OnboardingIntentV1 = {
  business_type: "professional",
  business_other: null,
  primary_goal: "leads",
  visual_personality: "professional",
  identity: {
    name: "Jardines Aurora",
    profession: "Paisajismo y jardinería",
    bio: "Diseño y cuidado de jardines residenciales con atención cercana.",
    avatar_preview: "/engine-lab-avatar.svg",
    banner_preview: "/engine-lab-banner.svg",
  },
  assets: { card_media: true },
  primary_action: { type: "website", value: "https://example.com/contacto" },
  meta: { version: "1", completed_at: "2026-09-02T00:00:00.000Z" },
};

const CONTENT: BasicEditorAdapterContentV1 = {
  links: [
    {
      id: "servicios",
      label: "Servicios de jardinería",
      url: "https://example.com/servicios",
      platform: "website",
      description: "Mantención, diseño y recuperación de espacios verdes.",
      imageUrl: "/engine-lab-card.svg",
    },
    {
      id: "proyectos",
      label: "Proyectos recientes",
      url: "https://example.com/proyectos",
      platform: "instagram",
      description: "Una selección de jardines entregados.",
    },
  ],
  socials: [{ id: "instagram", platform: "instagram", url: "https://instagram.com/example" }],
  footerText: "Jardines Aurora",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function baseRecipe(): PageRecipeV1 {
  const capabilities = getRendererCapabilities("beauty-curve", RUNTIME);
  const generated = generateBestRecipe(FIXTURE_INTENT, {
    capabilities: toEngineRendererCapabilities(capabilities),
    overrides: {
      hero_mode: "banner_avatar",
      identity_alignment: "center",
      links_presentation: "buttons",
      visual_family: "editorial",
    },
    now: "2026-09-02T00:00:00.000Z",
  });
  if (!generated) throw new Error("Engine did not produce the adapter self-check fixture.");
  const recipe = clone(generated);
  recipe.structure.hero.show_professional_badge = false;
  recipe.structure.social_row.enabled = false;
  recipe.structure.primary_action.presentation = "button";
  recipe.structure.links.presentation = "buttons";
  recipe.design.card.enabled = false;
  recipe.design.card.media_position = "none";
  recipe.design.card.style = "flat";
  recipe.design.card.action_style = "text";
  recipe.blocks = recipe.blocks.filter(
    (block) =>
      block.type !== "social_links" && block.type !== "professional_card" && block.type !== "media",
  );
  return recipe;
}

function adapt(
  recipe: PageRecipeV1,
  templateId: string,
  lockedOverrides?: readonly "links_presentation"[],
  content: BasicEditorAdapterContentV1 = CONTENT,
) {
  return adaptRecipeToBasicTemplate({
    recipe,
    templateId,
    capabilities: getRendererCapabilities(templateId, RUNTIME),
    content,
    runtimeContext: RUNTIME,
    ...(lockedOverrides ? { lockedOverrides } : {}),
  });
}

export function runBasicEditorAdapterSelfCheck(): BasicEditorAdapterSelfCheckResultV1 {
  const checks: BasicEditorAdapterSelfCheckCaseV1[] = [];
  const check = (name: string, execute: () => void) => {
    try {
      execute();
      checks.push({ name, passed: true, detail: "pass" });
    } catch (caught) {
      checks.push({
        name,
        passed: false,
        detail: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };
  const assert: (condition: unknown, message: string) => asserts condition = (
    condition,
    message,
  ) => {
    if (!condition) throw new Error(message);
  };

  check("banner_avatar is renderable", () => {
    const recipe = baseRecipe();
    assert(adapt(recipe, "beauty-curve").renderable, "banner_avatar should render.");
  });

  check("banner_only is renderable", () => {
    const recipe = baseRecipe();
    recipe.structure.hero.mode = "banner_only";
    recipe.structure.hero.show_avatar = false;
    recipe.structure.hero.show_banner = true;
    assert(adapt(recipe, "beauty-curve").renderable, "banner_only should render.");
  });

  check("avatar_only is blocked", () => {
    const recipe = baseRecipe();
    recipe.structure.hero.mode = "avatar_only";
    recipe.structure.hero.show_avatar = true;
    recipe.structure.hero.show_banner = false;
    assert(!adapt(recipe, "beauty-curve").renderable, "avatar_only must be blocked.");
  });

  check("identity_right is blocked", () => {
    const recipe = baseRecipe();
    recipe.structure.hero.identity_alignment = "right" as never;
    recipe.design.avatar.alignment = "right" as never;
    assert(!adapt(recipe, "beauty-curve").renderable, "right identity must be blocked.");
  });

  check("buttons render on a non-card template", () => {
    const recipe = baseRecipe();
    assert(adapt(recipe, "adriana").renderable, "buttons should render on Adriana.");
  });

  check("cards render on a card template", () => {
    const recipe = baseRecipe();
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    recipe.design.card.enabled = true;
    recipe.design.card.media_position = "right";
    recipe.design.card.style = "bordered";
    const result = adapt(recipe, "beauty-curve");
    assert(result.renderable, "cards should render on Beauty Curve.");
    assert(
      result.config.content.links.some((link) => link.presentation === "card"),
      "No card was projected.",
    );
  });

  check("unlocked cards downgrade on a non-card template", () => {
    const recipe = baseRecipe();
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    recipe.design.card.enabled = true;
    const result = adapt(recipe, "adriana");
    assert(result.renderable, "Unlocked cards should retain a renderable button fallback.");
    assert(
      result.downgrades.some(({ code }) => code === "cards_to_buttons"),
      "Cards downgrade was not reported.",
    );
  });

  check("radial background is renderable", () => {
    const recipe = baseRecipe();
    recipe.design.background = {
      type: "radial-gradient",
      value: { kind: "radial", position: "top", from: "#f2fff3", to: "#d9eadb" },
    };
    assert(adapt(recipe, "beauty-curve").renderable, "Radial background should render.");
  });

  check("product block is blocked", () => {
    const recipe = baseRecipe();
    recipe.blocks.push({ id: "product-1", type: "product", order: 99, role: "conversion" });
    assert(!adapt(recipe, "beauty-curve").renderable, "Product block must be blocked.");
  });

  check("gallery block is blocked", () => {
    const recipe = baseRecipe();
    recipe.blocks.push({ id: "gallery-1", type: "gallery", order: 99, role: "media" } as never);
    assert(!adapt(recipe, "beauty-curve").renderable, "Gallery block must be blocked.");
  });

  check("locked cards never silently downgrade", () => {
    const recipe = baseRecipe();
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    const result = adapt(recipe, "adriana", ["links_presentation"]);
    assert(!result.renderable, "Locked cards must be incompatible on Adriana.");
    assert(
      result.errors.some(({ code }) => code === "locked_cards_unsupported"),
      "Lock failure was not explicit.",
    );
  });

  check("adapter output is deterministic", () => {
    const recipe = baseRecipe();
    const first = adapt(recipe, "beauty-curve");
    const second = adapt(recipe, "beauty-curve");
    assert(JSON.stringify(first) === JSON.stringify(second), "Repeated adaptation changed output.");
  });

  check("adapter does not mutate inputs", () => {
    const recipe = deepFreeze(clone(baseRecipe()));
    const content = deepFreeze(clone(CONTENT));
    const capabilities = getRendererCapabilities("beauty-curve", RUNTIME);
    const beforeRecipe = JSON.stringify(recipe);
    const beforeContent = JSON.stringify(content);
    const beforeCapabilities = JSON.stringify(capabilities);
    adaptRecipeToBasicTemplate({
      recipe,
      templateId: "beauty-curve",
      capabilities,
      content,
      runtimeContext: RUNTIME,
    });
    assert(JSON.stringify(recipe) === beforeRecipe, "Recipe input was mutated.");
    assert(JSON.stringify(content) === beforeContent, "Content input was mutated.");
    assert(
      JSON.stringify(capabilities) === beforeCapabilities,
      "Renderer capabilities input was mutated.",
    );
  });

  check("invalid recipe returns a structured failure", () => {
    const result = adaptRecipeToBasicTemplate({
      recipe: null as never,
      templateId: "beauty-curve",
      capabilities: getRendererCapabilities("beauty-curve", RUNTIME),
      content: CONTENT,
      runtimeContext: RUNTIME,
    });
    assert(!result.renderable, "Malformed recipe must be non-renderable.");
    assert(result.errors.length > 0, "Malformed recipe failure needs structured errors.");
  });

  check("generic Engine CTA is contextualized when unlocked", () => {
    const recipe = baseRecipe();
    recipe.conversion.primary_cta.label = "Más información";
    recipe.structure.primary_action.cta_label = "Más información";
    const result = adapt(recipe, "beauty-curve", undefined, {
      ...CONTENT,
      primaryAction: {
        label: "Solicitar presupuesto",
        cardCtaLabel: "Más información",
      },
    });
    assert(result.renderable, "Contextual CTA fixture should render.");
    assert(
      result.ctaProjection?.renderedLabel === "Solicitar presupuesto",
      "Generic CTA was not contextualized.",
    );
    assert(
      result.config.content.links[0]?.label === "Solicitar presupuesto",
      "Rendered primary CTA did not use the contextual label.",
    );
    assert(
      result.ctaProjection?.classification === "low_information",
      "CTA class was not low-info.",
    );
  });

  check("low-information Visitar uses a stronger fixture action", () => {
    const recipe = baseRecipe();
    recipe.conversion.primary_cta.label = "Visitar";
    recipe.structure.primary_action.cta_label = "Visitar";
    const result = adapt(recipe, "beauty-curve", undefined, {
      ...CONTENT,
      primaryAction: { label: "Solicitar evaluación", cardCtaLabel: "Reservar" },
    });
    assert(
      result.ctaProjection?.renderedLabel === "Solicitar evaluación",
      "Low-info CTA was not upgraded.",
    );
    assert(
      result.ctaProjection?.fixturePreferredLabel === "Solicitar evaluación",
      "Fixture CTA is missing.",
    );
  });

  check("specific Engine CTA is preserved", () => {
    const recipe = baseRecipe();
    recipe.conversion.primary_cta.label = "Reservar";
    recipe.structure.primary_action.cta_label = "Reservar";
    const result = adapt(recipe, "beauty-curve", undefined, {
      ...CONTENT,
      primaryAction: { label: "Agendar consulta", cardCtaLabel: "Reservar" },
    });
    assert(result.renderable, "Specific CTA fixture should render.");
    assert(result.ctaProjection?.renderedLabel === "Reservar", "Specific CTA was rewritten.");
    assert(
      result.ctaProjection?.reason === "engine_label_specific",
      "Specific CTA preservation reason is missing.",
    );
    assert(
      result.ctaProjection?.classification === "high_information",
      "Specific CTA was not high-info.",
    );
  });

  check("locked generic CTA is preserved", () => {
    const recipe = baseRecipe();
    recipe.conversion.primary_cta.label = "Más información";
    recipe.structure.primary_action.cta_label = "Más información";
    const result = adapt(recipe, "beauty-curve", undefined, {
      ...CONTENT,
      primaryAction: {
        label: "Solicitar presupuesto",
        cardCtaLabel: "Más información",
        locked: true,
      },
    });
    assert(result.renderable, "Locked CTA fixture should render.");
    assert(result.ctaProjection?.renderedLabel === "Más información", "Locked CTA was rewritten.");
    assert(result.ctaProjection?.reason === "cta_locked", "CTA lock reason is missing.");
  });

  check("card-right survives desktop projection", () => {
    const recipe = baseRecipe();
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    recipe.design.card.enabled = true;
    recipe.design.card.media_position = "right";
    const result = adapt(recipe, "beauty-curve");
    assert(result.renderable, "Desktop card-right fixture should render.");
    assert(result.projection.cardMediaPosition === "right", "Desktop projection lost right media.");
    assert(
      result.config.content.cards.some((card) => card.mediaPosition === "right"),
      "Desktop card config lost right media.",
    );
  });

  check("card-right remains semantic at mobile width", () => {
    const recipe = baseRecipe();
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    recipe.design.card.enabled = true;
    recipe.design.card.media_position = "right";
    const result = adaptRecipeToBasicTemplate({
      recipe,
      templateId: "beauty-curve",
      capabilities: getRendererCapabilities("beauty-curve", {
        containerWidth: 360,
        surface: "editor_preview",
      }),
      content: CONTENT,
      runtimeContext: { containerWidth: 360, surface: "editor_preview" },
    });
    assert(result.renderable, "Mobile card-right fixture should render.");
    assert(
      result.projection.cardMediaPosition === "right",
      "Adapter should leave responsive stacking to the renderer.",
    );
  });

  check("unknown template fails safely", () => {
    const result = adaptRecipeToBasicTemplate({
      recipe: baseRecipe(),
      templateId: "unknown-template",
      capabilities: getRendererCapabilities("beauty-curve", RUNTIME),
      content: CONTENT,
      runtimeContext: RUNTIME,
    });
    assert(!result.renderable, "Unknown template must not render.");
    assert(
      result.errors.some(
        ({ code }) => code === "unknown_template" || code === "capability_template_mismatch",
      ),
      "Unknown template was not rejected explicitly.",
    );
  });

  check("WhatsApp action destination becomes a usable URL", () => {
    const recipe = baseRecipe();
    recipe.conversion.primary_cta.type = "whatsapp";
    recipe.conversion.primary_cta.destination = "+56 9 4000 0010";
    recipe.conversion.priority_order = [
      "whatsapp",
      ...recipe.conversion.priority_order.filter((type) => type !== "whatsapp"),
    ];
    const result = adapt(recipe, "beauty-curve");
    assert(result.renderable, "WhatsApp action fixture should render.");
    assert(
      result.config.content.links[0]?.url === "https://wa.me/56940000010",
      "WhatsApp destination was not projected to wa.me.",
    );
  });

  check("generic Globe fallback is suppressed on card projection", () => {
    const recipe = baseRecipe();
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    recipe.design.card.enabled = true;
    const result = adapt(recipe, "beauty-curve", undefined, {
      ...CONTENT,
      links: [
        (({ imageUrl: _imageUrl, ...link }) => ({ ...link, platform: "website" }))(
          CONTENT.links[0]!,
        ),
      ],
    });
    assert(
      result.mediaDiagnostics.every(
        ({ sourceType, effectiveMediaMode }) =>
          sourceType !== "generic_fallback" || effectiveMediaMode === "none",
      ),
      "Generic Globe fallback still occupies media space.",
    );
  });

  check("declared real card image remains preserved", () => {
    const recipe = baseRecipe();
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    recipe.design.card.enabled = true;
    const result = adapt(recipe, "beauty-curve");
    assert(
      result.mediaDiagnostics.some(({ sourceType }) => sourceType === "real_image"),
      "Real card image was lost.",
    );
  });

  check("post-projection contrast failure is explicit", () => {
    const recipe = baseRecipe();
    const result = adapt(recipe, "beauty-curve");
    assert(result.renderable, "Contrast guard should diagnose a renderable projection.");
    const contrast = validateProjectedContrast({
      ...result.config,
      palette: {
        ...result.config.palette,
        background: "#ffffff",
        text: "#ffffff",
        textMuted: "#ffffff",
      },
      content: {
        ...result.config.content,
        profile: { ...result.config.content.profile, titleColor: "#ffffff", bioColor: "#ffffff" },
      },
    });
    assert(contrast.status === "FAIL", "Contrast failure was not reported.");
    assert(
      contrast.checks.some(({ status }) => status === "FAIL"),
      "No failed ratio was retained.",
    );
  });

  check("solid color contrast uses final button colors", () => {
    const result = adapt(baseRecipe(), "beauty-curve");
    assert(result.renderable, "Solid contrast fixture should render.");
    const contrast = validateProjectedContrast({
      ...result.config,
      palette: {
        ...result.config.palette,
        background: "#ffffff",
        surface: "#f2f4f7",
        text: "#17202a",
        textMuted: "#425466",
        accent: "#075985",
        accentText: "#ffffff",
      },
      content: {
        ...result.config.content,
        profile: { ...result.config.content.profile, titleColor: "#17202a", bioColor: "#425466" },
      },
    });
    assert(contrast.status === "PASS", "Known solid colors did not pass.");
    assert(
      contrast.checks.every(({ ratio }) => ratio !== null),
      "Solid contrast did not retain measurable ratios.",
    );
  });

  check("hex8 alpha compositing resolves soft accent over light page", () => {
    const recipe = baseRecipe();
    recipe.design.button.style = "soft";
    recipe.design.card.enabled = true;
    recipe.structure.links.presentation = "cards";
    recipe.structure.links.max_primary_cards = 2;
    const result = adapt(recipe, "beauty-curve");
    assert(result.renderable, "Soft alpha fixture should render.");
    const cardCheck = result.contrast?.checks.find(({ id }) => id === "card-title-vs-surface");
    assert(cardCheck?.ratio !== null, "The generated hex8 alpha surface remained unverifiable.");
    assert(cardCheck?.background.includes("over"), "Alpha compositing trace is missing.");
  });

  check("linear gradient uses the worst endpoint", () => {
    const result = adapt(baseRecipe(), "beauty-curve");
    assert(result.renderable, "Linear gradient fixture should render.");
    const contrast = validateProjectedContrast({
      ...result.config,
      palette: {
        ...result.config.palette,
        background: "linear-gradient(180deg, #111111, #eeeeee)",
      },
      content: {
        ...result.config.content,
        profile: { ...result.config.content.profile, titleColor: "#ffffff" },
      },
    });
    const title = contrast.checks.find(({ id }) => id === "profile-title-vs-page");
    assert(
      title?.status === "FAIL" && title.ratio !== null && title.ratio < 3,
      "Worst linear endpoint was not enforced.",
    );
  });

  check("radial gradient uses the worst endpoint", () => {
    const result = adapt(baseRecipe(), "beauty-curve");
    assert(result.renderable, "Radial gradient fixture should render.");
    const contrast = validateProjectedContrast({
      ...result.config,
      palette: {
        ...result.config.palette,
        background: "radial-gradient(circle at top, #111111, #eeeeee)",
      },
      content: {
        ...result.config.content,
        profile: { ...result.config.content.profile, titleColor: "#ffffff" },
      },
    });
    const title = contrast.checks.find(({ id }) => id === "profile-title-vs-page");
    assert(
      title?.status === "FAIL" && title.ratio !== null && title.ratio < 3,
      "Worst radial endpoint was not enforced.",
    );
  });

  check("unknown effective color remains NOT_VERIFIABLE", () => {
    const result = adapt(baseRecipe(), "beauty-curve");
    assert(result.renderable, "Unknown color fixture should render.");
    const contrast = validateProjectedContrast({
      ...result.config,
      palette: { ...result.config.palette, background: "var(--runtime-surface)" },
    });
    assert(
      contrast.checks.some(({ status }) => status === "NOT_VERIFIABLE"),
      "Unknown color did not produce NOT_VERIFIABLE.",
    );
  });

  const passedCount = checks.filter(({ passed }) => passed).length;
  return {
    passed: passedCount === checks.length,
    total: checks.length,
    passedCount,
    cases: checks,
  };
}
