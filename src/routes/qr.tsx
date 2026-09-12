import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { QRStudio } from "../components/qr/QRStudio";
import { Button } from "../components/ui/button";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { profileService } from "../services/profile.service";
import type { Profile } from "../types/database";

export const Route = createFileRoute("/qr")({
  component: QrPage,
});

/** Only these fields are persisted on save — never public_id/slug/template_config. */
const QR_FIELDS = [
  "qr_foreground_color",
  "qr_background_color",
  "qr_logo_url",
  "qr_logo_enabled",
  "qr_gradient",
  "qr_dots_type",
  "qr_corners_square_type",
  "qr_corners_dot_type",
  "qr_corners_square_color",
  "qr_corners_dot_color",
  "qr_corner_top_left_color",
  "qr_corner_top_right_color",
  "qr_corner_bottom_left_color",
  "qr_frame_style",
  "qr_effect",
  "qr_demo_logo_id",
] as const;

function pickQrFields(profile: Partial<Profile>): Partial<Profile> {
  const out: Record<string, unknown> = {};
  const source = profile as Record<string, unknown>;
  for (const key of QR_FIELDS) {
    const value = source[key];
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<Profile>;
}

function QrPage() {
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const loaded = await profileService.getProfileByUserId(supabase, user.id);
        setProfile(loaded);
      } catch (error) {
        console.error("Error loading profile for QR:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (updates: Partial<Profile>) => {
    setProfile((p) => ({ ...(p ?? {}), ...updates }));
  };

  const saveDesign = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      await profileService.updateProfile(supabase, profile.id, pickQrFields(profile));
      toast.success("Diseño guardado");
    } catch (error) {
      console.error("Error saving QR design:", error);
      toast.error("Error al guardar el diseño");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Tu código QR</h1>
          <p className="text-sm text-muted-foreground">
            Este QR apunta permanentemente a tu página pública. Editar el diseño no cambia su destino.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : profile?.public_id ? (
          <>
            <QRStudio
              publicId={profile.public_id}
              published={!!profile.published}
              saving={saving}
              onSave={saveDesign}
              isValid
              profile={profile}
              onChange={onChange}
              basicOnly
              showSaveControls={false}
            />
            <div className="mt-6 flex justify-end">
              <Button onClick={saveDesign} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar diseño
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no tienes una página pública. Crea tu página para generar tu QR.
          </p>
        )}
      </main>
    </AppShell>
  );
}
