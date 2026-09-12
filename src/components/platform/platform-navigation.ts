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
  | { type: "exact"; value: string }
  | { type: "prefix"; value: string }
  | { type: "paths"; values: readonly string[] }
  | { type: "none" };

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

export function matchesPlatformNavActivePath(
  match: PlatformNavActiveMatch,
  pathname: string,
): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (match.type === "none") return false;
  if (match.type === "paths") return match.values.includes(normalizedPath);
  if (match.type === "exact") return normalizedPath === match.value;
  return normalizedPath === match.value || normalizedPath.startsWith(`${match.value}/`);
}

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
    id: "pagina",
    label: "Mi página",
    href: "/page",
    scope: "authenticated",
    visibility: "authenticated",
    activeMatch: { type: "exact", value: "/page" },
    desktop: true,
    mobile: true,
    description: "Gestiona y publica tu página.",
    iconKey: "layout",
    section: "primary",
  },
  {
    id: "editor",
    label: "Editor",
    href: "/editor",
    scope: "authenticated",
    visibility: "authenticated",
    activeMatch: { type: "paths", values: ["/editor", "/power-editor"] },
    desktop: true,
    mobile: true,
    description: "Edita y publica tu página QR.",
    iconKey: "pencil",
    section: "primary",
  },
  {
    id: "qr",
    label: "QR",
    href: "/qr",
    scope: "authenticated",
    visibility: "authenticated",
    activeMatch: { type: "exact", value: "/qr" },
    desktop: true,
    mobile: true,
    description: "Gestiona tu código QR.",
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
    id: "perfil",
    label: "Perfil",
    href: "/account",
    scope: "authenticated",
    visibility: "authenticated",
    activeMatch: { type: "exact", value: "/account" },
    desktop: true,
    mobile: true,
    description: "Tu cuenta y ajustes.",
    iconKey: "user",
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
