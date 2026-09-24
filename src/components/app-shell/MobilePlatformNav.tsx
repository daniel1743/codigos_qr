import { useLocation, useNavigate } from "@tanstack/react-router";
import { FileLock2, Home, Pencil, QrCode, User } from "lucide-react";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { resolveCanonicalMagicPageId } from "../../lib/editor-routing/resolveCanonicalMagicPage";
import { PLATFORM_BRAND } from "../platform/platform-brand";

type MobilePlatformNavProps = { editorPageId?: string };

function activePath(pathname: string, href: string): boolean {
  return pathname === href || pathname === `${href}/`;
}

export default function MobilePlatformNav({ editorPageId }: MobilePlatformNavProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [resolvedPageId, setResolvedPageId] = useState<string | undefined>(editorPageId);

  useEffect(() => {
    if (editorPageId) {
      setResolvedPageId(editorPageId);
      return;
    }
    let active = true;
    void (async () => {
      const supabase = getBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const pageId = await resolveCanonicalMagicPageId(supabase, sessionData.session.user.id);
      if (active) setResolvedPageId(pageId ?? undefined);
    })();
    return () => {
      active = false;
    };
  }, [editorPageId]);

  const goEditor = () => {
    if (resolvedPageId) {
      void navigate({ to: "/pages/$pageId/edit", params: { pageId: resolvedPageId } });
    } else {
      void navigate({ to: "/profile" });
    }
  };

  const items = [
    { id: "home", label: "Inicio", icon: Home, onClick: () => void navigate({ to: "/profile" }), active: activePath(pathname, "/profile") },
    { id: "editor", label: "Editor", icon: Pencil, onClick: goEditor, active: /^\/pages\/[^/]+\/edit\/?$/.test(pathname) },
    { id: "qr", label: "QR", icon: QrCode, onClick: () => void navigate({ to: "/qr" }), active: activePath(pathname, "/qr") },
    { id: "profile", label: "Perfil", icon: User, onClick: () => void navigate({ to: "/account" }), active: activePath(pathname, "/account") },
    { id: "documents", label: "Documentos cifrados", icon: FileLock2, onClick: () => void navigate({ to: "/encrypted-documents" }), active: activePath(pathname, "/encrypted-documents") },
  ];

  return (
    <>
      <nav
        aria-label="Navegación inferior de Cripqer"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
              className="relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors"
              style={{ color: item.active ? PLATFORM_BRAND.colors.blue : PLATFORM_BRAND.colors.textSecondary }}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className={item.id === "documents" ? "text-[9px] leading-3" : undefined}>{item.label}</span>
              {item.active && (
                <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full" style={{ backgroundColor: PLATFORM_BRAND.colors.gold }} />
              )}
            </button>
          );
        })}
      </nav>

    </>
  );
}
