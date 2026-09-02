/**
 * Typed platform-level navigation contract.
 *
 * This module is data only. It deliberately has no React, router, session, or
 * component imports so future shells can consume the registry without making
 * navigation policy part of any page implementation.
 */

export type PlatformNavScope = "public" | "authenticated" | "admin";

export type PlatformNavVisibility =
  "always" | "authenticated" | "unauthenticated" | "admin" | "future";

export type PlatformNavActiveMatch =
  { type: "exact"; value: string } | { type: "prefix"; value: string } | { type: "none" };

export type PlatformNavItem = {
  id: string;
  label: string;
  /** Future-only entries use null until a real route exists. */
  href: string | null;
  scope: PlatformNavScope;
  visibility: PlatformNavVisibility;
  activeMatch: PlatformNavActiveMatch;
  desktop: boolean;
  mobile: boolean;
  description?: string;
  iconKey?: string;
  section?: "primary" | "admin" | "future";
  requiresProfile?: boolean;
  future?: boolean;
};

/** Canonical destinations currently backed by platform routes. */
export const PLATFORM_NAV_ITEMS = [
  {
    id: "profile",
    label: "Inicio",
    href: "/profile",
    scope: "authenticated",
    visibility: "authenticated",
    activeMatch: { type: "exact", value: "/profile" },
    desktop: true,
    mobile: true,
    description: "Centro principal de tu cuenta y actividad.",
    iconKey: "home",
    section: "primary",
  },
  {
    id: "editor",
    label: "Mi página",
    href: "/editor",
    scope: "authenticated",
    visibility: "authenticated",
    activeMatch: { type: "exact", value: "/editor" },
    desktop: true,
    mobile: true,
    description: "Edita y publica tu página QR.",
    iconKey: "qr-code",
    section: "primary",
  },
  {
    id: "documents",
    label: "Documentos",
    href: "/encrypted-documents",
    scope: "authenticated",
    visibility: "authenticated",
    activeMatch: { type: "exact", value: "/encrypted-documents" },
    desktop: true,
    mobile: true,
    description: "Gestiona tus documentos seguros.",
    iconKey: "file-lock-2",
    section: "primary",
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    scope: "admin",
    visibility: "admin",
    activeMatch: { type: "exact", value: "/admin" },
    desktop: true,
    mobile: true,
    description: "Herramientas administrativas de la plataforma.",
    iconKey: "shield",
    section: "admin",
  },
] as const satisfies readonly PlatformNavItem[];

/** Planned destinations with no route yet; never render these as links. */
export const PLATFORM_FUTURE_NAV_ITEMS = [
  {
    id: "analytics",
    label: "Analíticas",
    href: null,
    scope: "authenticated",
    visibility: "future",
    activeMatch: { type: "none" },
    desktop: false,
    mobile: false,
    section: "future",
    future: true,
  },
  {
    id: "products",
    label: "Productos",
    href: null,
    scope: "authenticated",
    visibility: "future",
    activeMatch: { type: "none" },
    desktop: false,
    mobile: false,
    section: "future",
    future: true,
  },
  {
    id: "conversions",
    label: "Conversiones",
    href: null,
    scope: "authenticated",
    visibility: "future",
    activeMatch: { type: "none" },
    desktop: false,
    mobile: false,
    section: "future",
    future: true,
  },
] as const satisfies readonly PlatformNavItem[];

export const PLATFORM_NAVIGATION = {
  current: PLATFORM_NAV_ITEMS,
  future: PLATFORM_FUTURE_NAV_ITEMS,
} as const;
