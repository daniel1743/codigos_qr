import type { CardFamilyDef, CardLayout, CardRatio, CardVariantDef } from "../types/editor";

export interface ResolvedCard {
  layout: CardLayout;
  ratio: CardRatio;
  dense: boolean;
  sale: boolean;
}

/** Card-level props override the block variant, which overrides the family default. */
export function resolveCard(
  family: CardFamilyDef,
  blockProps: Record<string, string>,
  cardProps: Record<string, string>,
): ResolvedCard {
  const variant: CardVariantDef =
    family.variants.find((v) => v.id === blockProps.variant) ?? family.variants[0];
  const layout = (cardProps.layout as CardLayout) ?? variant.layout;
  const ratio =
    (cardProps.ratio as CardRatio) ?? variant.ratio ?? (layout === "balanced" ? "50" : "25");
  return { layout, ratio, dense: !!variant.dense && !cardProps.layout, sale: !!variant.sale };
}

/** 12-column grid spans so cards with different layouts can live together without breaking rhythm. */
export function cardSpan(layout: CardLayout, dense: boolean, mobile: boolean): string {
  if (mobile) return dense ? "col-span-6" : "col-span-12";
  if (layout === "top" || layout === "bottom") return dense ? "col-span-3" : "col-span-4";
  if (layout === "compact") return "col-span-6";
  return "col-span-12";
}

export const layoutOptions: { value: CardLayout; label: string }[] = [
  { value: "left", label: "Imagen izquierda" },
  { value: "right", label: "Imagen derecha" },
  { value: "top", label: "Imagen arriba" },
  { value: "bottom", label: "Imagen abajo" },
  { value: "balanced", label: "Equilibrada 50/50" },
  { value: "editorial", label: "Editorial" },
  { value: "compact", label: "Compacta" },
];

/** Family-only layouts appear in the Diseño badge only where they make sense. */
export function layoutsForFamily(family: CardFamilyDef): { value: CardLayout; label: string }[] {
  const extra: { value: CardLayout; label: string }[] = [];
  if (family.variants.some((v) => v.layout === "beforeAfter"))
    extra.push({ value: "beforeAfter", label: "Antes / después" });
  if (family.variants.some((v) => v.layout === "highlight"))
    extra.push({ value: "highlight", label: "Destacada" });
  return [...layoutOptions, ...extra];
}
