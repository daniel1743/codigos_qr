import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { profileService } from "../services/profile.service";
import type { Profile } from "../types/database";
import { Auth } from "../components/Auth";
import { QRCodeAdvanced } from "../components/qr/QRCodeAdvanced";
import { QRFrameShell } from "../components/qr/QRFrameShell";
import { toast } from "sonner";
import { getPublicProfileUrl } from "../lib/url";
import { ShareSection } from "../components/editor/ShareSection";
import type { CornerDotType, CornerSquareType, DotsType, QREffectType } from "../types/qr-advanced";
import { ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { PowerEditorMainEntry } from "../power-editor/client/src/components/PowerEditorMainEntry";

export const Route = createFileRoute("/editor")({
  component: PowerEditorMainEntry,
});

function EditorQRPreview({
  profile,
  publicId,
}: {
  profile: Partial<Profile>;
  publicId: string;
}) {
  const fgColor = profile.qr_foreground_color || "#000000";
  const bgColor = profile.qr_background_color || "#FFFFFF";
  const cornerTopLeftColor =
    profile.qr_corner_top_left_color || profile.qr_corners_square_color || fgColor;
  const cornerTopRightColor =
    profile.qr_corner_top_right_color || profile.qr_corners_square_color || fgColor;
  const cornerBottomLeftColor =
    profile.qr_corner_bottom_left_color || profile.qr_corners_square_color || fgColor;
  const qrUrl = publicId ? getPublicProfileUrl(publicId) : "https://preview.local/qr";
  const logoEnabled = profile.qr_logo_enabled ?? false;

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <QRFrameShell
        frameStyle={profile.qr_frame_style || "plain"}
        className="w-full max-w-[280px] md:max-w-[360px]"
      >
        <QRCodeAdvanced
          key={`editor-qr-${qrUrl}-${JSON.stringify(profile.qr_gradient)}-${fgColor}-${bgColor}-${profile.qr_frame_style}-${logoEnabled}-${profile.qr_effect}`}
          options={{
            data: qrUrl,
            width: 360,
            height: 360,
            margin: 4,
            dotsColor: profile.qr_gradient || fgColor,
            backgroundColor: bgColor,
            dotsType: (profile.qr_dots_type || "square") as DotsType,
            cornersSquareType: (profile.qr_corners_square_type || "extra-rounded") as CornerSquareType,
            cornersDotType: (profile.qr_corners_dot_type || "dot") as CornerDotType,
            cornersSquareColor: profile.qr_corners_square_color || fgColor,
            cornersDotColor: profile.qr_corners_dot_color || fgColor,
            cornerSquareColors: {
              topLeft: cornerTopLeftColor,
              topRight: cornerTopRightColor,
              bottomLeft: cornerBottomLeftColor,
            },
            frameStyle: profile.qr_frame_style || "plain",
            effect: (profile.qr_effect || "none") as QREffectType,
            ...(logoEnabled && profile.qr_logo_url ? { image: profile.qr_logo_url } : {}),
            ...(logoEnabled && profile.qr_logo_url
              ? {
                  imageOptions: {
                    hideBackgroundDots: true,
                    imageSize: 0.22,
                    margin: 4,
                    crossOrigin: "anonymous",
                  },
                }
              : {}),
            qrOptions: { errorCorrectionLevel: "H" },
          }}
          className="flex h-full w-full items-center justify-center [&_canvas]:h-full [&_canvas]:w-full"
        />
      </QRFrameShell>
    </div>
  );
}

export function LegacyEditorPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserSupabaseClient();
  const loadedUserId = useRef<string | null>(null);

  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [savedPublicId, setSavedPublicId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      if (session) {
        loadData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (userId: string) => {
    if (loadedUserId.current === userId) return;
    setLoading(true);
    try {
      const p = await profileService.getProfileByUserId(supabase, userId);
      if (p) {
        setProfile(p);
        if (p.published && p.public_id) {
          setSavedPublicId(p.public_id);
          setIsPublished(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      loadedUserId.current = userId;
      setLoading(false);
    }
  };

  const handleProfileChange = (updates: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const saveProfile = async (publish: boolean) => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const updates = { ...profile, published: publish };
      const saved = await profileService.updateProfile(supabase, session.user.id, updates);
      if (saved) {
        setProfile(saved);
        if (saved.published && saved.public_id) {
          setSavedPublicId(saved.public_id);
          setIsPublished(true);
        }
        toast.success(publish ? "QR publicado correctamente" : "QR guardado correctamente");
      }
    } catch (e) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-xl">
          <Auth />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] md:h-[100dvh] w-full bg-background overflow-x-hidden md:overflow-hidden pb-24 md:pb-0">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between h-14 border-b bg-background/95 backdrop-blur px-4 w-full">
        <Link to="/template-builder" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Plantilla
        </Link>
        <span className="font-semibold text-sm">Editor QR</span>
        <div className="w-16" /> {/* Spacer */}
      </header>

      {/* MOBILE PREVIEW (Scrolls naturally) */}
      <div className="md:hidden w-full flex justify-center py-8 bg-slate-100 dark:bg-slate-900/50 border-b">
        <EditorQRPreview profile={profile} publicId={savedPublicId || profile.public_id || ""} />
      </div>

      {/* MOBILE CONTROLS */}
      <div className="md:hidden w-full p-4 max-w-xl mx-auto">
        <ShareSection
          publicId={savedPublicId || profile.public_id || ""}
          published={isPublished}
          saving={saving}
          onSave={saveProfile}
          isValid={true}
          profile={profile}
          onChange={handleProfileChange}
        />
      </div>
      
      {/* DESKTOP LAYOUT */}
      <aside className="hidden md:flex w-[400px] lg:w-[480px] border-r bg-card flex-col h-full overflow-y-auto p-6 z-10">
        <div className="mb-6">
          <Link to="/template-builder" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Volver a la Plantilla
          </Link>
        </div>
        <ShareSection
          publicId={savedPublicId || profile.public_id || ""}
          published={isPublished}
          saving={saving}
          onSave={saveProfile}
          isValid={true}
          profile={profile}
          onChange={handleProfileChange}
        />
      </aside>
      
      <main className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/50 relative overflow-hidden">
        <div className="flex w-full max-w-[540px] flex-col items-center gap-5 rounded-3xl border bg-background/95 p-8 shadow-2xl">
           <div className="flex w-full items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Vista Previa</h2>
                <p className="text-sm text-muted-foreground">Tu código QR en vivo</p>
              </div>
           </div>
           <EditorQRPreview profile={profile} publicId={savedPublicId || profile.public_id || ""} />
        </div>
      </main>
      
    </div>
  );
}
export type EditorTarget = { type: "profile.photo" | "profile.name" | "profile.bio" | "profile.alias" | "profile.cover" | "profile.footer" } | { type: "links.manage" } | { type: "link"; linkId: string } | { type: "appearance.templates" | "appearance.typography" | "appearance.colors" | "appearance.buttons" | "appearance.spacing" | "appearance.decoration" } | { type: "social_cover" | "hero_social" } | { type: "qr" };
