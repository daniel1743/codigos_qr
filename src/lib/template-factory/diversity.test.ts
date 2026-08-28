import {
  calculateDiversityScore,
  calculateStructuralSimilarity,
  getStructuralFingerprint,
} from "./diversity";
import { cloneDefaults, type TemplateConfig } from "./config";

function makeBaseConfig(): TemplateConfig {
  const config = cloneDefaults();
  config.paletteId = "rose-platinum";
  config.identity = {
    logoText: "StyleCut",
    titleText: "CORTE Y BARBA",
    subtitleText: "BARBERIA",
    profileImg: "img1.jpg",
    bannerImg: "banner1.jpg",
  };
  config.layout = {
    devicePreview: "mobile",
    gridCols: 1,
    profileBorder: 2,
    profileSize: 160,
    logoSize: 3.2,
    titleSize: 2,
  };
  config.appearance = {
    ...config.appearance,
    profileRadius: "50%",
    btnRadius: "9999px",
    btnPresetId: "solid",
    banner: {
      enabled: true,
      fusionPreset: "soft",
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 100,
      fusionStrength: 50,
    },
  };
  config.socials = {
    enabled: true,
    displayMode: "icons",
    items: [{ id: "1", platform: "instagram", label: "Instagram", url: "#", iconId: "instagram", enabled: true }],
  };
  config.links = [
    { id: "L1", text: "Link 1", icon: "fa-solid fa-globe", url: "#", fullWidth: true },
  ];
  config.content = { footerText: "" };
  return config;
}

async function runTests() {
  console.log("Running Diversity Tests...");

  const baseConfig = makeBaseConfig();
  const fp1 = getStructuralFingerprint(baseConfig);
  const fp2 = getStructuralFingerprint(baseConfig);
  const sim1 = calculateStructuralSimilarity(fp1, fp2);
  console.assert(sim1 === 100, `Test 1 Failed: Expected 100, got ${sim1}`);

  const colorConfig = { ...baseConfig, paletteId: "emerald-luxury" };
  const fpColor = getStructuralFingerprint(colorConfig);
  console.assert(calculateStructuralSimilarity(fp1, fpColor) === 100, "Test 2 Failed");

  const avatarConfig = {
    ...baseConfig,
    identity: { ...baseConfig.identity, profileImg: "img2.jpg" },
  };
  const fpAvatar = getStructuralFingerprint(avatarConfig);
  console.assert(calculateStructuralSimilarity(fp1, fpAvatar) === 100, "Test 3 Failed");

  const colConfig = {
    ...baseConfig,
    layout: { ...baseConfig.layout, gridCols: 2 },
  };
  const fpCol = getStructuralFingerprint(colConfig);
  console.assert(calculateStructuralSimilarity(fp1, fpCol) < 90, "Test 4 Failed");

  const presetConfig = {
    ...baseConfig,
    appearance: { ...baseConfig.appearance, btnPresetId: "glass", btnRadius: "16px" },
  };
  const fpPreset = getStructuralFingerprint(presetConfig);
  console.assert(calculateStructuralSimilarity(fp1, fpPreset) < 85, "Test 5 Failed");

  const batch = [baseConfig, avatarConfig, colorConfig];
  const scoreResult = calculateDiversityScore(colConfig, batch);
  console.assert(
    scoreResult.structuralUniqueness > 0,
    `Test 6 Failed: Expected structural difference, got ${scoreResult.structuralUniqueness}`,
  );

  console.log("All tests passed!");
}

runTests().catch(console.error);
