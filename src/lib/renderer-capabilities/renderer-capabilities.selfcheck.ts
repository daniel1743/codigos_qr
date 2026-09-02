import { getTemplates } from "../basic-templates/catalog.ts";
import {
  ACTIVE_RENDERER_TEMPLATE_IDS,
  TEMPLATE_RENDERER_CAPABILITIES,
  getRendererCapabilities,
  toEngineRendererCapabilities,
  validateRendererRequirements,
} from "./index.ts";

const CARD_CAPABLE_IDS = new Set([
  "beauty-curve",
  "luxury-fusion",
  "beauty-catalog",
  "executive-straight",
]);
const BADGE_CAPABLE_IDS = new Set(CARD_CAPABLE_IDS);
const SOCIAL_LINK_CAPABLE_IDS = new Set([
  "beauty-curve",
  "luxury-fusion",
  "beauty-catalog",
  "sage",
  "silver",
]);
const FUTURE_BLOCKS = [
  "gallery",
  "portfolioGrid",
  "beforeAfter",
  "testimonials",
  "products",
  "bookingWidget",
  "quoteForm",
  "contactForm",
  "stickyPrimaryCta",
  "floatingContact",
] as const;

export function runRendererCapabilitiesSelfcheck() {
  let assertions = 0;
  const check = (condition: boolean, message: string) => {
    assertions += 1;
    if (!condition) throw new Error(`Renderer capabilities self-check failed: ${message}`);
  };

  const catalogIds = getTemplates().map((template) => template.id);
  check(
    JSON.stringify(catalogIds) === JSON.stringify(ACTIVE_RENDERER_TEMPLATE_IDS),
    "the explicit capability registry must match the live active catalog",
  );
  check(
    JSON.stringify(Object.keys(TEMPLATE_RENDERER_CAPABILITIES)) ===
      JSON.stringify(ACTIVE_RENDERER_TEMPLATE_IDS),
    "the registry must contain every active template exactly once",
  );

  for (const templateId of ACTIVE_RENDERER_TEMPLATE_IDS) {
    const capabilities = getRendererCapabilities(templateId);
    const repeated = getRendererCapabilities(templateId);
    const withContext = getRendererCapabilities(templateId, {
      containerWidth: 480,
      surface: "public",
    });
    const repeatedWithContext = getRendererCapabilities(templateId, {
      containerWidth: 480,
      surface: "public",
    });
    const projection = toEngineRendererCapabilities(capabilities);

    check(
      capabilities.rendererKind !== "unknown",
      `${templateId} must resolve as a current renderer`,
    );
    check(Object.isFrozen(capabilities), `${templateId} capabilities must be immutable`);
    check(
      JSON.stringify(capabilities) === JSON.stringify(repeated),
      `${templateId} must resolve deterministically without runtime context`,
    );
    check(
      JSON.stringify(withContext) === JSON.stringify(repeatedWithContext),
      `${templateId} must resolve deterministically with runtime context`,
    );
    check(
      JSON.stringify(projection) === JSON.stringify(toEngineRendererCapabilities(repeated)),
      `${templateId} engine projection must be deterministic`,
    );

    check(
      capabilities.hero.bannerAvatar.status === "supported",
      `${templateId} needs banner + avatar`,
    );
    check(
      capabilities.hero.bannerOnly.status === "supported",
      `${templateId} needs banner-only support`,
    );
    check(
      capabilities.hero.avatarOnly.status === "unsupported",
      `${templateId} avatar-only must be false`,
    );
    check(
      capabilities.hero.heroNone.status === "unsupported",
      `${templateId} hero-none must be false`,
    );
    check(
      capabilities.hero.focalPosition.status === "unsupported",
      `${templateId} banner focal position must be false`,
    );
    check(
      capabilities.hero.blur.status === "unsupported",
      `${templateId} banner blur must be false`,
    );
    check(
      capabilities.identity.alignment.right.status === "unsupported",
      `${templateId} identity-right must be false`,
    );
    check(
      (capabilities.identity.professionalBadge.status === "supported") ===
        BADGE_CAPABLE_IDS.has(templateId),
      `${templateId} badge support must follow the real renderer`,
    );
    check(
      (capabilities.links.cards.status === "supported") === CARD_CAPABLE_IDS.has(templateId),
      `${templateId} card support must follow the product contract`,
    );
    check(
      projection.professional_cards === CARD_CAPABLE_IDS.has(templateId),
      `${templateId} professional_cards projection must follow card support`,
    );
    check(
      projection.hero_banner,
      `${templateId} hero_banner projection must follow banner support`,
    );
    check(
      projection.social_links === SOCIAL_LINK_CAPABLE_IDS.has(templateId),
      `${templateId} social_links must require a dedicated recognized presentation`,
    );
    check(!projection.media_block, `${templateId} media_block must remain false`);
    check(!projection.booking_widget, `${templateId} booking_widget must remain false`);
    check(!projection.form_block, `${templateId} form_block must remain false`);
    check(!projection.product_block, `${templateId} product_block must remain false`);

    for (const block of FUTURE_BLOCKS) {
      check(
        capabilities.blocks[block].status === "unsupported",
        `${templateId}.${block} must be false`,
      );
    }

    if (CARD_CAPABLE_IDS.has(templateId)) {
      check(
        capabilities.links.cardMedia.right.status === "partial",
        `${templateId} right media without width must preserve its responsive limitation`,
      );
      check(
        getRendererCapabilities(templateId, { containerWidth: 419 }).links.cardMedia.right
          .status === "partial",
        `${templateId} right media must be partial below 420px`,
      );
      check(
        getRendererCapabilities(templateId, { containerWidth: 420 }).links.cardMedia.right
          .status === "supported",
        `${templateId} right media must be exact at 420px and above`,
      );
      check(
        capabilities.links.cardMedia.bottom.status === "supported",
        `${templateId} bottom media must be supported`,
      );
      check(
        capabilities.links.cardMedia.platformIcon.status === "partial",
        `${templateId} platform icon must preserve its whitelist limitation`,
      );
      check(
        projection.card_media_right,
        `${templateId} responsive fallback must project right media safely`,
      );
      check(projection.card_media_bottom, `${templateId} must project bottom media`);
    } else {
      check(
        capabilities.links.cardMedia.right.status === "unsupported",
        `${templateId} must not acquire card media without cards`,
      );
      check(!projection.card_media_right, `${templateId} must not project right media`);
      check(!projection.card_media_bottom, `${templateId} must not project bottom media`);
    }
  }

  const unknown = getRendererCapabilities("not-a-current-template");
  const unknownProjection = toEngineRendererCapabilities(unknown);
  check(unknown.rendererKind === "unknown", "invalid IDs must resolve without throwing as unknown");
  check(unknown.links.cards.status === "unsupported", "unknown cards must be false");
  check(unknown.identity.professionalBadge.status === "unsupported", "unknown badge must be false");
  check(unknown.hero.bannerOnly.status === "unsupported", "unknown banner-only must be false");
  check(unknown.blocks.products.status === "unsupported", "unknown products must be false");
  check(unknown.blocks.bookingWidget.status === "unsupported", "unknown booking must be false");
  check(unknown.blocks.contactForm.status === "unsupported", "unknown forms must be false");
  check(
    Object.values(unknownProjection).every((value) => value === false),
    "unknown engine projection must be all false",
  );

  const legacy = getRendererCapabilities("barbara");
  check(legacy.rendererKind === "legacy", "known excluded templates must be classified as legacy");
  check(
    Object.values(toEngineRendererCapabilities(legacy)).every((value) => value === false),
    "legacy templates must not become current engine capabilities",
  );

  const unknownWidthGuard = validateRendererRequirements(getRendererCapabilities("beauty-curve"), [
    { capability: "links.cards", required: true },
    { capability: "links.cardMedia.right", required: true },
  ]);
  check(!unknownWidthGuard.renderable, "required partial capabilities must fail conservatively");
  check(
    unknownWidthGuard.partial.includes("links.cardMedia.right"),
    "the guard must report partial requirements",
  );

  const knownWidthGuard = validateRendererRequirements(
    getRendererCapabilities("beauty-curve", { containerWidth: 480 }),
    [
      { capability: "links.cards", required: true },
      { capability: "links.cardMedia.right", required: true },
      { capability: "blocks.products", required: false },
    ],
  );
  check(knownWidthGuard.renderable, "supported required capabilities must pass the guard");

  const invalidPathGuard = validateRendererRequirements(getRendererCapabilities("beauty-curve"), [
    { capability: "blocks.notDefined", required: true },
  ]);
  check(!invalidPathGuard.renderable, "unknown capability paths must fail conservatively");
  check(
    invalidPathGuard.unsupported.includes("blocks.notDefined"),
    "the guard must report unknown capability paths as unsupported",
  );

  return deepFreezeSelfcheckResult({
    assertions,
    activeTemplateIds: [...ACTIVE_RENDERER_TEMPLATE_IDS],
  });
}

function deepFreezeSelfcheckResult<T extends object>(result: T): Readonly<T> {
  for (const value of Object.values(result)) {
    if (value !== null && typeof value === "object") Object.freeze(value);
  }
  return Object.freeze(result);
}
