import { generateMagicTemplate } from "../../../lib/magic-template-generator";

export const MAGIC_TEMPLATE_REGISTRY = [
  {
    id: "business-v1",
    label: "Business Corporate",
    family: "business" as const,
    variant: "v1" as const
  },
  {
    id: "business-v2",
    label: "Business Luxury",
    family: "business" as const,
    variant: "v2" as const
  },
  {
    id: "portfolio-v1",
    label: "Portfolio Minimal",
    family: "portfolio" as const,
    variant: "v1" as const
  },
  {
    id: "portfolio-v2",
    label: "Portfolio Editorial",
    family: "portfolio" as const,
    variant: "v2" as const
  }
];

export function getMagicTemplateDoc(id: string) {
  const entry = MAGIC_TEMPLATE_REGISTRY.find(e => e.id === id);
  if (!entry) throw new Error(`Template ${id} not found`);
  return generateMagicTemplate({ family: entry.family, variant: entry.variant });
}
