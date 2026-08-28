import type { TemplateConfig } from "./config";

export interface StructuralFingerprint {
  devicePreview: string | undefined;
  gridCols: number | undefined;
  bannerEnabled: boolean;
  bannerHeightPreset: string | undefined;
  bannerFusionPreset: string | undefined;
  buttonCount: number;
  fullWidthPattern: string;
  socialCount: number;
  socialPlatforms: string[];
  profileRadius: string;
  btnRadius: string;
  buttonPresetId: string;
  editorThemeLayout: string;
  editorThemeSpacing: string;
  editorButtonStyle: string;
  editorButtonRadius: string;
  editorButtonTextSize: string;
  editorButtonContentAlign: string;
  editorButtonIconPosition: string;
  editorAvatarShape: string;
  editorRing: string;
  editorTitleSize: string;
  editorTitleWeight: string;
  editorTitleAlign: string;
  editorBioSize: string;
  editorBioWeight: string;
  editorBioAlign: string;
  editorDecorShape: string;
  editorDecorParticles: string;
  editorDecorSmoke: string;
  editorDecorShadow: string;
  editorDecorIntensity: string;
  editorSocialCovers: string;
  profileSizeBucket: number | undefined;
  profileBorder: number | undefined;
  titleSizeBucket: number | undefined;
  fontLogo: string;
  fontHeading: string;
}

export function getStructuralFingerprint(config: TemplateConfig): StructuralFingerprint {
  const banner = config.appearance?.banner;
  const editor = config as unknown as Record<string, unknown>;

  return {
    devicePreview: config.layout?.devicePreview,
    gridCols: config.layout?.gridCols,
    bannerEnabled: Boolean(banner?.enabled && config.identity?.bannerImg),
    bannerHeightPreset: banner?.enabled ? banner.heightPreset : undefined,
    bannerFusionPreset: banner?.enabled ? banner.fusionPreset : undefined,
    buttonCount: config.links?.length || 0,
    fullWidthPattern: (config.links || []).map((link) => (link.fullWidth ? "1" : "0")).join(""),
    socialCount: config.socials?.enabled ? (config.socials?.items?.length || 0) : 0,
    socialPlatforms: config.socials?.enabled
      ? (config.socials?.items || []).map((item) => item.platform).sort()
      : [],
    profileRadius: config.appearance?.profileRadius || "",
    btnRadius: config.appearance?.btnRadius || "",
    buttonPresetId: config.appearance?.btnPresetId || "",
    editorThemeLayout: stringValue(editor["theme_layout"]),
    editorThemeSpacing: stringValue(editor["theme_spacing"]),
    editorButtonStyle: stringValue(editor["button_style"]),
    editorButtonRadius: stringValue(editor["button_radius"]),
    editorButtonTextSize: stringValue(editor["button_text_size"]),
    editorButtonContentAlign: stringValue(editor["button_content_align"]),
    editorButtonIconPosition: stringValue(editor["button_icon_position"]),
    editorAvatarShape: stringValue(editor["avatar_shape"]),
    editorRing: compoundValue(editor["ring_enabled"], editor["ring_thickness"]),
    editorTitleSize: stringValue(editor["title_size"]),
    editorTitleWeight: stringValue(editor["title_weight"]),
    editorTitleAlign: stringValue(editor["title_align"]),
    editorBioSize: stringValue(editor["bio_size"]),
    editorBioWeight: stringValue(editor["bio_weight"]),
    editorBioAlign: stringValue(editor["bio_align"]),
    editorDecorShape: stringValue(editor["decor_shape"]),
    editorDecorParticles: stringValue(editor["decor_particles"]),
    editorDecorSmoke: stringValue(editor["decor_smoke"]),
    editorDecorShadow: stringValue(editor["decor_shadow"]),
    editorDecorIntensity: stringValue(editor["decor_intensity"]),
    editorSocialCovers: compoundValue(
      editor["social_covers_enabled"],
      editor["social_cover_style"],
      bucket(numberValue(editor["social_cover_height"]), 8),
      bucket(numberValue(editor["social_cover_width"]), 8),
    ),
    profileSizeBucket: bucket(config.layout?.profileSize, 20),
    profileBorder: config.layout?.profileBorder,
    titleSizeBucket: bucket(config.layout?.titleSize, 0.2),
    fontLogo: config.appearance?.fontLogo || "",
    fontHeading: config.appearance?.fontHeading || "",
  };
}

export function calculateStructuralSimilarity(fp1: StructuralFingerprint, fp2: StructuralFingerprint): number {
  let score = 0;
  let total = 0;

  function compare(a: any, b: any, weight: number) {
    total += weight;
    if (a === b) {
      score += weight;
    }
  }

  function compareMeaningful(a: any, b: any, weight: number) {
    if (isEmptyFingerprintValue(a) && isEmptyFingerprintValue(b)) return;
    compare(a, b, weight);
  }

  compare(fp1.devicePreview, fp2.devicePreview, 5);
  compare(fp1.gridCols, fp2.gridCols, 18);
  compare(fp1.buttonPresetId, fp2.buttonPresetId, 13);
  compare(fp1.profileRadius, fp2.profileRadius, 9);
  compare(fp1.btnRadius, fp2.btnRadius, 9);
  compare(fp1.fullWidthPattern, fp2.fullWidthPattern, 8);
  compare(fp1.fontLogo, fp2.fontLogo, 7);
  compare(fp1.fontHeading, fp2.fontHeading, 7);
  compare(fp1.profileSizeBucket, fp2.profileSizeBucket, 4);
  compare(fp1.profileBorder, fp2.profileBorder, 3);
  compare(fp1.titleSizeBucket, fp2.titleSizeBucket, 3);
  compareMeaningful(fp1.editorThemeLayout, fp2.editorThemeLayout, 12);
  compareMeaningful(fp1.editorButtonStyle, fp2.editorButtonStyle, 10);
  compareMeaningful(fp1.editorButtonRadius, fp2.editorButtonRadius, 6);
  compareMeaningful(fp1.editorThemeSpacing, fp2.editorThemeSpacing, 5);
  compareMeaningful(fp1.editorButtonContentAlign, fp2.editorButtonContentAlign, 5);
  compareMeaningful(fp1.editorAvatarShape, fp2.editorAvatarShape, 6);
  compareMeaningful(fp1.editorRing, fp2.editorRing, 4);
  compareMeaningful(fp1.editorTitleSize, fp2.editorTitleSize, 4);
  compareMeaningful(fp1.editorTitleWeight, fp2.editorTitleWeight, 4);
  compareMeaningful(fp1.editorTitleAlign, fp2.editorTitleAlign, 4);
  compareMeaningful(fp1.editorBioSize, fp2.editorBioSize, 3);
  compareMeaningful(fp1.editorBioWeight, fp2.editorBioWeight, 3);
  compareMeaningful(fp1.editorBioAlign, fp2.editorBioAlign, 3);
  compareMeaningful(fp1.editorButtonTextSize, fp2.editorButtonTextSize, 3);
  compareMeaningful(fp1.editorButtonIconPosition, fp2.editorButtonIconPosition, 3);
  compareMeaningful(fp1.editorDecorShape, fp2.editorDecorShape, 5);
  compareMeaningful(fp1.editorDecorParticles, fp2.editorDecorParticles, 4);
  compareMeaningful(fp1.editorDecorSmoke, fp2.editorDecorSmoke, 4);
  compareMeaningful(fp1.editorDecorShadow, fp2.editorDecorShadow, 3);
  compareMeaningful(fp1.editorDecorIntensity, fp2.editorDecorIntensity, 4);
  compareMeaningful(fp1.editorSocialCovers, fp2.editorSocialCovers, 6);
  compare(fp1.bannerEnabled, fp2.bannerEnabled, 6);
  
  if (fp1.bannerEnabled && fp2.bannerEnabled) {
    compare(fp1.bannerHeightPreset, fp2.bannerHeightPreset, 3);
    compare(fp1.bannerFusionPreset, fp2.bannerFusionPreset, 4);
  }

  total += 7;
  const btnDiff = Math.abs(fp1.buttonCount - fp2.buttonCount);
  const btnScore = Math.max(0, 7 - (btnDiff * 2)); 
  score += btnScore;

  total += 4;
  const socDiff = Math.abs(fp1.socialCount - fp2.socialCount);
  const socScore = Math.max(0, 4 - socDiff);
  score += socScore;

  total += 4;
  score += jaccardSimilarity(fp1.socialPlatforms, fp2.socialPlatforms) * 4;

  return Math.round((score / total) * 100);
}

export interface DiversityScoreResult {
  technicalQa: number;
  diversityScore: number;
  structuralUniqueness: number;
  identityDiversity: number;
  diagnostico: string;
}

export function calculateDiversityScore(config: TemplateConfig, batch: TemplateConfig[]): DiversityScoreResult {
  if (batch.length === 0) {
    return {
      technicalQa: 100, // Placeholder
      diversityScore: 100,
      structuralUniqueness: 100,
      identityDiversity: 100,
      diagnostico: "Primera plantilla, unicidad total"
    };
  }

  const fpCurrent = getStructuralFingerprint(config);
  
  let maxSimilarity = 0;
  let identityConflicts = 0;

  for (const past of batch) {
    const fpPast = getStructuralFingerprint(past);
    const sim = calculateStructuralSimilarity(fpCurrent, fpPast);
    if (sim > maxSimilarity) maxSimilarity = sim;

    if (
      config.identity.profileImg === past.identity.profileImg ||
      config.identity.titleText === past.identity.titleText ||
      config.identity.logoText === past.identity.logoText
    ) {
      identityConflicts++;
    }
  }

  const structuralUniqueness = Math.max(0, 100 - maxSimilarity);
  const identityDiversity = Math.max(0, 100 - (identityConflicts * 20));
  
  // Fórmula propuesta: 50% unicidad estructural, 20% identidad (media y ajuste a industria simplificados en identidad por ahora)
  const diversityScore = Math.round((structuralUniqueness * 0.7) + (identityDiversity * 0.3));

  let diagnostico = "";
  if (diversityScore >= 80) diagnostico = "Altamente única y diferenciada";
  else if (diversityScore >= 50) diagnostico = "Variación aceptable, pero con solapamiento";
  else if (structuralUniqueness < 20) diagnostico = "Técnicamente válida, estructuralmente repetida";
  else diagnostico = "Repetición masiva de identidad";

  return {
    technicalQa: 100,
    diversityScore,
    structuralUniqueness,
    identityDiversity,
    diagnostico
  };
}

function bucket(value: number | undefined, size: number): number | undefined {
  if (value === undefined || size <= 0) return value;
  return Math.round(value / size);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function isEmptyFingerprintValue(value: unknown): boolean {
  return value === "" || value === undefined || value === null;
}

function compoundValue(...values: unknown[]): string {
  if (values.every((value) => value === undefined || value === null || value === "")) return "";
  return values
    .map((value) => {
      if (typeof value === "boolean") return value ? "true" : "false";
      if (typeof value === "number") return String(value);
      if (typeof value === "string") return value;
      return "";
    })
    .join(":");
}

function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 1;
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  return intersection / union.size;
}
