import {
  createBasicEditorPatch,
  mergeBasicEditorTemplateConfig,
  pickBasicEditorTemplateConfigPatch,
} from "./patch.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function runBasicEditorPersistenceSelfCheck() {
  const premiumConfig = {
    schemaVersion: 1,
    editorConfig: {
      texture: { type: "linen", intensity: 0.4 },
      frame: { preset: "premium" },
      gradient: { from: "#101010", to: "#303030" },
      motion: { preset: "soft-rise" },
      cards: { radius: 28, shadow: "elevated" },
    },
  };
  const current = {
    ...premiumConfig,
    basic_link_presentations: { "link-1": { presentation: "button" } },
    professional_badge: false,
  };

  const patch = createBasicEditorPatch({
    id: "profile-id-that-must-not-be-patched",
    user_id: "owner-id-that-must-not-be-patched",
    public_id: "public-id-that-must-not-be-patched",
    display_name: "Nuevo nombre",
    template_config: {
      ...current,
      professional_badge: true,
      editorConfig: { should: "be ignored" },
      futurePowerField: { should: "be ignored" },
    },
  });

  assert(patch.profile.display_name === "Nuevo nombre", "Basic field was not selected.");
  assert(!("id" in patch.profile), "Host id escaped into the Basic patch.");
  assert(!("user_id" in patch.profile), "Owner id escaped into the Basic patch.");
  assert(!("public_id" in patch.profile), "Public id escaped into the Basic patch.");
  assert(!("editorConfig" in patch.templateConfig), "Canonical config escaped into the patch.");
  assert(!("futurePowerField" in patch.templateConfig), "Power field escaped into the patch.");

  const merged = mergeBasicEditorTemplateConfig(current, patch.templateConfig);
  assert(sameJson(merged.schemaVersion, premiumConfig.schemaVersion), "Schema version changed.");
  assert(sameJson(merged.editorConfig, premiumConfig.editorConfig), "Premium config changed.");
  assert(merged.professional_badge === true, "Basic namespace was not updated.");

  const selected = pickBasicEditorTemplateConfigPatch({ editorConfig: premiumConfig });
  assert(Object.keys(selected).length === 0, "Unknown canonical fields were selected.");

  return { passed: 8, failed: 0 } as const;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  console.log(JSON.stringify(runBasicEditorPersistenceSelfCheck()));
}
