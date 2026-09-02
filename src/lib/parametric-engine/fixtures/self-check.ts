/**
 * Deterministic engine SELF-CHECK.
 *
 * Pure, framework-free assertions covering the V1 hardening contract:
 * original fixtures, design overrides, locking, hero modes, composition
 * variants, destination validation, capability fallbacks, CTA ordering,
 * blob safety and determinism. Call runEngineSelfCheck() from any runner.
 */

import { generatePageRecipe, tryGeneratePageRecipe, DEFAULT_CAPABILITIES } from "..";
import { SAMPLE_INTENTS, SAMPLE_INTENT_BY_ID, INVALID_INTENT } from "./intents";
import { EXPECTED_RECIPES, summarize } from "./expected-recipes";

export interface SelfCheckResult {
  passed: number;
  failed: number;
  failures: string[];
}

export function runEngineSelfCheck(): SelfCheckResult {
let pass = 0;
let fail = 0;
const failures: string[] = [];
const t = (name: string, cond: boolean, extra = "") => {
  if (cond) pass++;
  else {
    fail++;
    failures.push(extra ? `${name} (${extra})` : name);
  }
};
const NOW = "2026-01-01T00:00:00.000Z";
const base = SAMPLE_INTENT_BY_ID["creator-portfolio-modern"]!;

// 1. original fixtures
for (const { id, intent } of SAMPLE_INTENTS) {
  const r = generatePageRecipe(intent, { now: NOW });
  t(`fixture ${id}`, JSON.stringify(summarize(r)) === JSON.stringify(EXPECTED_RECIPES[id]),
    JSON.stringify(summarize(r)));
}
t("invalid intent rejected", tryGeneratePageRecipe(INVALID_INTENT as never).ok === false);

// 2. overrides
const ov = generatePageRecipe(base, { now: NOW, overrides: { links_presentation: "buttons", identity_alignment: "center", density: "compact", visual_family: "minimal" } });
t("override links buttons", ov.structure.links.presentation === "buttons");
t("override alignment", ov.structure.hero.identity_alignment === "center");
t("override density", ov.design.geometry.density === "compact" && ov.design.spacing.horizontal_padding !== "compact");
t("override family", ov.meta.family === "minimal");

// 3. locked survives variants
for (const v of [0,1,2,3,4,5,7,11]) {
  const rc = generatePageRecipe(base, { now: NOW, variant: v, overrides: { links_presentation: "cards", locked: ["links_presentation"] } });
  t(`locked cards v${v}`, rc.structure.links.presentation === "cards", rc.structure.links.presentation);
  const rb = generatePageRecipe(base, { now: NOW, variant: v, overrides: { links_presentation: "buttons", locked: ["links_presentation"] } });
  t(`locked buttons v${v}`, rb.structure.links.presentation === "buttons", rb.structure.links.presentation);
  const rd = generatePageRecipe(base, { now: NOW, variant: v, overrides: { density: "spacious", identity_alignment: "left", locked: ["density","identity_alignment"] } });
  t(`locked density/align v${v}`, rd.design.geometry.density === "spacious" && rd.structure.hero.identity_alignment === "left");
}

// 4. hero modes
const banner = { ...base, identity: { ...base.identity, banner_preview: "https://cdn.example.com/b.jpg" } };
const hm = (mode: any, intent = banner) => generatePageRecipe(intent, { now: NOW, overrides: { hero_mode: mode } }).structure.hero;
t("banner_avatar", hm("banner_avatar").mode === "banner_avatar" && hm("banner_avatar").show_banner && hm("banner_avatar").show_avatar);
t("avatar_only", hm("avatar_only").mode === "avatar_only" && !hm("avatar_only").show_banner);
t("banner_only", hm("banner_only").mode === "banner_only" && !hm("banner_only").show_avatar);
t("auto banner_avatar", generatePageRecipe(banner, { now: NOW }).structure.hero.mode === "banner_avatar");
t("hero_banner capability fallback", generatePageRecipe(banner, { now: NOW, capabilities: { hero_banner: false }, overrides: { hero_mode: "banner_only", locked: ["hero_mode"] } }).structure.hero.mode === "avatar_only");

// 5. composition variants meaningfully differ
const sigs = new Set<string>();
for (let v = 0; v < 8; v++) {
  const r = generatePageRecipe(base, { now: NOW, variant: v });
  sigs.add([r.meta.family, r.structure.hero.mode, r.structure.links.presentation, r.structure.hero.identity_alignment, r.design.geometry.density, r.design.card.media_position].join("|"));
}
t("composition variants differ", sigs.size >= 3, String(sigs.size));

// 6. destination validation
const bad = (type: any, value: string) => tryGeneratePageRecipe({ ...base, primary_action: { type, value } }).ok === false;
t("malformed website rejected", bad("website", "notaurl"));
t("malformed booking rejected", bad("booking", "www.foo"));
t("malformed email rejected", bad("email", "foo@@bar"));
t("malformed whatsapp rejected", bad("whatsapp", "12345"));
t("malformed whatsapp letters rejected", bad("whatsapp", "+56 9 abc 1234"));
t("malformed instagram rejected", bad("instagram", "@bad handle!"));
t("valid destinations accepted", tryGeneratePageRecipe({ ...base, primary_action: { type: "instagram", value: "https://instagram.com/camila.ossa" } }).ok === true);

// 7. media capability fallback
const noMedia = generatePageRecipe(base, { now: NOW, capabilities: { card_media_right: false, card_media_bottom: false } });
t("no unsupported media", noMedia.design.card.media_position === "none" && !noMedia.blocks.some(b => b.type === "media"));
const onlyRight = generatePageRecipe(base, { now: NOW, capabilities: { card_media_bottom: false } });
t("bottom->right fallback", onlyRight.design.card.media_position === "right");

// 8. CTA order on downgrade
const noCards = generatePageRecipe(SAMPLE_INTENT_BY_ID["professional-leads-professional"]!, { now: NOW, capabilities: { professional_cards: false } });
const types = noCards.blocks.map(b => b.type);
t("cta before link_list", types.indexOf("primary_cta") < types.indexOf("link_list"), types.join(","));
t("cta present once", types.filter(x => x === "primary_cta").length === 1);

// 9. blob avatar
const blob = { ...base, identity: { ...base.identity, avatar_preview: "blob:http://x/1" } };
const rb2 = generatePageRecipe(blob, { now: NOW });
t("blob never serialized", rb2.identity.avatar === null && !JSON.stringify(rb2).includes("blob:"));
t("blob still influences hero", rb2.structure.hero.show_avatar === true);

// 10. determinism
const opts = { variant: 3, overrides: { density: "compact" as const, locked: ["density" as const] } };
const strip = (r: any) => JSON.stringify({ ...r, meta: { ...r.meta, generated_at: "X" } });
const d1 = strip(generatePageRecipe(base, { ...opts, now: NOW }));
const d2 = strip(generatePageRecipe(base, { ...opts, now: "2030-05-05T00:00:00.000Z" }));
const d3 = strip(generatePageRecipe(structuredClone(base), { ...opts, now: NOW }));
t("determinism", d1 === d2 && d1 === d3);
t("frozen output", Object.isFrozen(generatePageRecipe(base, { now: NOW })));
t("caps default hero_banner", DEFAULT_CAPABILITIES.hero_banner === true);

return { passed: pass, failed: fail, failures };
}
