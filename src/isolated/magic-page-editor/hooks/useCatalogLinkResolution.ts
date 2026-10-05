import { useEffect, useState } from "react";
import {
  isLinkedCatalog,
  type CatalogAccess,
  type CatalogLinkConfig,
  type CatalogProduct,
} from "../../../features/magic-page-editor-production/catalog-link";

/**
 * Resolution lifecycle of a LINKED catalog block.
 *
 * - `idle`: the block is not linked (embedded), nothing to resolve.
 * - `loading`: the block is linked and the resolver is in flight.
 * - `ready`: the full catalog resolved; `products` holds every stored product.
 * - `unavailable`: the block is linked but the catalog could not be resolved.
 *   The landing must NEVER fall back to its own embedded copies in this state.
 */
export type CatalogLinkStatus = "idle" | "loading" | "ready" | "unavailable";

export interface CatalogLinkResolution {
  status: CatalogLinkStatus;
  /** Owned catalog page id (drives "Editar catálogo"); null when unknown. */
  pageId: string | null;
  /** Whether the linked catalog is published (drives "Ver catálogo"). */
  published: boolean;
  /** Every product stored in the catalog; empty until `ready`. */
  products: CatalogProduct[];
}

const IDLE: CatalogLinkResolution = {
  status: "idle",
  pageId: null,
  published: false,
  products: [],
};

const UNAVAILABLE: CatalogLinkResolution = {
  status: "unavailable",
  pageId: null,
  published: false,
  products: [],
};

/**
 * Resolve the full product list of a LINKED catalog once, from its public id.
 *
 * The catalog is the single source of truth: the landing never reads its own
 * embedded cards here. A miss ("still a draft", "deleted", "resolver error") is
 * surfaced as `unavailable` — never as an empty-but-embedded fallback.
 */
export function useCatalogLinkResolution(
  link: CatalogLinkConfig | null,
  access: CatalogAccess | undefined,
): CatalogLinkResolution {
  const publicId = link && isLinkedCatalog(link) ? link.catalogPublicId : null;
  const [resolution, setResolution] = useState<CatalogLinkResolution>(IDLE);

  useEffect(() => {
    if (!publicId) {
      setResolution(IDLE);
      return;
    }
    if (!access) {
      // Linked but no resolver wired: treat as unavailable, never embedded.
      setResolution(UNAVAILABLE);
      return;
    }

    let active = true;
    setResolution({ status: "loading", pageId: null, published: false, products: [] });
    void access
      .resolve(publicId)
      .then((result) => {
        if (!active) return;
        if (result.products === null) {
          setResolution({
            status: "unavailable",
            pageId: result.pageId ?? null,
            published: Boolean(result.published),
            products: [],
          });
          return;
        }
        setResolution({
          status: "ready",
          pageId: result.pageId ?? null,
          published: Boolean(result.published),
          products: result.products,
        });
      })
      .catch(() => {
        if (active) setResolution(UNAVAILABLE);
      });

    return () => {
      active = false;
    };
  }, [publicId, access]);

  return resolution;
}
