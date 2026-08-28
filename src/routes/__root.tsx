import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Toaster } from "../components/ui/sonner";
import { PremiumMobileNavDrawer } from "../components/navigation/PremiumMobileNavDrawer";
import { MobileBottomNav } from "../components/navigation/MobileBottomNav";
import { DesktopNavbar } from "../components/navigation/DesktopNavbar";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { DebugConsole } from "../components/DebugConsole";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[PROD ERROR] CRITICAL FATAL ERROR DETAILS: ", error);
  if (error && error.message) { console.error("Mensaje exacto del error: ", error.message); }
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.<br/><br/><strong style={{color: "red"}}>{error.message || String(error)}</strong>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
      },
      { name: "theme-color", content: "#111111" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Generador de Código QR con Página Personalizada | QR Links" },
      {
        name: "description",
        content:
          "Crea tu código QR gratis. Reúne tus redes sociales, WhatsApp, enlaces y web en una página profesional personalizable. Tu QR, tu página, tu marca.",
      },
      {
        property: "og:title",
        content: "Generador de Código QR con Página Personalizada | QR Links",
      },
      {
        property: "og:description",
        content:
          "Crea tu código QR gratis. Reúne tus redes sociales, WhatsApp, enlaces y web en una página profesional personalizable.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://codigos-qr.vercel.app/" },
      { property: "og:image", content: "https://codigos-qr.vercel.app/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Generador de Código QR con Página Personalizada | QR Links",
      },
      {
        name: "twitter:description",
        content:
          "Crea tu código QR gratis. Reúne tus redes, WhatsApp y enlaces en una página personalizable.",
      },
      { name: "twitter:image", content: "https://codigos-qr.vercel.app/icon-512.png" },
    ],
    links: [
      { rel: "canonical", href: "https://codigos-qr.vercel.app/" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/icon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <DebugConsole />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useRouterState({ select: (state) => state.location });
  const isEditorSurface = isFullScreenEditorRoute(location.pathname, location.search);

  useEffect(() => {
    // Solo registrar service worker en producción
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered: ", registration);
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError);
          });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {!isEditorSurface && <DesktopNavbar />}
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <PrivateMobileNavigationShell>
        <Outlet />
      </PrivateMobileNavigationShell>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}

function isFullScreenEditorRoute(pathname: string, search: unknown) {
  const routeSearch = (search || {}) as Record<string, unknown>;
  const isQrLegacyTab = pathname === "/editor" && routeSearch.tab === "qr";
  return (
    !isQrLegacyTab &&
    (pathname === "/editor" ||
      pathname === "/power-editor-preview" ||
      pathname === "/power-editor-preview-mobile" ||
      pathname.startsWith("/internal/power-editor-draft"))
  );
}

function PrivateMobileNavigationShell({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!cancelled) setSession(currentSession);
    };

    loadSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!cancelled) setSession(currentSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const isPrivateMobileRoute =
    Boolean(session) &&
    !isFullScreenEditorRoute(pathname, location.search) &&
    (pathname === "/editor" ||
      pathname === "/profile" ||
      pathname === "/encrypted-documents" ||
      pathname === "/admin" ||
      pathname === "/template-builder" ||
      pathname === "/template-bank");

  if (!isPrivateMobileRoute) return <>{children}</>;

  return (
    <PremiumMobileNavDrawer>
      {children}
      <MobileBottomNav />
    </PremiumMobileNavDrawer>
  );
}

