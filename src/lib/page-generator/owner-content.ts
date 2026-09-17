/**
 * Shared owner-content contract for onboarding and child-page creation.
 *
 * This is an additive, transient host contract. It is not a database schema,
 * canonical document, renderer input or catalog persistence model. Every value
 * in this file is supplied by the owner or is deterministic structural
 * metadata added while projecting to an existing host contract.
 */

import {
  isValidEmail,
  isValidHttpUrl,
  isValidWhatsApp,
} from "@/lib/parametric-engine-v2/destinations";
import {
  isSafeUrl,
  type ContentSourceV2,
} from "@/lib/parametric-engine-v2/power-editor/content-source";
import type {
  CatalogItemV1,
  MediaAssetV1,
  NormalizedContentV1,
  PriceV1,
  SalesActionV1,
  SalesMode,
} from "@/lib/smart-pages/catalog.types";
import type {
  Density,
  ExperienceType,
  PageGenerationRequest,
  PageGoal,
} from "@/lib/smart-pages/smart-pages.types";
import type { GeneratedPageInput } from "./types";

/** Reuses the existing normalized media shape without making id/alt mandatory. */
export type OwnerMediaReference = Pick<MediaAssetV1, "url" | "kind"> &
  Partial<Pick<MediaAssetV1, "id" | "alt">>;

export interface OwnerContentIdentity {
  businessName?: string;
  shortDescription?: string;
}

export interface OwnerServiceInput {
  id?: string;
  name: string;
  description?: string;
  price?: string;
  media?: OwnerMediaReference[];
}

export interface OwnerProductInput {
  id?: string;
  name: string;
  description?: string;
  price?: string;
  media?: OwnerMediaReference[];
  destination?: string;
}

export interface OwnerMenuItemInput {
  id?: string;
  name: string;
  description?: string;
  price?: string;
  category?: string;
  media?: OwnerMediaReference[];
}

export interface OwnerPortfolioItemInput {
  id?: string;
  name: string;
  description?: string;
  /** Optional while editing; readiness gates the current host requirement. */
  media?: OwnerMediaReference[];
  destination?: string;
}

/** Small extension for the already-supported `/pages/new` event objective. */
export interface OwnerEventInput {
  id?: string;
  name: string;
  description?: string;
  date?: string;
  media?: OwnerMediaReference[];
  destination?: string;
}

export interface OwnerContactInput {
  whatsapp?: string;
  phone?: string;
  email?: string;
  bookingUrl?: string;
  externalUrl?: string;
}

export interface OwnerContentInput {
  identity?: OwnerContentIdentity;
  services?: OwnerServiceInput[];
  products?: OwnerProductInput[];
  menuItems?: OwnerMenuItemInput[];
  portfolioItems?: OwnerPortfolioItemInput[];
  /** Keeps the existing event objective in the same shared contract. */
  events?: OwnerEventInput[];
  contact?: OwnerContactInput;
  media?: {
    avatar?: OwnerMediaReference;
    cover?: OwnerMediaReference;
  };
}

export type OwnerContentValidationCode =
  "required" | "invalid_type" | "invalid_format" | "invalid_asset_ref" | "too_long";

export interface OwnerContentValidationIssue {
  path: string;
  code: OwnerContentValidationCode;
  message: string;
}

export interface OwnerContentValidationResult {
  valid: boolean;
  issues: OwnerContentValidationIssue[];
}

export interface OwnerContentReadinessIssue {
  path: string;
  code: "missing_owner_content";
  message: string;
}

export interface OwnerContentReadinessResult {
  ready: boolean;
  issues: OwnerContentReadinessIssue[];
}

export interface OwnerContentNormalizedContext {
  businessName?: string;
  businessType?: string;
  salesMode?: SalesMode;
}

export interface OwnerContentPageGenerationContext {
  businessType: string;
  businessCategory?: import("@/lib/onboarding-v2/types").BusinessCategoryV2;
  goal: PageGoal;
  density: Density;
  salesMode: SalesMode;
  primaryAction: SalesActionV1;
  secondaryActions?: SalesActionV1[];
  experienceType?: ExperienceType;
  variant?: number;
  maxPages?: number;
}

const MAX_NAME = 60;
const MAX_DESCRIPTION = 240;
const MAX_PRICE = 24;
const MAX_CATEGORY = 80;
const MAX_DATE = 80;
type OwnerContentCatalogKind = "catalog" | "menu" | "portfolio" | "listings" | "services";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function push(
  issues: OwnerContentValidationIssue[],
  path: string,
  code: OwnerContentValidationCode,
  message: string,
): void {
  issues.push({ path, code, message });
}

function optionalText(
  value: unknown,
  path: string,
  max: number,
  issues: OwnerContentValidationIssue[],
): void {
  if (value === undefined) return;
  if (typeof value !== "string" || !text(value)) {
    push(issues, path, "invalid_format", "El texto debe ser no vacío cuando está presente.");
  } else if (text(value).length > max) {
    push(issues, path, "too_long", `El texto no puede superar ${max} caracteres.`);
  }
}

function durableMediaUrl(value: string): boolean {
  return (
    isSafeUrl(value) && (value.trim().startsWith("https://") || /^\/(?!\/)/.test(value.trim()))
  );
}

function validateMedia(value: unknown, path: string, issues: OwnerContentValidationIssue[]): void {
  if (!isRecord(value)) {
    push(issues, path, "invalid_type", "La referencia de media debe ser un objeto.");
    return;
  }
  const url = value["url"];
  if (!text(url)) {
    push(issues, `${path}.url`, "required", "La media necesita una URL durable.");
  } else if (!durableMediaUrl(text(url))) {
    push(
      issues,
      `${path}.url`,
      "invalid_asset_ref",
      "La media debe usar una URL https o una referencia relativa durable; no blob/data.",
    );
  }
  if (value["kind"] !== "image" && value["kind"] !== "video") {
    push(issues, `${path}.kind`, "invalid_format", "El tipo de media debe ser image o video.");
  }
  optionalText(value["id"], `${path}.id`, 160, issues);
  optionalText(value["alt"], `${path}.alt`, 160, issues);
}

function validateMediaArray(
  value: unknown,
  path: string,
  issues: OwnerContentValidationIssue[],
  required = false,
): void {
  if (value === undefined) {
    if (required) push(issues, path, "required", "Este elemento necesita media del propietario.");
    return;
  }
  if (!Array.isArray(value)) {
    push(issues, path, "invalid_type", "La media debe ser una lista.");
    return;
  }
  if (required && value.length === 0)
    push(issues, path, "required", "Este elemento necesita al menos una media del propietario.");
  value.forEach((item, index) => validateMedia(item, `${path}[${index}]`, issues));
}

function validateItemText(
  item: Record<string, unknown>,
  path: string,
  issues: OwnerContentValidationIssue[],
  options: { category?: boolean; date?: boolean } = {},
): void {
  if (!text(item["name"]))
    push(issues, `${path}.name`, "required", "Cada elemento necesita un nombre.");
  else if (text(item["name"]).length > MAX_NAME)
    push(issues, `${path}.name`, "too_long", `El nombre no puede superar ${MAX_NAME} caracteres.`);
  optionalText(item["description"], `${path}.description`, MAX_DESCRIPTION, issues);
  optionalText(item["price"], `${path}.price`, MAX_PRICE, issues);
  if (options.category) optionalText(item["category"], `${path}.category`, MAX_CATEGORY, issues);
  if (options.date) optionalText(item["date"], `${path}.date`, MAX_DATE, issues);
}

function validateItemList(
  value: unknown,
  path: string,
  issues: OwnerContentValidationIssue[],
  validateItem: (
    item: Record<string, unknown>,
    path: string,
    issues: OwnerContentValidationIssue[],
  ) => void,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    push(issues, path, "invalid_type", "El contenido debe ser una lista.");
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      push(issues, itemPath, "invalid_type", "Cada elemento debe ser un objeto.");
      return;
    }
    validateItem(item, itemPath, issues);
  });
}

export function validateOwnerContentInput(value: unknown): OwnerContentValidationResult {
  const issues: OwnerContentValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        {
          path: "ownerContent",
          code: "invalid_type",
          message: "Owner content debe ser un objeto.",
        },
      ],
    };
  }

  const identity = value["identity"];
  if (identity !== undefined) {
    if (!isRecord(identity))
      push(issues, "identity", "invalid_type", "La identidad debe ser un objeto.");
    else {
      optionalText(identity["businessName"], "identity.businessName", MAX_NAME, issues);
      optionalText(
        identity["shortDescription"],
        "identity.shortDescription",
        MAX_DESCRIPTION,
        issues,
      );
    }
  }

  validateItemList(value["services"], "services", issues, (item, path, result) => {
    validateItemText(item, path, result);
    validateMediaArray(item["media"], `${path}.media`, result);
  });
  validateItemList(value["products"], "products", issues, (item, path, result) => {
    validateItemText(item, path, result);
    validateMediaArray(item["media"], `${path}.media`, result);
    if (
      item["destination"] !== undefined &&
      (!text(item["destination"]) || !isValidHttpUrl(text(item["destination"])))
    )
      push(
        result,
        `${path}.destination`,
        "invalid_format",
        "El destino debe ser una URL https válida.",
      );
  });
  validateItemList(value["menuItems"], "menuItems", issues, (item, path, result) => {
    validateItemText(item, path, result, { category: true });
    validateMediaArray(item["media"], `${path}.media`, result);
  });
  validateItemList(value["portfolioItems"], "portfolioItems", issues, (item, path, result) => {
    validateItemText(item, path, result);
    validateMediaArray(item["media"], `${path}.media`, result);
    if (
      item["destination"] !== undefined &&
      (!text(item["destination"]) || !isValidHttpUrl(text(item["destination"])))
    )
      push(
        result,
        `${path}.destination`,
        "invalid_format",
        "El destino debe ser una URL https válida.",
      );
  });
  validateItemList(value["events"], "events", issues, (item, path, result) => {
    validateItemText(item, path, result, { date: true });
    validateMediaArray(item["media"], `${path}.media`, result);
    if (
      item["destination"] !== undefined &&
      (!text(item["destination"]) || !isValidHttpUrl(text(item["destination"])))
    )
      push(
        result,
        `${path}.destination`,
        "invalid_format",
        "El destino debe ser una URL https válida.",
      );
  });

  const contact = value["contact"];
  if (contact !== undefined) {
    if (!isRecord(contact))
      push(issues, "contact", "invalid_type", "El contacto debe ser un objeto.");
    else {
      if (
        contact["whatsapp"] !== undefined &&
        (!text(contact["whatsapp"]) || !isValidWhatsApp(text(contact["whatsapp"])))
      )
        push(
          issues,
          "contact.whatsapp",
          "invalid_format",
          "WhatsApp debe contener un teléfono válido.",
        );
      if (
        contact["phone"] !== undefined &&
        (!text(contact["phone"]) || !isValidWhatsApp(text(contact["phone"])))
      )
        push(
          issues,
          "contact.phone",
          "invalid_format",
          "El teléfono debe contener un número válido.",
        );
      if (
        contact["email"] !== undefined &&
        (!text(contact["email"]) || !isValidEmail(text(contact["email"])))
      )
        push(issues, "contact.email", "invalid_format", "El email no tiene un formato válido.");
      for (const key of ["bookingUrl", "externalUrl"] as const) {
        if (
          contact[key] !== undefined &&
          (!text(contact[key]) || !isValidHttpUrl(text(contact[key])))
        )
          push(
            issues,
            `contact.${key}`,
            "invalid_format",
            "El destino debe ser una URL https válida.",
          );
      }
    }
  }

  const media = value["media"];
  if (media !== undefined) {
    if (!isRecord(media))
      push(issues, "media", "invalid_type", "La media global debe ser un objeto.");
    else {
      if (media["avatar"] !== undefined) validateMedia(media["avatar"], "media.avatar", issues);
      if (media["cover"] !== undefined) validateMedia(media["cover"], "media.cover", issues);
    }
  }

  return { valid: issues.length === 0, issues };
}

function mediaAsset(
  media: OwnerMediaReference,
  fallbackAlt: string,
  index: number,
  scope: string,
): MediaAssetV1 {
  return {
    id: media.id?.trim() || `owner-${scope}-${index + 1}`,
    url: media.url.trim(),
    alt: media.alt?.trim() || fallbackAlt,
    kind: media.kind,
  };
}

function price(label: string | undefined): PriceV1 | undefined {
  const value = label?.trim();
  return value ? { label: value } : undefined;
}

function actionForDestination(
  destination: string | undefined,
  label: string,
): SalesActionV1 | undefined {
  const target = destination?.trim();
  if (!target) return undefined;
  return { kind: "external_url", label, target, enabled: true };
}

function catalogItem(
  item:
    | OwnerServiceInput
    | OwnerProductInput
    | OwnerMenuItemInput
    | OwnerPortfolioItemInput
    | OwnerEventInput,
  type: CatalogItemV1["type"],
  index: number,
  salesMode: SalesMode,
): CatalogItemV1 {
  const media =
    "media" in item && item.media
      ? item.media.map((asset, assetIndex) =>
          mediaAsset(asset, item.name, assetIndex, `${type}-${index + 1}`),
        )
      : [];
  const destination = "destination" in item ? item.destination : undefined;
  const itemPrice = "price" in item ? item.price : undefined;
  const action = actionForDestination(destination, item.name);
  const itemPriceValue = price(itemPrice);
  const review: string[] = [];
  if (!itemPrice?.trim()) review.push("price");
  if (!media.length) review.push("media");
  return {
    id: item.id?.trim() || `owner-${type}-${index + 1}`,
    type,
    name: item.name.trim(),
    ...(item.description?.trim() ? { description: item.description.trim() } : {}),
    ...(itemPriceValue ? { price: itemPriceValue } : {}),
    media,
    attributes: [],
    salesMode,
    ...(action ? { action } : {}),
    featured: false,
    enabled: true,
    confidence: 1,
    review,
  };
}

function catalog(
  id: string,
  kind: OwnerContentCatalogKind,
  items: CatalogItemV1[],
  categories: NormalizedContentV1["catalogs"][number]["categories"] = [],
): NormalizedContentV1["catalogs"][number] {
  return { id, kind, categories, items };
}

/** Projects the shared contract into the existing transient Smart Pages DTO. */
export function ownerContentToNormalizedContent(
  ownerContent: OwnerContentInput,
  context: OwnerContentNormalizedContext = {},
): NormalizedContentV1 {
  const services = ownerContent.services ?? [];
  const products = ownerContent.products ?? [];
  const menuItems = ownerContent.menuItems ?? [];
  const portfolioItems = ownerContent.portfolioItems ?? [];
  const events = ownerContent.events ?? [];
  const salesMode = context.salesMode ?? "info";
  const identity = ownerContent.identity;
  const globalMedia = ownerContent.media;
  const issues = [] as NormalizedContentV1["issues"];

  const catalogs: NormalizedContentV1["catalogs"] = [];
  if (services.length)
    catalogs.push(
      catalog(
        "owner-services",
        "services",
        services.map((item, index) => catalogItem(item, "service", index, salesMode)),
      ),
    );
  if (products.length)
    catalogs.push(
      catalog(
        "owner-products",
        "catalog",
        products.map((item, index) => catalogItem(item, "product", index, salesMode)),
      ),
    );
  if (menuItems.length) {
    const categoryNames = [
      ...new Set(menuItems.map((item) => item.category?.trim()).filter(Boolean)),
    ] as string[];
    const categories = categoryNames.map((name, index) => ({
      id: `owner-category-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      order: index,
    }));
    catalogs.push(
      catalog(
        "owner-menu",
        "menu",
        menuItems.map((item, index) => ({
          ...catalogItem(item, "menu_item", index, salesMode),
          ...(item.category?.trim()
            ? {
                categoryId: `owner-category-${item.category
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}`,
              }
            : {}),
        })),
        categories,
      ),
    );
  }
  if (portfolioItems.length)
    catalogs.push(
      catalog(
        "owner-portfolio",
        "portfolio",
        portfolioItems.map((item, index) => catalogItem(item, "portfolio_item", index, salesMode)),
      ),
    );
  if (events.length)
    catalogs.push(
      catalog(
        "owner-events",
        "services",
        events.map((item, index) => catalogItem(item, "project", index, salesMode)),
      ),
    );

  if (products.some((item) => !item.media?.length))
    issues.push({
      scope: "item",
      severity: "missing",
      field: "media",
      message: "Some products have no owner media.",
    });
  if (services.some((item) => !item.price?.trim()) || menuItems.some((item) => !item.price?.trim()))
    issues.push({
      scope: "item",
      severity: "missing",
      field: "price",
      message: "Some owner items have no supplied price.",
    });

  const cover = globalMedia?.cover;
  const avatar = globalMedia?.avatar;
  return {
    version: "1",
    business: {
      // The normalized contract requires string slots; empty means absent and
      // is deliberately preferable to inventing a business name/type.
      name: identity?.businessName?.trim() || "",
      businessType: context.businessType?.trim() || "",
      ...(identity?.shortDescription?.trim() ? { about: identity.shortDescription.trim() } : {}),
      ...(cover ? { cover: mediaAsset(cover, "", 0, "cover") } : {}),
      ...(avatar ? { avatar: mediaAsset(avatar, "", 0, "avatar") } : {}),
    },
    catalogs,
    gallery: [],
    team: [],
    testimonials: [],
    faq: [],
    contact: {
      ...(ownerContent.contact?.phone ? { phone: ownerContent.contact.phone.trim() } : {}),
      ...(ownerContent.contact?.whatsapp ? { whatsapp: ownerContent.contact.whatsapp.trim() } : {}),
      ...(ownerContent.contact?.email ? { email: ownerContent.contact.email.trim() } : {}),
      ...(ownerContent.contact?.bookingUrl
        ? { bookingUrl: ownerContent.contact.bookingUrl.trim() }
        : {}),
      socials: [],
    },
    issues,
  };
}

/** Projects the same owner facts into the existing Engine V2 content shapes. */
export function ownerContentToEngineContentBlocks(
  ownerContent: OwnerContentInput,
): Partial<ContentSourceV2> | undefined {
  const blocks: Partial<ContentSourceV2> = {};
  const description = ownerContent.identity?.shortDescription?.trim();
  if (description) blocks.about = description;
  if (ownerContent.services?.length || ownerContent.menuItems?.length) {
    blocks.services = [...(ownerContent.services ?? []), ...(ownerContent.menuItems ?? [])].map(
      (item) => {
        const image = item.media?.find((asset) => asset.kind === "image");
        return {
          title: item.name.trim(),
          ...(item.description?.trim() ? { description: item.description.trim() } : {}),
          ...(item.price?.trim() ? { price: item.price.trim() } : {}),
          ...(image ? { imageUrl: image.url.trim() } : {}),
        };
      },
    );
  }
  const products = (ownerContent.products ?? [])
    .map((item) => ({ item, image: item.media?.find((asset) => asset.kind === "image") }))
    .filter((entry): entry is { item: OwnerProductInput; image: OwnerMediaReference } =>
      Boolean(entry.image),
    )
    .map(({ item, image }) => ({
      title: item.name.trim(),
      imageUrl: image.url.trim(),
      ...(item.price?.trim() ? { price: item.price.trim() } : {}),
      ...(item.description?.trim() ? { description: item.description.trim() } : {}),
      ...(item.destination?.trim() ? { ctaUrl: item.destination.trim() } : {}),
    }));
  if (products.length) blocks.products = products;
  const portfolio = (ownerContent.portfolioItems ?? [])
    .map((item) => ({ item, image: item.media?.find((asset) => asset.kind === "image") }))
    .filter((entry): entry is { item: OwnerPortfolioItemInput; image: OwnerMediaReference } =>
      Boolean(entry.image && entry.item.destination?.trim()),
    )
    .map(({ item, image }) => ({
      label: item.name.trim(),
      url: item.destination?.trim() as string,
      imageUrl: image.url.trim(),
      ...(item.description?.trim() ? { description: item.description.trim() } : {}),
    }));
  if (portfolio.length) blocks.portfolio = portfolio;
  if (ownerContent.events?.length) {
    blocks.events = ownerContent.events.map((item) => {
      const image = item.media?.find((asset) => asset.kind === "image");
      return {
        title: item.name.trim(),
        ...(item.date?.trim() ? { date: item.date.trim() } : {}),
        ...(item.destination?.trim() ? { ctaUrl: item.destination.trim() } : {}),
        ...(image ? { imageUrl: image.url.trim() } : {}),
      };
    });
  }
  const contact = ownerContent.contact;
  if (contact && (contact.whatsapp || contact.phone || contact.email)) {
    blocks.contact = {
      ...(contact.email?.trim() ? { email: contact.email.trim() } : {}),
      ...(contact.phone?.trim()
        ? { phone: contact.phone.trim() }
        : contact.whatsapp?.trim()
          ? { phone: contact.whatsapp.trim() }
          : {}),
    };
  }
  if (contact?.bookingUrl?.trim()) blocks.bookingUrl = contact.bookingUrl.trim();
  return Object.keys(blocks).length ? blocks : undefined;
}

/** Adapts the already-collected `/pages/new` form without changing its UI. */
export function ownerContentFromGeneratedPageInput(input: GeneratedPageInput): OwnerContentInput {
  const items = input.items ?? [];
  const base: OwnerContentInput = {
    identity: {
      ...(input.businessName.trim() ? { businessName: input.businessName.trim() } : {}),
      ...(input.description?.trim() ? { shortDescription: input.description.trim() } : {}),
    },
    ...(input.coverImageUrl?.trim() || input.avatarImageUrl?.trim()
      ? {
          media: {
            ...(input.coverImageUrl?.trim()
              ? { cover: { url: input.coverImageUrl.trim(), kind: "image" as const } }
              : {}),
            ...(input.avatarImageUrl?.trim()
              ? { avatar: { url: input.avatarImageUrl.trim(), kind: "image" as const } }
              : {}),
          },
        }
      : {}),
  };
  const mappedItems = items.map((item) => ({
    name: item.title.trim(),
    ...(item.description?.trim() ? { description: item.description.trim() } : {}),
    ...(item.price?.trim() ? { price: item.price.trim() } : {}),
    ...(item.imageUrl?.trim()
      ? { media: [{ url: item.imageUrl.trim(), kind: "image" as const }] }
      : {}),
    ...(item.url?.trim() ? { destination: item.url.trim() } : {}),
  }));
  if (input.objective === "catalog") base.products = mappedItems;
  else if (input.objective === "portfolio")
    base.portfolioItems = mappedItems.map((item) => ({ ...item, media: item.media ?? [] }));
  else if (input.objective === "menu") base.menuItems = mappedItems;
  else if (input.objective === "event")
    base.events = items.map((item) => ({
      name: item.title.trim(),
      ...(item.description?.trim() ? { description: item.description.trim() } : {}),
      ...(item.date?.trim() ? { date: item.date.trim() } : {}),
      ...(item.imageUrl?.trim()
        ? { media: [{ url: item.imageUrl.trim(), kind: "image" as const }] }
        : {}),
      ...(item.url?.trim() ? { destination: item.url.trim() } : {}),
    }));
  else base.services = mappedItems;

  if (input.cta?.value.trim()) {
    const value = input.cta.value.trim();
    base.contact =
      input.cta.type === "whatsapp"
        ? { whatsapp: value }
        : input.cta.type === "email"
          ? { email: value }
          : input.cta.type === "book"
            ? { bookingUrl: value }
            : { externalUrl: value };
  }
  return base;
}

export function ownerContentToPageGenerationRequest(
  ownerContent: OwnerContentInput,
  context: OwnerContentPageGenerationContext,
): PageGenerationRequest {
  return {
    version: "1",
    businessType: context.businessType,
    ...(context.businessCategory ? { businessCategory: context.businessCategory } : {}),
    goal: context.goal,
    density: context.density,
    salesMode: context.salesMode,
    primaryAction: context.primaryAction,
    secondaryActions: context.secondaryActions ?? [],
    content: ownerContentToNormalizedContent(ownerContent, {
      ...(ownerContent.identity?.businessName
        ? { businessName: ownerContent.identity.businessName }
        : {}),
      businessType: context.businessType,
      salesMode: context.salesMode,
    }),
    preferences: {
      ...(context.experienceType ? { experienceType: context.experienceType } : {}),
      ...(context.variant !== undefined ? { variant: context.variant } : {}),
      ...(context.maxPages !== undefined ? { maxPages: context.maxPages } : {}),
    },
  };
}

export function getOwnerContentReadiness(
  ownerContent: OwnerContentInput | undefined,
  experience: ExperienceType,
): OwnerContentReadinessResult {
  const content = ownerContent;
  const issues: OwnerContentReadinessIssue[] = [];
  const hasSupportedContent = Boolean(
    content &&
    ((content.services?.length ?? 0) > 0 ||
      (content.products?.length ?? 0) > 0 ||
      (content.menuItems?.length ?? 0) > 0 ||
      (content.portfolioItems?.length ?? 0) > 0 ||
      (content.events?.length ?? 0) > 0),
  );
  if (experience === "services" && !content?.services?.some((item) => text(item.name)))
    issues.push({
      path: "services",
      code: "missing_owner_content",
      message: "Añade al menos un servicio con nombre.",
    });
  if (experience === "catalog" && !content?.products?.some((item) => text(item.name)))
    issues.push({
      path: "products",
      code: "missing_owner_content",
      message: "Añade al menos un producto con nombre.",
    });
  if (experience === "menu" && !content?.menuItems?.some((item) => text(item.name)))
    issues.push({
      path: "menuItems",
      code: "missing_owner_content",
      message: "Añade al menos un elemento del menú con nombre.",
    });
  if (
    experience === "portfolio" &&
    !content?.portfolioItems?.some((item) => text(item.name) && (item.media?.length ?? 0) > 0)
  )
    issues.push({
      path: "portfolioItems",
      code: "missing_owner_content",
      message: "Añade un proyecto con media del propietario.",
    });
  if (
    experience === "landing" &&
    !((content?.identity?.businessName && content.identity.shortDescription) || hasSupportedContent)
  )
    issues.push({
      path: "identity",
      code: "missing_owner_content",
      message: "Añade identidad y descripción, o contenido del propietario.",
    });
  return { ready: issues.length === 0, issues };
}
