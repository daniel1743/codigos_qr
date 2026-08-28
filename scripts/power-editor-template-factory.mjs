import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sampleAssetBase = "/power-editor-samples/";
const sampleBanners = Array.from(
  { length: 12 },
  (_, index) => `${sampleAssetBase}banner-${String(index + 1).padStart(2, "0")}.jpg`,
);
const sampleAvatars = Array.from(
  { length: 12 },
  (_, index) => `${sampleAssetBase}avatar-${String(index + 1).padStart(2, "0")}.jpg`,
);
const media = sampleBanners;
const pick = (items, index) => items[((index % items.length) + items.length) % items.length];
const sampleBanner = (index) => pick(sampleBanners, index);
const sampleAvatar = (index) => pick(sampleAvatars, index);

const palettes = {
  gold: {
    base: "#17130f",
    end: "#755329",
    accent: "#e6bd72",
    ink: "#fff7e8",
    pattern: "geometric",
    texture: "metallic",
    light: "flare",
  },
  platinum: {
    base: "#18222d",
    end: "#63788b",
    accent: "#dbe8ef",
    ink: "#ffffff",
    pattern: "lines",
    texture: "metallic",
    light: "spotlight",
  },
  obsidian: {
    base: "#101114",
    end: "#322234",
    accent: "#e7b8f0",
    ink: "#f6f2f8",
    pattern: "noise",
    texture: "grain",
    light: "ambient",
  },
  emerald: {
    base: "#102d29",
    end: "#39745d",
    accent: "#e2c27d",
    ink: "#f2f6ef",
    pattern: "waves",
    texture: "paper",
    light: "radial",
  },
  cobalt: {
    base: "#101a40",
    end: "#315ea2",
    accent: "#9cc7ff",
    ink: "#eef5ff",
    pattern: "grid",
    texture: "grain",
    light: "spotlight",
  },
  rose: {
    base: "#3d1d30",
    end: "#9f617b",
    accent: "#ffd6dd",
    ink: "#fff5f7",
    pattern: "diagonal",
    texture: "paper",
    light: "flare",
  },
  terracotta: {
    base: "#392117",
    end: "#b56548",
    accent: "#f7d6b4",
    ink: "#fff7ed",
    pattern: "dots",
    texture: "paper",
    light: "ambient",
  },
  ivory: {
    base: "#e8dec8",
    end: "#bba680",
    accent: "#422f22",
    ink: "#2a211b",
    pattern: "lines",
    texture: "paper",
    light: "radial",
  },
};

const recipes = [
  {
    id: "golden-atelier",
    material: "gold",
    font: "Cinzel",
    banner: true,
    bannerMedia: 0,
    avatar: "image",
    avatarMedia: 1,
    align: "center",
    linkLayout: 1,
    extras: ["video", "services", "booking", "spacer", "ring", "ornament", "particles"],
  },
  {
    id: "platinum-editorial",
    material: "platinum",
    font: "Bodoni Moda",
    banner: false,
    avatar: "monogram",
    align: "left",
    linkLayout: 2,
    extras: ["image", "gallery", "separator", "frame", "shape", "ring"],
  },
  {
    id: "obsidian-creator",
    material: "obsidian",
    font: "Space Grotesk",
    banner: true,
    bannerMedia: 1,
    avatar: "image",
    avatarMedia: 2,
    align: "left",
    linkLayout: 2,
    extras: ["video", "cards", "socials", "particles", "shape"],
  },
  {
    id: "emerald-concierge",
    material: "emerald",
    font: "Marcellus",
    banner: true,
    bannerMedia: 2,
    avatar: "monogram",
    align: "center",
    linkLayout: 1,
    extras: ["services", "booking", "faq", "contact", "ornament"],
  },
  {
    id: "cobalt-product-studio",
    material: "cobalt",
    font: "Outfit",
    banner: false,
    avatar: "image",
    avatarMedia: 3,
    align: "right",
    linkLayout: 2,
    extras: ["products", "gallery", "cards", "frame", "ring"],
  },
  {
    id: "rose-ceremony",
    material: "rose",
    font: "Italiana",
    banner: true,
    bannerMedia: 3,
    avatar: "image",
    avatarMedia: 4,
    align: "center",
    linkLayout: 1,
    extras: ["booking", "image", "gallery", "separator", "ornament", "particles"],
  },
  {
    id: "terracotta-maker",
    material: "terracotta",
    font: "DM Serif Display",
    banner: false,
    avatar: "monogram",
    align: "left",
    linkLayout: 2,
    extras: ["services", "video", "map", "shape", "ring"],
  },
  {
    id: "ivory-portfolio",
    material: "ivory",
    font: "Lora",
    banner: false,
    avatar: "image",
    avatarMedia: 5,
    align: "left",
    linkLayout: 1,
    extras: ["gallery", "image", "cards", "faq", "frame"],
  },
  {
    id: "gold-night-market",
    material: "gold",
    font: "Prata",
    banner: true,
    bannerMedia: 4,
    avatar: "monogram",
    align: "right",
    linkLayout: 2,
    extras: ["products", "video", "contact", "particles", "ring"],
  },
  {
    id: "platinum-salon",
    material: "platinum",
    font: "Cormorant Garamond",
    banner: true,
    bannerMedia: 5,
    avatar: "image",
    avatarMedia: 6,
    align: "center",
    linkLayout: 1,
    extras: ["services", "reviews", "booking", "ornament", "frame"],
  },
  {
    id: "cobalt-stream",
    material: "cobalt",
    font: "Sora",
    banner: true,
    bannerMedia: 6,
    avatar: "image",
    avatarMedia: 0,
    align: "left",
    linkLayout: 2,
    extras: ["video", "gallery", "socials", "shape", "particles"],
  },
  {
    id: "emerald-journal",
    material: "emerald",
    font: "Libre Baskerville",
    banner: false,
    avatar: "monogram",
    align: "center",
    linkLayout: 1,
    extras: ["text", "faq", "map", "gallery", "separator", "frame", "particles"],
  },
];

const macroFamilies = [
  "hero-overlay",
  "editorial-cover",
  "cinematic-split",
  "concierge-fixed-cta",
  "commerce-grid",
  "ceremony-overlay",
  "maker-split",
  "portfolio-mosaic",
  "market-fixed-cta",
  "salon-journey",
  "stream-grid",
  "journal-columns",
];

function style(palette, index, intent = "surface") {
  const compact = index % 3 === 0;
  return {
    composition: {
      marginTop: compact ? 10 : 18,
      marginBottom: 0,
      padding: intent === "surface" ? 12 : 0,
      gap: 9 + (index % 3) * 3,
      width: intent === "hero" ? 100 : 92,
      maxWidth: 100,
      minHeight: 0,
      align: "center",
      verticalAlign: "top",
      columns: 1,
      translateX: 0,
      translateY: 0,
      snap: true,
    },
    border: {
      style: intent === "surface" ? "solid" : "none",
      width: intent === "surface" ? 1 : 0,
      color: palette.accent,
      opacity: 28 + (index % 4) * 11,
      radius: 12 + (index % 3) * 7,
    },
    shadow: {
      preset: intent === "surface" ? (index % 2 ? "premium" : "soft") : "none",
      x: 0,
      y: 10,
      blur: 28,
      spread: 0,
      color: "#000000",
      opacity: 32,
    },
    glow: {
      preset: index % 4 === 0 ? "gold" : "none",
      color: palette.accent,
      intensity: index % 4 === 0 ? 32 : 0,
      blur: 18,
      spread: 1,
    },
    glass: {
      enabled: index % 5 === 0,
      transparency: 18,
      blur: 14,
      tint: palette.ink,
      borderOpacity: 18,
      highlight: 20,
    },
    gradient: {
      enabled: intent === "surface" && index % 3 === 1,
      type: index % 2 ? "linear" : "radial",
      start: palette.base,
      middle: palette.end,
      end: palette.base,
      angle: 135,
      position: 50,
    },
    filters: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      grayscale: 0,
      opacity: 100,
    },
    effectPreset: index % 5 === 0 ? "gold-glow" : index % 5 === 1 ? "vignette" : "none",
    blendMode: index % 2 ? "soft-light" : "normal",
    mask: index % 4 === 0 ? "rounded" : "none",
    motion: {
      preset: index % 6 === 0 ? "float" : "none",
      duration: 9000,
      delay: 0,
      intensity: 1,
      loop: index % 6 === 0,
    },
    responsive: { mobile: {}, tablet: {}, desktop: {} },
  };
}

const block = (id, type, order, props, styleValue, enabled = true) => ({
  id,
  type,
  order,
  enabled,
  name: type,
  props: { ...props, style: styleValue },
});
const link = (id, label, variant, accent) => ({
  id,
  label,
  url: "https://example.com",
  enabled: true,
  style: { variant, color: accent, textColor: "#ffffff", radius: 16, shadow: 18 },
});

function featureBlock(feature, order, palette, index) {
  const s = style(palette, index + order, "surface");
  const image = media[(index + order) % media.length];
  const base = {
    text: () =>
      block(
        `note-${index}`,
        "text",
        order,
        {
          text: "Un espacio editorial pensado para una presencia clara, memorable y propia.",
          align: "left",
          fontFamily: "Inter",
          color: palette.ink,
        },
        s,
      ),
    image: () =>
      block(
        `image-${index}`,
        "image",
        order,
        {
          label: "Detalle de marca",
          url: image,
          alt: "Detalle visual de plantilla",
          height: 188,
          fit: "cover",
          radius: 18,
          positionX: 50,
          positionY: 50,
        },
        s,
      ),
    video: () =>
      block(
        `video-${index}`,
        "video",
        order,
        {
          layout: index % 2 ? "two-column" : "full",
          aspectRatio: "16:9",
          color: palette.ink,
          items: [
            {
              id: `video-${index}-a`,
              title: "Presentación principal",
              url: "https://example.com/video",
            },
            {
              id: `video-${index}-b`,
              title: "Detrás del proceso",
              url: "https://example.com/process",
            },
          ],
        },
        s,
      ),
    cards: () =>
      block(
        `cards-${index}`,
        "cards",
        order,
        {
          layout: 2,
          items: [
            {
              id: `card-${index}-a`,
              title: "Selección curada",
              description: "Un recorrido breve por lo esencial.",
              cta: "Descubrir",
              ctaUrl: "https://example.com",
              imageUrl: image,
            },
            {
              id: `card-${index}-b`,
              title: "Próximo paso",
              description: "Reserva una conversación.",
              cta: "Reservar",
              ctaUrl: "https://example.com",
              imageUrl: pick(media, index + order + 1),
            },
          ],
        },
        s,
      ),
    gallery: () =>
      block(
        `gallery-${index}`,
        "gallery",
        order,
        {
          layout: index % 2 ? 3 : 2,
          gap: 8,
          radius: 14,
          aspectRatio: "1:1",
          items: media
            .slice(index % 3, (index % 3) + 3)
            .map((url, item) => ({ id: `gallery-${index}-${item}`, url })),
        },
        s,
      ),
    services: () =>
      block(
        `services-${index}`,
        "services",
        order,
        {
          layout: index % 2 ? 2 : 1,
          items: [
            {
              id: `service-${index}-a`,
              title: "Dirección creativa",
              description: "Sistema visual con intención.",
              cta: "Explorar",
              url: "https://example.com",
              icon: "sparkles",
              imageUrl: image,
            },
            {
              id: `service-${index}-b`,
              title: "Estrategia",
              description: "Decisiones claras para crecer.",
              cta: "Conocer",
              url: "https://example.com",
              icon: "star",
              imageUrl: pick(media, index + order + 1),
            },
          ],
        },
        s,
      ),
    products: () =>
      block(
        `products-${index}`,
        "products",
        order,
        {
          layout: 2,
          items: [
            {
              id: `product-${index}-a`,
              title: "Edición selecta",
              description: "Acceso a una experiencia principal.",
              price: "$ —",
              cta: "Ver detalles",
              url: "https://example.com",
              imageUrl: image,
            },
            {
              id: `product-${index}-b`,
              title: "Colección privada",
              description: "Una opción complementaria.",
              price: "$ —",
              cta: "Explorar",
              url: "https://example.com",
              imageUrl: pick(media, index + order + 1),
            },
          ],
        },
        s,
      ),
    booking: () =>
      block(
        `booking-${index}`,
        "booking",
        order,
        {
          title: "Agenda una sesión",
          description: "Elige un momento para conversar.",
          cta: "Reservar ahora",
          url: "https://example.com/booking",
        },
        s,
      ),
    faq: () =>
      block(
        `faq-${index}`,
        "faq",
        order,
        {
          layout: 1,
          items: [
            {
              id: `faq-${index}-a`,
              title: "¿Cómo empezamos?",
              description: "Con una conversación breve y objetivos claros.",
            },
            {
              id: `faq-${index}-b`,
              title: "¿Qué incluye?",
              description: "Una experiencia diseñada alrededor de tu marca.",
            },
          ],
        },
        s,
      ),
    contact: () =>
      block(
        `contact-${index}`,
        "contact",
        order,
        {
          title: "Hablemos",
          description: "Cuéntame qué quieres construir.",
          email: "hola@example.com",
          cta: "Enviar mensaje",
        },
        s,
      ),
    map: () =>
      block(
        `map-${index}`,
        "map",
        order,
        { title: "Estudio", address: "Ubicación por definir", cta: "Ver ubicación" },
        s,
      ),
    reviews: () =>
      block(
        `reviews-${index}`,
        "reviews",
        order,
        { layout: "cards", featuredId: "", items: [] },
        s,
      ),
    separator: () =>
      block(
        `separator-${index}`,
        "separator",
        order,
        { dividerStyle: index % 2 ? "double" : "solid", color: palette.accent, width: 1 },
        s,
      ),
    spacer: () =>
      block(
        `spacer-${index}`,
        "spacer",
        order,
        { height: 24 + (index % 3) * 10 },
        style(palette, index + order, "hero"),
      ),
    shape: () =>
      block(
        `shape-${index}`,
        "shape",
        order,
        {
          shape: index % 2 ? "blob" : "circle",
          color: palette.accent,
          stroke: palette.ink,
          opacity: 36,
          size: 104,
          rotation: 18,
          position: "top-right",
        },
        s,
      ),
    ring: () =>
      block(
        `ring-${index}`,
        "ring",
        order,
        { color: palette.accent, thickness: 2, size: 132, partial: true, position: "bottom-left" },
        s,
      ),
    ornament: () =>
      block(
        `ornament-${index}`,
        "ornament",
        order,
        {
          preset: index % 2 ? "gold-corner" : "art-deco",
          position: "top-left",
          insetX: 16,
          insetY: 16,
          size: 56,
          thickness: 2,
          color: palette.accent,
          opacity: 78,
        },
        s,
      ),
    frame: () =>
      block(
        `frame-${index}`,
        "frame",
        order,
        {
          preset: index % 2 ? "double" : "single",
          inset: 12,
          thickness: 1,
          color: palette.accent,
          opacity: 44,
          radius: 24,
        },
        s,
      ),
    particles: () =>
      block(
        `particles-${index}`,
        "particles",
        order,
        {
          preset: index % 2 ? "sparkle" : "soft-dots",
          quantity: 18,
          size: 3,
          opacity: 42,
          speed: 9,
          direction: index % 2 ? "down" : "up",
          color: palette.accent,
          randomness: 70,
          blur: 0,
        },
        s,
      ),
  };
  return base[feature]?.();
}

function blockReference(item, placement) {
  const result = { id: `ref-${item.id}`, kind: "block", enabled: true, blockId: item.id };
  return placement ? { ...result, style: { placement } } : result;
}

function branch(id, kind, children, style) {
  return style ? { id, kind, enabled: true, children, style } : { id, kind, enabled: true, children };
}

function buildComposition(blocks, macroFamily) {
  const remaining = new Map(blocks.filter((item) => item.enabled).map((item) => [item.type, item]));
  const take = (...types) => types.map((type) => { const item = remaining.get(type); remaining.delete(type); return item; }).filter(Boolean);
  const rest = () => [...remaining.values()].sort((left, right) => left.order - right.order).map(blockReference);
  const headline = () => take("heading", "text");
  const action = () => take("links", "booking", "contact");
  const identity = () => take("profile")[0];
  const visual = () => take("banner", "video", "image", "gallery")[0];

  if (macroFamily === "hero-overlay" || macroFamily === "ceremony-overlay") {
    const banner = take("banner")[0];
    const profile = identity();
    const cta = action();
    const intro = headline();
    const profileRef = profile && {
      ...blockReference(profile),
      style: { position: macroFamily === "ceremony-overlay" ? { positionMode: "free", x: 50, y: 84, zIndex: 9, width: 70 } : { positionMode: "anchored", anchor: "bottom-center", offsetY: 26, zIndex: 8, width: 72 } },
    };
    return {
      id: "root", kind: "root", enabled: true,
      children: [
        branch("hero-composition", "overlay", [banner && blockReference(banner), profileRef].filter(Boolean), { minHeight: macroFamily === "ceremony-overlay" ? 244 : 230, overflow: "visible" }),
        branch("hero-followup", "stack", [...cta.map(blockReference), ...intro.map(blockReference), ...rest()], { gap: 16, padding: 28 }),
      ],
    };
  }

  if (macroFamily === "cinematic-split" || macroFamily === "maker-split" || macroFamily === "journal-columns") {
    const media = visual();
    const profile = identity();
    const cta = action();
    const intro = headline();
    const left = macroFamily === "journal-columns" ? [media, ...take("faq", "map", "services")].filter(Boolean).map(blockReference) : media ? [blockReference(media)] : [];
    const right = macroFamily === "journal-columns" ? [...cta.map(blockReference), ...intro.map(blockReference), ...take("socials", "video", "gallery").map(blockReference)] : [...cta.map(blockReference), ...[profile, ...intro].filter(Boolean).map(blockReference)];
    const tracks = macroFamily === "maker-split" ? [60, 40] : macroFamily === "journal-columns" ? [50, 50] : [40, 60];
    return { id: "root", kind: "root", enabled: true, children: [branch("split-layout", "row", [branch("split-left", "column", left, { gap: 16 }), branch("split-right", "column", right, { gap: 16, justify: "center" })], { split: { direction: macroFamily === "maker-split" ? "row-reverse" : "row", tracks, collapse: "stack", minColumnWidth: 180 }, responsive: { mobile: { gap: 18 }, tablet: { gap: 20 }, desktop: { gap: 24 } }, padding: 22 }), branch("split-tail", "stack", rest(), { gap: 16, padding: 24 })] };
  }

  if (macroFamily === "commerce-grid" || macroFamily === "stream-grid" || macroFamily === "portfolio-mosaic") {
    const cover = visual();
    const profile = identity();
    const cta = action();
    const intro = headline();
    const gridItems = macroFamily === "portfolio-mosaic" ? take("gallery", "image", "video", "cards", "products") : take("products", "services", "cards", "gallery", "video", "links", "socials", "map", "faq");
    const columns = macroFamily === "commerce-grid" ? 3 : 2;
    return { id: "root", kind: "root", enabled: true, children: [cover ? branch("grid-cover", "section", [blockReference(cover)], { padding: 0, minHeight: 190, overflow: "hidden" }) : null, branch("grid-intro", "stack", [...cta.map(blockReference), ...[profile, ...intro].filter(Boolean).map(blockReference)], { gap: 12, padding: 24 }), branch("grid-gallery", "grid", gridItems.map((item, index) => blockReference(item, { columnStart: (index % columns) + 1, columnSpan: 1 })), { grid: { columns, autoFlow: "row" }, responsive: { mobile: { grid: { columns: 1 }, gap: 12 }, tablet: { grid: { columns: 2 }, gap: 16 }, desktop: { grid: { columns }, gap: 18 } }, padding: 24 }), branch("grid-tail", "stack", rest(), { gap: 14, padding: 24 })].filter(Boolean) };
  }

  if (macroFamily === "concierge-fixed-cta" || macroFamily === "market-fixed-cta") {
    const banner = take("banner")[0];
    const profile = identity();
    const cta = action();
    return { id: "root", kind: "root", enabled: true, children: [banner ? branch("fixed-hero", "overlay", [blockReference(banner), ...(profile ? [{ ...blockReference(profile), style: { position: { positionMode: "anchored", anchor: "bottom-center", offsetY: 22, zIndex: 7, width: 70 } } }] : [])], { minHeight: 220, overflow: "visible" }) : null, cta.length ? branch("fixed-cta", "fixed", cta.map(blockReference), { fixed: { edge: "bottom", inset: 14, zIndex: 16, safeArea: true, maxWidth: 340, reserveSpace: true } }) : null, branch("fixed-body", "stack", [...headline().map(blockReference), ...rest()], { gap: 16, padding: 28 })].filter(Boolean) };
  }

  if (macroFamily === "salon-journey") {
    const cover = visual();
    const profile = identity();
    const cta = action();
    const intro = headline();
    const story = take("services", "reviews", "booking", "faq", "contact");
    return { id: "root", kind: "root", enabled: true, children: [cover ? branch("journey-cover", "section", [blockReference(cover)], { padding: 0, minHeight: 210, overflow: "hidden" }) : null, branch("journey-action", "section", cta.map(blockReference), { padding: 24, gap: 12 }), branch("journey-intro", "section", [...[profile, ...intro].filter(Boolean).map(blockReference)], { padding: 28, gap: 14, minHeight: 200, verticalAlign: "center" }), ...story.map((item, index) => branch(`journey-step-${index + 1}`, "section", [blockReference(item)], { padding: 24, gap: 12 })), branch("journey-tail", "stack", rest(), { gap: 14, padding: 24 })].filter(Boolean) };
  }

  const profile = identity();
  const cta = action();
  const intro = headline();
  const cover = visual();
  return { id: "root", kind: "root", enabled: true, children: [branch("editorial-cover", "section", [...[cover, profile, ...intro].filter(Boolean).map(blockReference), ...cta.map(blockReference)], { padding: 28, gap: 14, minHeight: 180, verticalAlign: "center" }), branch("editorial-actions", "stack", rest(), { gap: 16, padding: 26 })] };
}

export function buildTemplate(recipe, index) {
  const palette = palettes[recipe.material];
  const title = recipe.id
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
  const blocks = [];
  blocks.push(
    block(
      "banner",
      "banner",
      0,
      {
        height: 164,
        imageUrl: sampleBanner(index),
        imageOpacity: 100,
        overlayColor: palette.base,
        overlayOpacity: 30,
        blend: "soft",
        blendStrength: 52,
        fusionMode: "soft",
        fusionDepth: 50,
        fusionStrength: 100,
        fit: "cover",
        positionX: 50,
        positionY: 50,
        radius: 0,
      },
      style(palette, index, "hero"),
      true,
    ),
  );
  blocks.push(
    block(
      "profile",
      "profile",
      1,
      {
        logo: title,
        avatarUrl: sampleAvatar(index),
        initials: title
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2),
        size: 76,
        shape: index % 3 ? "circle" : "rounded",
        borderWidth: 2,
        borderColor: palette.accent,
        shadow: 22,
        align: recipe.align,
        verticalPosition: "transition",
        overlap: 34,
        logoWidth: 150,
        logoAlign: recipe.align,
      },
      style(palette, index + 1),
      true,
    ),
  );
  blocks.push(
    block(
      "heading",
      "heading",
      2,
      {
        text: title,
        align: recipe.align,
        fontFamily: recipe.font,
        fontSize: recipe.id.includes("editorial") ? 34 : 30,
        fontWeight: 800,
        color: palette.ink,
        letterSpacing: -0.8,
        lineHeight: 1.04,
        transform: index % 3 === 0 ? "uppercase" : "none",
      },
      style(palette, index + 2),
      true,
    ),
  );
  blocks.push(
    block(
      "subtitle",
      "text",
      3,
      {
        text:
          index % 2
            ? "Una experiencia digital con ritmo, materia y propósito."
            : "Una presencia que transforma una visita en una conversación.",
        align: recipe.align,
        fontFamily: "Inter",
        fontSize: 13,
        color: palette.ink,
      },
      style(palette, index + 3),
      true,
    ),
  );
  blocks.push(
    block(
      "links",
      "links",
      4,
      {
        layout: recipe.linkLayout,
        linkStyleMode: "individual",
        items: [
          link(
            `cta-${index}-a`,
            recipe.linkLayout === 2 ? "Conocer" : "Reservar una conversación",
            index % 2 ? "glass" : "premium",
            palette.accent,
          ),
          link(
            `cta-${index}-b`,
            recipe.linkLayout === 2 ? "Agenda" : "Explorar colección",
            index % 3 ? "outline" : "gradient",
            palette.accent,
          ),
        ],
      },
      style(palette, index + 4),
      true,
    ),
  );
  let order = 5;
  recipe.extras.forEach((feature) => {
    const next = featureBlock(feature, order, palette, index);
    if (next) blocks.push(next);
    order += 1;
  });
  blocks.push(
    block(
      "socials",
      "socials",
      order++,
      {
        align: recipe.align,
        gap: 12,
        size: 18,
        color: palette.accent,
        socialStyle: index % 2 ? "glass" : "simple",
        items: [
          {
            id: `instagram-${index}`,
            network: "instagram",
            url: "https://instagram.com",
            enabled: true,
          },
          { id: `website-${index}`, network: "website", url: "https://example.com", enabled: true },
          { id: `email-${index}`, network: "email", url: "mailto:hola@example.com", enabled: true },
        ],
      },
      style(palette, index + 5),
      true,
    ),
  );
  blocks.push(
    block(
      "footer",
      "footer",
      order,
      {
        topText: "",
        bottomText: "Una plantilla Cripqer",
        align: recipe.align,
        fontFamily: "DM Mono",
        fontSize: 8,
        color: palette.ink,
        opacity: 62,
        divider: index % 2 === 0,
        preset: "minimal",
      },
      style(palette, index + 6),
      true,
    ),
  );
  const macroFamily = recipe.macroFamily ?? macroFamilies[index % macroFamilies.length];
  return {
    id: `power-${recipe.id}`,
    name: title,
    category: recipe.material,
    archetype: recipe.id,
    page_config: {
      version: 6,
      profile: "premium",
      capabilities: {
        maxLinks: 40,
        allowVideos: true,
        allowCards: true,
        allowSocials: true,
        allowGallery: true,
        allowAdvancedStyles: true,
        allowAdvancedLayouts: true,
        allowProducts: true,
        allowBooking: true,
        allowDecorations: true,
        allowParticles: true,
        allowAnimations: true,
        allowResponsive: true,
        allowPresets: true,
        allowImportExport: true,
        canRemoveCripqerBranding: true,
      },
      branding: { showCripqerWatermark: true },
      theme: {
        fontFamily: recipe.font,
        titleColor: palette.ink,
        fontSize: 30,
        fontWeight: 800,
        buttonColor: palette.accent,
        buttonRadius: 16,
        buttonGap: 12,
        buttonHeight: 48,
        buttonPaddingX: 18,
        buttonPaddingY: 11,
        titleShadow: 12,
      },
      background: {
        base: palette.base,
        gradientEnd: palette.end,
        gradient: true,
        angle: 135 + ((index * 11) % 160),
        pattern: palette.pattern,
        patternColor: palette.ink,
        patternOpacity: 8,
        texture: palette.texture,
        light: palette.light,
      },
      presets: [],
      blocks,
      composition: buildComposition(blocks, macroFamily),
    },
  };
}

function blockSequence(node, byId, path = "root") {
  if (node.kind === "block") return [{ path, type: byId.get(node.blockId)?.type ?? "missing" }];
  return node.children.flatMap((child, index) => blockSequence(child, byId, `${path}/${node.kind}:${index}`));
}

export function macroFingerprint(page) {
  if (!page.composition) return "legacy-flat-v5";
  const byId = new Map(page.blocks.map((item) => [item.id, item]));
  const nodes = [];
  const visit = (node, path = "root") => {
    if (node.kind === "block") return;
    const style = node.style ?? {};
    nodes.push(`${path}:${node.kind}:${style.grid?.columns ?? ""}:${style.split?.tracks?.join("-") ?? ""}:${style.position?.positionMode ?? ""}:${style.fixed?.edge ?? ""}`);
    node.children.forEach((child, index) => visit(child, `${path}/${node.kind}[${index}]`));
  };
  visit(page.composition);
  return [...nodes, ...blockSequence(page.composition, byId).map((item) => `${item.path}:${item.type}`)].join("|");
}

function similarity(left, right) {
  const union = new Set([...left, ...right]);
  return union.size ? [...left].filter((item) => right.has(item)).length / union.size : 1;
}

function cosmeticSet(template) {
  const page = template.page_config;
  return new Set([template.category, page.theme.fontFamily, page.background.pattern, page.background.texture, page.background.light, page.theme.buttonColor]);
}

function blockSet(template) {
  return new Set(template.page_config.blocks.filter((item) => item.enabled).map((item) => item.type));
}

function mediaSet(template) {
  const page = template.page_config;
  const banner = page.blocks.find((item) => item.type === "banner")?.props.imageUrl;
  const avatar = page.blocks.find((item) => item.type === "profile")?.props.avatarUrl;
  const gallery = page.blocks.find((item) => item.type === "gallery")?.props.items ?? [];
  return new Set([banner, avatar, ...gallery.map((item) => item.url)].filter(Boolean));
}

const premiumBlockTypes = new Set([
  "video",
  "cards",
  "gallery",
  "services",
  "products",
  "booking",
  "faq",
  "contact",
  "map",
  "shape",
  "ring",
  "ornament",
  "frame",
  "particles",
]);

function visualAssetCount(page) {
  return page.blocks.reduce((count, block) => {
    if (!block.enabled) return count;
    if (block.type === "banner" && block.props.imageUrl) return count + 1;
    if (block.type === "profile" && block.props.avatarUrl) return count + 1;
    if (block.type === "image" && block.props.url) return count + 1;
    if (block.type === "gallery") return count + ((block.props.items ?? []).filter((item) => item.url).length);
    if (block.type === "cards" || block.type === "services" || block.type === "products")
      return count + ((block.props.items ?? []).filter((item) => item.imageUrl).length);
    return count;
  }, 0);
}

function buttonVariantCount(page) {
  const links = page.blocks.find((item) => item.type === "links");
  return new Set((links?.props.items ?? []).map((item) => item.style?.variant).filter(Boolean)).size;
}

function styleSignalCount(page) {
  const visualStyles = page.blocks.map((block) => block.props.style ?? {});
  return [
    page.background.gradient,
    page.background.pattern && page.background.pattern !== "none",
    page.background.texture && page.background.texture !== "none",
    page.background.light && page.background.light !== "none",
    visualStyles.some((item) => item.effectPreset && item.effectPreset !== "none"),
    visualStyles.some((item) => item.motion?.preset && item.motion.preset !== "none"),
    page.blocks.some((block) => ["shape", "ring", "ornament", "frame", "particles"].includes(block.type) && block.enabled),
  ].filter(Boolean).length;
}

function premiumQuality(template) {
  const page = template.page_config;
  const byId = new Map(page.blocks.map((item) => [item.id, item]));
  const sequence = blockSequence(page.composition, byId);
  const banner = page.blocks.find((item) => item.type === "banner");
  const profile = page.blocks.find((item) => item.type === "profile");
  const premiumBlocks = page.blocks.filter((item) => item.enabled && premiumBlockTypes.has(item.type)).length;
  const quality = {
    id: template.id,
    hasHeroBanner: Boolean(banner?.enabled && String(banner.props.imageUrl ?? "").startsWith(sampleAssetBase)),
    hasAvatarImage: Boolean(String(profile?.props.avatarUrl ?? "").startsWith(`${sampleAssetBase}avatar-`)),
    firstBlockType: sequence[0]?.type ?? "",
    buttonVariants: buttonVariantCount(page),
    premiumBlocks,
    visualAssets: visualAssetCount(page),
    styleSignals: styleSignalCount(page),
  };
  const weakReasons = [];
  if (!quality.hasHeroBanner) weakReasons.push("missing-hero-banner");
  if (!quality.hasAvatarImage) weakReasons.push("missing-avatar-image");
  if (quality.firstBlockType !== "banner") weakReasons.push("hero-not-first");
  if (quality.buttonVariants < 2) weakReasons.push("flat-buttons");
  if (quality.premiumBlocks < 4) weakReasons.push("few-premium-blocks");
  if (quality.visualAssets < 3) weakReasons.push("few-visual-assets");
  if (quality.styleSignals < 2) weakReasons.push("few-style-signals");
  return { ...quality, weakReasons };
}

function sharesVerticalSpine(template) {
  const page = template.page_config;
  if (!page.composition) return true;
  const types = blockSequence(page.composition, new Map(page.blocks.map((item) => [item.id, item]))).map((item) => item.type);
  const spine = ["profile", "heading", "text", "links"];
  return spine.every((type, index) => types.indexOf(type) >= 0 && (index === 0 || types.indexOf(type) > types.indexOf(spine[index - 1])));
}

export function fingerprint(template) {
  const page = template.page_config;
  const links = page.blocks.find((item) => item.type === "links");
  return JSON.stringify({
    material: template.category,
    banner: page.blocks.find((item) => item.type === "banner")?.enabled,
    avatar: page.blocks.find((item) => item.type === "profile")?.props.avatarUrl
      ? "image"
      : "monogram",
    font: page.theme.fontFamily,
    ctaColumns: links?.props.layout,
    blocks: page.blocks.filter((item) => item.enabled).map((item) => item.type),
    macro: macroFingerprint(page),
    pattern: page.background.pattern,
    texture: page.background.texture,
  });
}

function featureSet(template) {
  const page = template.page_config;
  const links = page.blocks.find((item) => item.type === "links");
  const profile = page.blocks.find((item) => item.type === "profile");
  const video = page.blocks.find((item) => item.type === "video");
  return new Set([
    `material:${template.category}`,
    `banner:${Boolean(page.blocks.find((item) => item.type === "banner")?.enabled)}`,
    `avatar:${profile?.props.avatarUrl ? "image" : "monogram"}`,
    `align:${profile?.props.align ?? "center"}`,
    `font:${page.theme.fontFamily}`,
    `cta-columns:${links?.props.layout ?? 1}`,
    `video-layout:${video?.props.layout ?? "none"}`,
    `background:${page.background.pattern}/${page.background.texture}/${page.background.light}`,
    `macro:${macroFingerprint(page)}`,
    ...page.blocks.filter((item) => item.enabled).map((item) => `block:${item.type}`),
  ]);
}

function pairwiseDistance(templates) {
  let minimum = Infinity;
  for (let left = 0; left < templates.length; left += 1)
    for (let right = left + 1; right < templates.length; right += 1) {
      const a = featureSet(templates[left]);
      const b = featureSet(templates[right]);
      const shared = [...a].filter((item) => b.has(item)).length;
      minimum = Math.min(minimum, a.size + b.size - 2 * shared);
    }
  return Number.isFinite(minimum) ? minimum : 0;
}

export function auditTemplates(templates) {
  const prints = templates.map(fingerprint);
  const duplicates = prints.filter((item, index) => prints.indexOf(item) !== index);
  const quality = templates.map(premiumQuality);
  const weakPremiumTemplates = quality
    .filter((item) => item.weakReasons.length)
    .map((item) => ({ id: item.id, reasons: item.weakReasons }));
  const coverage = [
    ...new Set(
      templates.flatMap((template) =>
        template.page_config.blocks.filter((block) => block.enabled).map((block) => block.type),
      ),
    ),
  ].sort();
  const minFeatureDistance = pairwiseDistance(templates);
  const macroFingerprints = templates.map((template) => macroFingerprint(template.page_config));
  const pairs = [];
  for (let left = 0; left < templates.length; left += 1) for (let right = left + 1; right < templates.length; right += 1) {
    const cosmeticSimilarity = similarity(cosmeticSet(templates[left]), cosmeticSet(templates[right]));
    const blockSimilarity = similarity(blockSet(templates[left]), blockSet(templates[right]));
    const mediaSimilarity = similarity(mediaSet(templates[left]), mediaSet(templates[right]));
    const macroSimilarity = macroFingerprints[left] === macroFingerprints[right] ? 1 : 0;
    const sharedVerticalSpine = sharesVerticalSpine(templates[left]) && sharesVerticalSpine(templates[right]);
    const perceptualSimilarity = Number((macroSimilarity * .5 + blockSimilarity * .24 + mediaSimilarity * .16 + cosmeticSimilarity * .1 + (sharedVerticalSpine ? .12 : 0)).toFixed(3));
    pairs.push({ left: templates[left].id, right: templates[right].id, cosmeticSimilarity: Number(cosmeticSimilarity.toFixed(3)), blockSimilarity: Number(blockSimilarity.toFixed(3)), mediaSimilarity: Number(mediaSimilarity.toFixed(3)), macroSimilarity, sharedVerticalSpine, perceptualSimilarity });
  }
  const maxPerceptualSimilarity = pairs.length ? Math.max(...pairs.map((pair) => pair.perceptualSimilarity)) : 0;
  const commonVerticalSpineTemplates = templates.filter(sharesVerticalSpine).map((template) => template.id);
  return {
    templateCount: templates.length,
    distinctFingerprints: new Set(prints).size,
    duplicateFingerprints: duplicates.length,
    minFeatureDistance,
    diversity: {
      cosmeticDistinct: new Set(templates.map((template) => JSON.stringify([...cosmeticSet(template)].sort()))).size,
      blockDistinct: new Set(templates.map((template) => JSON.stringify([...blockSet(template)].sort()))).size,
      macroDistinct: new Set(macroFingerprints).size,
      mediaDistinct: new Set(templates.map((template) => JSON.stringify([...mediaSet(template)].sort()))).size,
      maxPerceptualSimilarity,
      commonVerticalSpineTemplates,
      pairwise: pairs,
    },
    quality,
    weakPremiumTemplates,
    coverage,
    missingBlockTypes: [
      "banner",
      "profile",
      "heading",
      "text",
      "links",
      "socials",
      "image",
      "video",
      "cards",
      "separator",
      "spacer",
      "gallery",
      "services",
      "reviews",
      "products",
      "booking",
      "faq",
      "contact",
      "map",
      "shape",
      "ring",
      "ornament",
      "frame",
      "particles",
      "footer",
    ].filter((type) => !coverage.includes(type)),
    pass: duplicates.length === 0 && minFeatureDistance >= 3 && coverage.length === 25 && new Set(macroFingerprints).size === templates.length && maxPerceptualSimilarity < .72 && commonVerticalSpineTemplates.length < templates.length && weakPremiumTemplates.length === 0,
  };
}

export function createTemplatePack() {
  const templates = recipes.map(buildTemplate);
  return {
    schema: "cripqer.power-editor-template-pack.v3",
    generatedAt: new Date(0).toISOString(),
    seed: "power-editor-premium-assets-v3",
    generatorVersion: "premium-assets-v3",
    templates,
    audit: auditTemplates(templates),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = resolve(
    process.cwd(),
    process.argv[2] || "artifacts/power-editor-template-pack.json",
  );
  const pack = createTemplatePack();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`);
  console.log(JSON.stringify(pack.audit, null, 2));
}

