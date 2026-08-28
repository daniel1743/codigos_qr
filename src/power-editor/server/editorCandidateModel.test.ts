import { describe, expect, it } from "vitest";
import { addContent, allBlocks, applyStylePreset, bringBlockToFront, capabilityProfiles, clonePageConfig, duplicateLink, getBlock, getBlockStyle, getLinks, getPublishIssues, hydratePageConfig, initialPageConfig, removeLink, reorderBlock, reorderLink, resolveResponsiveStyle, saveStylePreset, sendBlockToBack, setGroup, switchProfile, toolsetForBlock, updateBlock, updateBlockStyle, updateLink } from "../client/src/lib/editorCandidateModel";

describe("modelo estructural del editor candidato", () => {
  it("usa bloques ordenados como única fuente de verdad", () => {
    const page = reorderBlock(clonePageConfig(initialPageConfig), 5, 4);
    expect(page.blocks.find(block => block.id === "socials")?.order).toBe(4);
    expect(page.blocks.find(block => block.id === "links")?.order).toBe(5);
  });

  it("inicia el banner en modo Fusión sin retirar Recto ni Personalizado", () => {
    expect(getBlock(initialPageConfig, "banner")?.props.fusionMode).toBe("soft");
  });

  it("permite agregar seis enlaces, editarlos, reordenarlos, duplicarlos y borrarlos", () => {
    let page = clonePageConfig(initialPageConfig);
    for (let index = 0; index < 4; index += 1) page = addContent(page, "link").config;
    const linksBlock = getBlock(page, "links");
    expect(getLinks(linksBlock)).toHaveLength(6);
    page = updateLink(page, "links", getLinks(linksBlock)[0].id, { url: "https://example.com/destino" });
    expect(getLinks(getBlock(page, "links"))[0].url).toBe("https://example.com/destino");
    page = reorderLink(page, "links", 0, 5);
    const duplicated = duplicateLink(page, "links", getLinks(getBlock(page, "links"))[0].id);
    expect(getLinks(getBlock(duplicated.config, "links"))).toHaveLength(7);
    page = removeLink(duplicated.config, "links", duplicated.linkId!);
    expect(getLinks(getBlock(page, "links"))).toHaveLength(6);
  });

  it("aplica límites configurables sin bifurcar el modelo", () => {
    let dynamic = clonePageConfig(initialPageConfig);
    dynamic = addContent(dynamic, "link").config;
    const page = switchProfile(dynamic, "fixed");
    const result = addContent(page, "link");
    expect(page.capabilities).toEqual(capabilityProfiles.fixed);
    expect(getLinks(getBlock(page, "links"))).toHaveLength(3);
    expect(result.blocked).toBe(true);
  });

  it("permite el primer enlace y bloquea el segundo para un QR fijo vacío", () => {
    let page = switchProfile(clonePageConfig(initialPageConfig), "fixed");
    page = {
      ...page,
      blocks: page.blocks.map(block => block.type === "links" ? { ...block, props: { ...block.props, items: [] } } : block),
    };
    const first = addContent(page, "link");
    const second = addContent(first.config, "link");
    expect(first.blocked).toBe(false);
    expect(second.blocked).toBe(true);
  });

  it("crea bloques de contenido solo cuando la capacidad lo permite", () => {
    const fixed = switchProfile(clonePageConfig(initialPageConfig), "fixed");
    expect(addContent(fixed, "video").blocked).toBe(true);
    expect(addContent(clonePageConfig(initialPageConfig), "video").blocked).toBe(false);
  });

  it("migra vídeos guardados por el candidato previo a items estructurados", () => {
    const page = clonePageConfig(initialPageConfig);
    page.blocks.push({ id: "legacy-video", type: "video", order: 7, enabled: true, props: { title: "Demo anterior", url: "https://example.com" } });
    const migrated = hydratePageConfig(page);
    expect((getBlock(migrated, "legacy-video")?.props.items as Array<{ title: string }>)[0]?.title).toBe("Demo anterior");
  });

  it("crea tarjetas y vídeos como bloques reales con IDs estables", () => {
    let page = clonePageConfig(initialPageConfig);
    const cards = addContent(page, "cards"); page = cards.config;
    const video = addContent(page, "video"); page = video.config;
    expect(getBlock(page, cards.blockId!)?.type).toBe("cards");
    expect(getBlock(page, video.blockId!)?.type).toBe("video");
    expect((getBlock(page, video.blockId!)?.props.items as Array<{ id: string }>)[0]?.id).toMatch(/^video-/);
  });

  it("preserva capas ocultas al reordenar la colección canónica", () => {
    let page = clonePageConfig(initialPageConfig);
    page = updateBlock(page, "socials", { enabled: false });
    page = reorderBlock(page, 5, 4);
    expect(allBlocks(page).find(block => block.id === "socials")?.enabled).toBe(false);
    expect(allBlocks(page).findIndex(block => block.id === "socials")).toBe(4);
  });

  it("crea bloques avanzados y valida restricciones antes de publicar", () => {
    let page = clonePageConfig(initialPageConfig);
    const gallery = addContent(page, "gallery"); page = gallery.config;
    const services = addContent(page, "services", gallery.blockId); page = services.config;
    const booking = addContent(page, "booking", services.blockId); page = booking.config;
    expect(getBlock(page, gallery.blockId!)?.type).toBe("gallery");
    expect(getBlock(page, services.blockId!)?.type).toBe("services");
    expect(getBlock(page, booking.blockId!)?.type).toBe("booking");
    expect(getPublishIssues(switchProfile(page, "fixed"))).not.toHaveLength(0);
  });

  it("persiste estilo visual y override responsive sin duplicar el bloque", () => {
    let page = clonePageConfig(initialPageConfig);
    page = updateBlockStyle(page, "heading", { border: { ...getBlockStyle(getBlock(page, "heading")).border, style: "solid", width: 3 }, responsive: { mobile: { fontSize: 24, align: "left" } } });
    const heading = getBlock(page, "heading")!;
    expect(getBlockStyle(heading).border.width).toBe(3);
    expect(resolveResponsiveStyle(heading, "mobile").composition.align).toBe("left");
    expect(getBlockStyle(heading).responsive.mobile.fontSize).toBe(24);
    expect(page.blocks.filter(block => block.id === "heading")).toHaveLength(1);
  });

  it("crea decoraciones premium, respeta límites de partículas y bloquea su alta fuera de premium", () => {
    let premium = clonePageConfig(initialPageConfig);
    const shape = addContent(premium, "shape"); premium = shape.config;
    const particleResult = addContent(premium, "particles", shape.blockId); premium = particleResult.config;
    const particles = getBlock(premium, particleResult.blockId!)!;
    expect(getBlock(premium, shape.blockId!)?.type).toBe("shape");
    expect(particles.type).toBe("particles");
    expect(Number(particles.props.quantity)).toBeLessThanOrEqual(28);
    expect(addContent(switchProfile(premium, "dynamic"), "particles").blocked).toBe(true);
  });

  it("agrupa capas, reordena el foco Z y copia un preset de estilo", () => {
    let page = clonePageConfig(initialPageConfig);
    page = setGroup(page, ["heading", "subtitle"], "group-test");
    expect(getBlock(page, "heading")?.groupId).toBe("group-test");
    expect(getBlock(page, "subtitle")?.groupId).toBe("group-test");
    page = bringBlockToFront(page, "heading");
    expect(allBlocks(page).at(-1)?.id).toBe("heading");
    page = sendBlockToBack(page, "heading");
    expect(allBlocks(page)[0]?.id).toBe("heading");
    page = saveStylePreset(page, "Borde cobre", "effects", getBlock(page, "links")!);
    page = applyStylePreset(page, "heading", page.presets[0].id);
    expect(getBlockStyle(getBlock(page, "heading")).border.radius).toBe(getBlockStyle(getBlock(page, "links")).border.radius);
  });

  it("no siembra reseñas ni ratings cuando se añade una colección de testimonios", () => {
    const result = addContent(clonePageConfig(initialPageConfig), "reviews");
    const reviews = getBlock(result.config, result.blockId!)!;
    expect(reviews.type).toBe("reviews");
    expect(reviews.props.items).toEqual([]);
  });

  it("limita herramientas avanzadas a bloques donde producen un efecto real", () => {
    let page = clonePageConfig(initialPageConfig);
    const shapeResult = addContent(page, "shape"); page = shapeResult.config;
    const shape = getBlock(page, shapeResult.blockId!)!;
    expect(toolsetForBlock(shape)).not.toContain("advanced");
    expect(toolsetForBlock(getBlock(page, "socials"))).not.toContain("advanced");
    expect(toolsetForBlock(getBlock(page, "heading"))).toContain("advanced");
    expect(toolsetForBlock(getBlock(page, "links"))).toContain("advanced");
  });

  it("inserta contenido después de la selección y antes del footer cuando no hay selección", () => {
    const afterHeading = addContent(clonePageConfig(initialPageConfig), "text", "heading");
    const orderedAfterHeading = allBlocks(afterHeading.config);
    expect(orderedAfterHeading[orderedAfterHeading.findIndex(block => block.id === "heading") + 1]?.id).toBe(afterHeading.blockId);
    const beforeFooter = addContent(clonePageConfig(initialPageConfig), "cards");
    const orderedBeforeFooter = allBlocks(beforeFooter.config);
    expect(orderedBeforeFooter[orderedBeforeFooter.findIndex(block => block.id === "footer") - 1]?.id).toBe(beforeFooter.blockId);
  });

  it("mantiene Fondo disponible desde bloques existentes y conserva texturas reparadas", () => {
    const page = hydratePageConfig({ ...clonePageConfig(initialPageConfig), background: { ...initialPageConfig.background, texture: "paper" } });
    expect(toolsetForBlock(getBlock(page, "heading"))).toContain("background");
    expect(toolsetForBlock(getBlock(page, "image"))).toContain("background");
    expect(page.background.texture).toBe("paper");
    expect(hydratePageConfig({ ...page, background: { ...page.background, texture: "metallic" } }).background.texture).toBe("metallic");
  });

  it("conserva radio, aspecto y gap de galería junto con overrides responsive", () => {
    let page = addContent(clonePageConfig(initialPageConfig), "gallery").config;
    const gallery = page.blocks.at(-1)!;
    page = updateBlock(page, gallery.id, { props: { gap: 17, radius: 12, aspectRatio: "1 / 1", layout: 3 } });
    page = updateBlockStyle(page, gallery.id, { responsive: { mobile: { columns: 1, gap: 9 } } });
    const repaired = getBlock(page, gallery.id)!;
    expect(repaired.props.gap).toBe(17);
    expect(repaired.props.radius).toBe(12);
    expect(repaired.props.aspectRatio).toBe("1 / 1");
    expect(resolveResponsiveStyle(repaired, "mobile").composition.columns).toBe(1);
  });

  it("conserva aspect ratio de vídeo, bloqueo de capa y propiedades de decoración reparadas", () => {
    let page = addContent(clonePageConfig(initialPageConfig), "video").config;
    const video = page.blocks.at(-1)!;
    page = updateBlock(page, video.id, { props: { aspectRatio: "4:5", layout: "two-column" } });
    page = updateBlock(page, "heading", { locked: true });
    page = addContent(page, "shape").config;
    const shape = page.blocks.at(-1)!;
    page = updateBlock(page, shape.id, { props: { stroke: "#ffffff", size: 96 } });
    page = addContent(page, "ornament").config;
    const ornament = page.blocks.at(-1)!;
    page = updateBlock(page, ornament.id, { props: { insetX: 14, insetY: 9 } });
    expect(getBlock(page, video.id)?.props.aspectRatio).toBe("4:5");
    expect(getBlock(page, "heading")?.locked).toBe(true);
    expect(getBlock(page, shape.id)?.props.stroke).toBe("#ffffff");
    expect(getBlock(page, ornament.id)?.props.insetX).toBe(14);
    expect(getBlock(page, ornament.id)?.props.insetY).toBe(9);
  });

  it("migra footer, branding y perfil visual sin perder configuraciones heredadas", () => {
    const legacy = clonePageConfig(initialPageConfig);
    const footer = getBlock(legacy, "footer")!;
    const { bottomText: _bottomText, topText: _topText, ...legacyFooterProps } = footer.props;
    const migrated = hydratePageConfig({ ...legacy, branding: undefined as never, blocks: legacy.blocks.map(block => block.id === "footer" ? { ...block, props: { ...legacyFooterProps, text: "dominio.cripqer" } } : block) });
    expect(migrated.branding.showCripqerWatermark).toBe(true);
    expect(getBlock(migrated, "footer")?.props.bottomText).toBe("dominio.cripqer");
    expect(getBlock(migrated, "profile")?.props.verticalPosition).toBeDefined();
  });

  it("hereda el estilo del primer enlace activo al agregar enlaces nuevos", () => {
    let page = clonePageConfig(initialPageConfig);
    const first = getLinks(getBlock(page, "links"))[0]!;
    page = updateLink(page, "links", first.id, { style: { variant: "premium", color: "#c49a68" } });
    const result = addContent(page, "link");
    const added = getLinks(getBlock(result.config, "links")).at(-1)!;
    expect(added.style?.variant).toBe("premium");
    expect(added.style?.color).toBe("#c49a68");
  });
});
