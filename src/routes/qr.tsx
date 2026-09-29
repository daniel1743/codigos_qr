import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { QRStudio } from "../components/qr/QRStudio";
import { CustomPublicLinkControl } from "../components/qr/CustomPublicLinkControl";
import { QrStudioHeader } from "../components/qr/studio/QrStudioHeader";
import { QrUrlBox } from "../components/qr/studio/QrUrlBox";
import { QrStatStrip } from "../components/qr/studio/QrStatStrip";
import { Button } from "../components/ui/button";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { getAliasProfileUrl, getPublicProfileUrl } from "../lib/url";
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
  const [copiedFeedback, setCopiedFeedback] = useState(false);

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

  /** Real URL encoded by the profile QR (canonical helper). */
  const qrUrl = profile?.public_id ? getPublicProfileUrl(profile.public_id) : "";
  const aliasUrl = profile?.slug ? getAliasProfileUrl(profile.slug) : null;

  const copyQrUrl = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast.success("Enlace del QR copiado");
      setCopiedFeedback(true);
      window.setTimeout(() => setCopiedFeedback(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <QrStudioHeader
          title="Tu código QR"
          description="Personaliza y administra el código QR de tu perfil. El destino es permanente: cambiar el diseño nunca cambia a dónde lleva."
          published={!!profile?.published}
          context={
            qrUrl ? <span className="break-all font-mono text-[12px]">{qrUrl}</span> : undefined
          }
        />

        {loading ? (
          <p className="mt-6 text-sm text-cq-muted">Cargando tu QR…</p>
        ) : profile?.public_id ? (
          <>
            <div className="mt-6 sm:mt-10">
              <QRStudio
                presentation="studio"
                publicId={profile.public_id}
                published={!!profile.published}
                saving={saving}
                onSave={saveDesign}
                isValid
                profile={profile}
                onChange={onChange}
                basicOnly
                showSaveControls={false}
                topSlot={
                  <>
                    <QrUrlBox
                      url={qrUrl}
                      description="Es la URL real que codifica tu QR (identidad pública inmutable del perfil)."
                      onCopy={copyQrUrl}
                      copied={copiedFeedback}
                      secondary={{
                        label: "Enlace público para compartir",
                        url: aliasUrl ?? qrUrl,
                        description:
                          "El alias se usa al compartir en redes; el QR impreso siempre apunta a la URL del QR.",
                      }}
                    />
                    <CustomPublicLinkControl
                      currentAlias={profile?.slug ?? null}
                      publicUrlPrefix="cripqer.dev/"
                      getPublicUrl={getAliasProfileUrl}
                      checkAvailability={async (alias) => {
                        const id = profile?.id;
                        if (!id) return false;
                        const { data, error } = await supabase
                          .from("profiles")
                          .select("id")
                          .eq("slug", alias)
                          .neq("id", id)
                          .maybeSingle();
                        if (error) throw error;
                        return data == null;
                      }}
                      saveAlias={async (alias) => {
                        const id = profile?.id;
                        if (!id) throw new Error("Perfil no disponible");
                        const saved = await profileService.updateProfile(supabase, id, {
                          slug: alias ?? "",
                        });
                        setProfile((current) => (current ? { ...current, slug: saved.slug } : current));
                        return saved.slug;
                      }}
                    />
                    <QrStatStrip
                      items={[
                        {
                          label: "Aperturas",
                          value: profile.scan_count ?? 0,
                          hint: "Total de visitas a tu perfil",
                        },
                      ]}
                    />
                  </>
                }
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={saveDesign} disabled={saving} className="h-11 rounded-cq-sm px-5">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar diseño
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-6 rounded-cq-lg border border-cq-line bg-white p-4 text-sm text-cq-muted shadow-soft">
            Aún no tienes una página pública. Crea tu página para generar tu QR.
          </p>
        )}
      </main>
    </AppShell>
  );
}
