import type { BlockItem } from "../../types";
import { deepClone, uid } from "../../utils";

export const DEFAULT_PRODUCT_SEED: BlockItem = {
  id: "product-seed",
  title: "Nuevo producto",
  description: "Describe este producto.",
  price: "$0.00",
  imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
  ctaLabel: "Ver producto",
  ctaUrl: "#contacto",
};

/** Clone the complete product payload while assigning a document-local ID. */
export function cloneProductItem(source?: BlockItem): BlockItem {
  const clone = deepClone(source ?? DEFAULT_PRODUCT_SEED);
  clone.id = uid("prd");
  return clone;
}
