import type {
  BasicTemplateConfig,
  BasicTemplateContent,
  ButtonStyleConfig,
  FontPairConfig,
  PaletteConfig,
  TemplateDefinition,
} from "@/types/basic-templates";

export interface BuildConfigOptions {
  palette?: PaletteConfig;
  fontPair?: FontPairConfig;
  buttonStyle?: ButtonStyleConfig;
}

function requiredOption<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Template ${label} options cannot be empty.`);
  return value;
}

/** Assemble a runtime config, defaulting customization to the template's first option. */
export function buildConfig(
  template: TemplateDefinition,
  content: BasicTemplateContent,
  options: BuildConfigOptions = {},
): BasicTemplateConfig {
  const palette = options.palette ?? requiredOption(template.customization.palettes[0], "palette");
  const fontPair =
    options.fontPair ?? requiredOption(template.customization.fontPairs[0], "font pair");
  const buttonStyle =
    options.buttonStyle ?? requiredOption(template.customization.buttonStyles[0], "button style");
  return { template, content, palette, fontPair, buttonStyle };
}
