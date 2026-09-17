/**
 * Framework-agnostic owner-content intake state.
 *
 * The state is an editing container around the single host-owned
 * `OwnerContentInput` contract. `localId`, `dirty` and `revision` are transient
 * editing metadata and are never exported as owner facts.
 */

import {
  getOwnerContentReadiness,
  validateOwnerContentInput,
  type OwnerContentInput,
  type OwnerContentReadinessResult,
  type OwnerContentValidationResult,
  type OwnerContactInput,
  type OwnerEventInput,
  type OwnerMediaReference,
  type OwnerMenuItemInput,
  type OwnerPortfolioItemInput,
  type OwnerProductInput,
  type OwnerServiceInput,
  type OwnerContentIdentity,
} from "@/lib/page-generator/owner-content";
import type { ExperienceType } from "@/lib/smart-pages/smart-pages.types";

export interface OwnerContentIntakeItem<T> {
  /** Transient stable identity for this editing session. */
  localId: string;
  value: T;
}

export interface OwnerContentIntakeState {
  identity: OwnerContentIdentity;
  contact: OwnerContactInput;
  media: NonNullable<OwnerContentInput["media"]>;
  services: OwnerContentIntakeItem<OwnerServiceInput>[];
  products: OwnerContentIntakeItem<OwnerProductInput>[];
  menuItems: OwnerContentIntakeItem<OwnerMenuItemInput>[];
  portfolioItems: OwnerContentIntakeItem<OwnerPortfolioItemInput>[];
  events: OwnerContentIntakeItem<OwnerEventInput>[];
  dirty: boolean;
  revision: number;
  /** Transient sequence only; never exported. */
  nextLocalId: number;
}

type CollectionName = "services" | "products" | "menuItems" | "portfolioItems" | "events";

interface CollectionValueMap {
  services: OwnerServiceInput;
  products: OwnerProductInput;
  menuItems: OwnerMenuItemInput;
  portfolioItems: OwnerPortfolioItemInput;
  events: OwnerEventInput;
}

type IdentityPatch = { [K in keyof OwnerContentIdentity]?: OwnerContentIdentity[K] | undefined };
type ContactPatch = { [K in keyof OwnerContactInput]?: OwnerContactInput[K] | undefined };
type MediaPatch = { avatar?: OwnerMediaReference | null; cover?: OwnerMediaReference | null };

export interface OwnerContentIntakeExportSuccess {
  ok: true;
  content: OwnerContentInput;
  validation: OwnerContentValidationResult;
}

export interface OwnerContentIntakeExportFailure {
  ok: false;
  content: OwnerContentInput;
  validation: OwnerContentValidationResult;
}

export type OwnerContentIntakeExportResult =
  OwnerContentIntakeExportSuccess | OwnerContentIntakeExportFailure;

function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.slice() as T;
  if (value && typeof value === "object") return { ...(value as object) } as T;
  return value;
}

function markDirty(state: OwnerContentIntakeState): OwnerContentIntakeState {
  return { ...state, dirty: true, revision: state.revision + 1 };
}

function hydrateCollection<K extends CollectionName>(
  key: K,
  values: CollectionValueMap[K][] | undefined,
): OwnerContentIntakeItem<CollectionValueMap[K]>[] {
  return (values ?? []).map((value, index) => ({
    localId: `intake-${key}-${index + 1}`,
    value: clone(value),
  }));
}

/** Creates empty state; no owner facts are inferred. */
export function createEmptyOwnerContentIntake(): OwnerContentIntakeState {
  return {
    identity: {},
    contact: {},
    media: {},
    services: [],
    products: [],
    menuItems: [],
    portfolioItems: [],
    events: [],
    dirty: false,
    revision: 0,
    nextLocalId: 1,
  };
}

/** Hydrates the editor container from the existing shared contract. */
export function createOwnerContentIntake(initial: OwnerContentInput = {}): OwnerContentIntakeState {
  return {
    identity: clone(initial.identity ?? {}),
    contact: clone(initial.contact ?? {}),
    media: clone(initial.media ?? {}),
    services: hydrateCollection("services", initial.services),
    products: hydrateCollection("products", initial.products),
    menuItems: hydrateCollection("menuItems", initial.menuItems),
    portfolioItems: hydrateCollection("portfolioItems", initial.portfolioItems),
    events: hydrateCollection("events", initial.events),
    dirty: false,
    revision: 0,
    nextLocalId: 1,
  };
}

export function setIdentity(
  state: OwnerContentIntakeState,
  updates: IdentityPatch,
): OwnerContentIntakeState {
  const identity = { ...state.identity } as OwnerContentIdentity;
  for (const key of ["businessName", "shortDescription"] as const) {
    if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
    const value = updates[key];
    if (value === undefined) delete identity[key];
    else identity[key] = value;
  }
  return markDirty({ ...state, identity });
}

export function setBusinessName(
  state: OwnerContentIntakeState,
  businessName: string | undefined,
): OwnerContentIntakeState {
  return setIdentity(state, { businessName });
}

export function setShortDescription(
  state: OwnerContentIntakeState,
  shortDescription: string | undefined,
): OwnerContentIntakeState {
  return setIdentity(state, { shortDescription });
}

export function setContact(
  state: OwnerContentIntakeState,
  updates: ContactPatch,
): OwnerContentIntakeState {
  const contact = { ...state.contact } as OwnerContactInput;
  for (const key of ["whatsapp", "phone", "email", "bookingUrl", "externalUrl"] as const) {
    if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
    const value = updates[key];
    if (value === undefined) delete contact[key];
    else contact[key] = value;
  }
  return markDirty({ ...state, contact });
}

export function setAvatar(
  state: OwnerContentIntakeState,
  avatar: OwnerMediaReference | null,
): OwnerContentIntakeState {
  const media = { ...state.media };
  if (avatar === null) delete media.avatar;
  else media.avatar = clone(avatar);
  return markDirty({ ...state, media });
}

export function setCover(
  state: OwnerContentIntakeState,
  cover: OwnerMediaReference | null,
): OwnerContentIntakeState {
  const media = { ...state.media };
  if (cover === null) delete media.cover;
  else media.cover = clone(cover);
  return markDirty({ ...state, media });
}

function addItem<K extends CollectionName>(
  state: OwnerContentIntakeState,
  key: K,
  value: CollectionValueMap[K],
): OwnerContentIntakeState {
  const item: OwnerContentIntakeItem<CollectionValueMap[K]> = {
    localId: `local-${state.nextLocalId}`,
    value: clone(value),
  };
  return markDirty({
    ...state,
    [key]: [...state[key], item],
    nextLocalId: state.nextLocalId + 1,
  } as OwnerContentIntakeState);
}

function updateItem<K extends CollectionName>(
  state: OwnerContentIntakeState,
  key: K,
  localId: string,
  patch: Partial<CollectionValueMap[K]>,
): OwnerContentIntakeState {
  const current = state[key];
  const index = current.findIndex((item) => item.localId === localId);
  if (index < 0) return state;
  const existing = current[index];
  if (!existing) return state;
  const next = current.slice();
  next[index] = {
    localId: existing.localId,
    value: { ...existing.value, ...patch } as CollectionValueMap[K],
  };
  return markDirty({ ...state, [key]: next } as OwnerContentIntakeState);
}

function removeItem<K extends CollectionName>(
  state: OwnerContentIntakeState,
  key: K,
  localId: string,
): OwnerContentIntakeState {
  const next = state[key].filter((item) => item.localId !== localId);
  if (next.length === state[key].length) return state;
  return markDirty({ ...state, [key]: next } as OwnerContentIntakeState);
}

function reorderItem<K extends CollectionName>(
  state: OwnerContentIntakeState,
  key: K,
  fromIndex: number,
  toIndex: number,
): OwnerContentIntakeState {
  const current = state[key];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  )
    return state;
  const next = current.slice();
  const [item] = next.splice(fromIndex, 1);
  if (!item) return state;
  next.splice(toIndex, 0, item);
  return markDirty({ ...state, [key]: next } as OwnerContentIntakeState);
}

export const addService = (state: OwnerContentIntakeState, value: OwnerServiceInput) =>
  addItem(state, "services", value);
export const updateService = (
  state: OwnerContentIntakeState,
  localId: string,
  patch: Partial<OwnerServiceInput>,
) => updateItem(state, "services", localId, patch);
export const removeService = (state: OwnerContentIntakeState, localId: string) =>
  removeItem(state, "services", localId);
export const reorderServices = (state: OwnerContentIntakeState, from: number, to: number) =>
  reorderItem(state, "services", from, to);

export const addProduct = (state: OwnerContentIntakeState, value: OwnerProductInput) =>
  addItem(state, "products", value);
export const updateProduct = (
  state: OwnerContentIntakeState,
  localId: string,
  patch: Partial<OwnerProductInput>,
) => updateItem(state, "products", localId, patch);
export const removeProduct = (state: OwnerContentIntakeState, localId: string) =>
  removeItem(state, "products", localId);
export const reorderProducts = (state: OwnerContentIntakeState, from: number, to: number) =>
  reorderItem(state, "products", from, to);

export const addMenuItem = (state: OwnerContentIntakeState, value: OwnerMenuItemInput) =>
  addItem(state, "menuItems", value);
export const updateMenuItem = (
  state: OwnerContentIntakeState,
  localId: string,
  patch: Partial<OwnerMenuItemInput>,
) => updateItem(state, "menuItems", localId, patch);
export const removeMenuItem = (state: OwnerContentIntakeState, localId: string) =>
  removeItem(state, "menuItems", localId);
export const reorderMenuItems = (state: OwnerContentIntakeState, from: number, to: number) =>
  reorderItem(state, "menuItems", from, to);

export const addPortfolioItem = (state: OwnerContentIntakeState, value: OwnerPortfolioItemInput) =>
  addItem(state, "portfolioItems", value);
export const updatePortfolioItem = (
  state: OwnerContentIntakeState,
  localId: string,
  patch: Partial<OwnerPortfolioItemInput>,
) => updateItem(state, "portfolioItems", localId, patch);
export const removePortfolioItem = (state: OwnerContentIntakeState, localId: string) =>
  removeItem(state, "portfolioItems", localId);
export const reorderPortfolioItems = (state: OwnerContentIntakeState, from: number, to: number) =>
  reorderItem(state, "portfolioItems", from, to);

export const addEvent = (state: OwnerContentIntakeState, value: OwnerEventInput) =>
  addItem(state, "events", value);
export const updateEvent = (
  state: OwnerContentIntakeState,
  localId: string,
  patch: Partial<OwnerEventInput>,
) => updateItem(state, "events", localId, patch);
export const removeEvent = (state: OwnerContentIntakeState, localId: string) =>
  removeItem(state, "events", localId);
export const reorderEvents = (state: OwnerContentIntakeState, from: number, to: number) =>
  reorderItem(state, "events", from, to);

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

function exportMediaList(
  media: OwnerMediaReference[] | undefined,
): OwnerMediaReference[] | undefined {
  return media && media.length > 0
    ? media.map((item) => ({
        ...item,
        url: item.url.trim(),
        ...(item.id?.trim() ? { id: item.id.trim() } : {}),
        ...(item.alt?.trim() ? { alt: item.alt.trim() } : {}),
      }))
    : undefined;
}

function exportItem<T extends { id?: string; name: string }>(
  item: T,
  extras: Record<string, unknown>,
): T {
  const output: Record<string, unknown> = {
    ...extras,
    name: item.name.trim(),
    ...(trimmed(item.id) ? { id: trimmed(item.id) } : {}),
  };
  return output as T;
}

function exportService(item: OwnerServiceInput): OwnerServiceInput {
  return exportItem(item, {
    ...(trimmed(item.description) ? { description: trimmed(item.description) } : {}),
    ...(trimmed(item.price) ? { price: trimmed(item.price) } : {}),
    ...(exportMediaList(item.media) ? { media: exportMediaList(item.media) } : {}),
  });
}

function exportProduct(item: OwnerProductInput): OwnerProductInput {
  return exportItem(item, {
    ...(trimmed(item.description) ? { description: trimmed(item.description) } : {}),
    ...(trimmed(item.price) ? { price: trimmed(item.price) } : {}),
    ...(exportMediaList(item.media) ? { media: exportMediaList(item.media) } : {}),
    ...(trimmed(item.destination) ? { destination: trimmed(item.destination) } : {}),
  });
}

function exportMenuItem(item: OwnerMenuItemInput): OwnerMenuItemInput {
  return exportItem(item, {
    ...(trimmed(item.description) ? { description: trimmed(item.description) } : {}),
    ...(trimmed(item.price) ? { price: trimmed(item.price) } : {}),
    ...(trimmed(item.category) ? { category: trimmed(item.category) } : {}),
    ...(exportMediaList(item.media) ? { media: exportMediaList(item.media) } : {}),
  });
}

function exportPortfolioItem(item: OwnerPortfolioItemInput): OwnerPortfolioItemInput {
  return exportItem(item, {
    ...(trimmed(item.description) ? { description: trimmed(item.description) } : {}),
    ...(exportMediaList(item.media) ? { media: exportMediaList(item.media) } : {}),
    ...(trimmed(item.destination) ? { destination: trimmed(item.destination) } : {}),
  });
}

function exportEvent(item: OwnerEventInput): OwnerEventInput {
  return exportItem(item, {
    ...(trimmed(item.description) ? { description: trimmed(item.description) } : {}),
    ...(trimmed(item.date) ? { date: trimmed(item.date) } : {}),
    ...(exportMediaList(item.media) ? { media: exportMediaList(item.media) } : {}),
    ...(trimmed(item.destination) ? { destination: trimmed(item.destination) } : {}),
  });
}

/** Removes all transient intake metadata and emits only OwnerContentInput data. */
export function getOwnerContent(state: OwnerContentIntakeState): OwnerContentInput {
  const identity: OwnerContentIdentity = {};
  const businessName = trimmed(state.identity.businessName);
  const shortDescription = trimmed(state.identity.shortDescription);
  if (businessName) identity.businessName = businessName;
  if (shortDescription) identity.shortDescription = shortDescription;

  const contact: OwnerContactInput = {};
  const whatsapp = trimmed(state.contact.whatsapp);
  const phone = trimmed(state.contact.phone);
  const email = trimmed(state.contact.email);
  const bookingUrl = trimmed(state.contact.bookingUrl);
  const externalUrl = trimmed(state.contact.externalUrl);
  if (whatsapp) contact.whatsapp = whatsapp;
  if (phone) contact.phone = phone;
  if (email) contact.email = email;
  if (bookingUrl) contact.bookingUrl = bookingUrl;
  if (externalUrl) contact.externalUrl = externalUrl;

  const media: NonNullable<OwnerContentInput["media"]> = {};
  if (state.media.avatar) media.avatar = clone(state.media.avatar);
  if (state.media.cover) media.cover = clone(state.media.cover);

  const content: OwnerContentInput = {};
  if (Object.keys(identity).length) content.identity = identity;
  if (state.services.length)
    content.services = state.services.map(({ value }) => exportService(value));
  if (state.products.length)
    content.products = state.products.map(({ value }) => exportProduct(value));
  if (state.menuItems.length)
    content.menuItems = state.menuItems.map(({ value }) => exportMenuItem(value));
  if (state.portfolioItems.length)
    content.portfolioItems = state.portfolioItems.map(({ value }) => exportPortfolioItem(value));
  if (state.events.length) content.events = state.events.map(({ value }) => exportEvent(value));
  if (Object.keys(contact).length) content.contact = contact;
  if (Object.keys(media).length) content.media = media;
  return content;
}

/** Exports only when the current editing state is a valid owner-content input. */
export function exportOwnerContent(state: OwnerContentIntakeState): OwnerContentIntakeExportResult {
  const content = getOwnerContent(state);
  const validation = validateOwnerContentInput(content);
  return validation.valid ? { ok: true, content, validation } : { ok: false, content, validation };
}

export function validateOwnerContentIntake(
  state: OwnerContentIntakeState,
): OwnerContentValidationResult {
  return validateOwnerContentInput(getOwnerContent(state));
}

/** Reuses the single readiness authority from the shared owner-content contract. */
export function getReadiness(
  state: OwnerContentIntakeState,
  experience: ExperienceType,
): OwnerContentReadinessResult {
  return getOwnerContentReadiness(getOwnerContent(state), experience);
}
