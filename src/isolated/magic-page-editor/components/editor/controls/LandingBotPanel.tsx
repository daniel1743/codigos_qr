import React, { useEffect, useState } from "react";
import { CrownIcon } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "../../../contexts/EditorContext";
import { createDefaultLandingBot, isLandingBotProTier } from "../../../../../lib/landing-bot/config";
import { getLandingBotPlanFn } from "../../../../../lib/landing-bot/server";
import type { LandingBotConfig, LandingBotTone } from "../../../types/editor";
import { PanelSection } from "./PanelSection";
import { TextField } from "./TextField";
import { Toggle } from "./Toggle";
import { Segmented } from "./Segmented";
import { ImagePicker } from "./ImagePicker";

const TONE_OPTIONS: { value: LandingBotTone; label: string }[] = [
  { value: "cercano", label: "Cercano" },
  { value: "formal", label: "Formal" },
  { value: "profesional", label: "Profesional" },
];

/**
 * Owner-facing configuration for the landing bot.
 * Free: activate, name, about, tone, WhatsApp. Pro: services, hours, address,
 * FAQ, prices, social, stores and the bot face/icon.
 */
export function LandingBotPanel() {
  const ed = useEditor();
  const bot = ed.doc.bot ?? createDefaultLandingBot();
  const [tier, setTier] = useState<string>("free");
  const isPro = isLandingBotProTier(tier);

  useEffect(() => {
    let active = true;
    getLandingBotPlanFn()
      .then((t) => {
        if (active) setTier(t);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const update = (patch: Partial<LandingBotConfig>) => {
    ed.updateDoc((d) => ({ ...d, bot: { ...createDefaultLandingBot(), ...d.bot, ...patch } }));
  };
  const updateSocial = (patch: Partial<LandingBotConfig["social"]>) => {
    ed.updateDoc((d) => {
      const base = { ...createDefaultLandingBot(), ...d.bot };
      return { ...d, bot: { ...base, social: { ...base.social, ...patch } } };
    });
  };
  const updatePrices = (patch: Partial<LandingBotConfig["prices"]>) => {
    ed.updateDoc((d) => {
      const base = { ...createDefaultLandingBot(), ...d.bot };
      return { ...d, bot: { ...base, prices: { ...base.prices, ...patch } } };
    });
  };

  const applyChanges = () => {
    ed.updateDoc((d) => ({ ...d, bot: { ...createDefaultLandingBot(), ...d.bot } }));
    toast.success("Cambios guardados");
    ed.clearSelection();
  };

  return (
    <div className="space-y-4">
      <PanelSection
        title="Asistente del bot"
        hint="Tu visitante chatea con un asistente entrenado con esta info. Se mostrará en tu página publicada."
      >
        <Toggle label="Activar bot en mi página" checked={bot.enabled} onChange={(v) => update({ enabled: v })} />
      </PanelSection>

      {bot.enabled && (
        <>
          <PanelSection title="Identidad">
            <TextField label="Nombre del asistente" value={bot.name} onCommit={(v) => update({ name: v })} />
            <TextField
              label="Quién eres y qué haces"
              multiline
              value={bot.about}
              onCommit={(v) => update({ about: v })}
              placeholder="Ej: Soy Ana, nutricionista en Santiago. Ofrezco planes personalizados y agendo consultas."
            />
            <div className="grid gap-2">
              <span className="text-[12px] font-medium text-mute">Tono</span>
              <Segmented<LandingBotTone>
                ariaLabel="Tono del bot"
                options={TONE_OPTIONS}
                value={bot.tone}
                onChange={(v) => update({ tone: v })}
              />
            </div>
          </PanelSection>

          <PanelSection title="WhatsApp" hint="Sin costo: el bot ofrece un botón directo a tu WhatsApp.">
            <Toggle
              label="Mostrar botón de WhatsApp"
              checked={bot.whatsappEnabled}
              onChange={(v) => update({ whatsappEnabled: v })}
            />
            {bot.whatsappEnabled && (
              <TextField
                label="Número de WhatsApp"
                prefix="+"
                value={bot.whatsapp}
                onCommit={(v) => update({ whatsapp: v })}
                placeholder="56 9 1234 5678"
              />
            )}
          </PanelSection>

          {isPro ? (
            <>
              <PanelSection title="Datos ampliados (Pro)">
                <TextField label="Servicios / productos" multiline value={bot.services} onCommit={(v) => update({ services: v })} />
                <TextField label="Horario" value={bot.hours} onCommit={(v) => update({ hours: v })} />
                <TextField label="Dirección" value={bot.address} onCommit={(v) => update({ address: v })} />
                <TextField label="Preguntas frecuentes" multiline value={bot.faq} onCommit={(v) => update({ faq: v })} />
                <TextField label="Tiendas" multiline value={bot.stores} onCommit={(v) => update({ stores: v })} />
                <Toggle
                  label="Mostrar precios"
                  description={`Moneda: ${bot.prices.currency}`}
                  checked={bot.prices.enabled}
                  onChange={(v) => updatePrices({ enabled: v })}
                />
              </PanelSection>

              <PanelSection title="Redes sociales (Pro)" hint="Solo si las completas; el bot las usará como enlaces.">
                <TextField label="Instagram" value={bot.social.instagram} onCommit={(v) => updateSocial({ instagram: v })} />
                <TextField label="TikTok" value={bot.social.tiktok} onCommit={(v) => updateSocial({ tiktok: v })} />
                <TextField label="Facebook" value={bot.social.facebook} onCommit={(v) => updateSocial({ facebook: v })} />
                <TextField label="YouTube" value={bot.social.youtube} onCommit={(v) => updateSocial({ youtube: v })} />
                <TextField label="Sitio web" value={bot.social.website} onCommit={(v) => updateSocial({ website: v })} />
              </PanelSection>

              <PanelSection title="Rostro del bot (Pro)" hint="Usa el icono genérico o sube tu propia imagen.">
                <Segmented<"generic" | "custom">
                  ariaLabel="Rostro del bot"
                  options={[
                    { value: "generic", label: "Genérico" },
                    { value: "custom", label: "Personalizado" },
                  ]}
                  value={bot.persona}
                  onChange={(v) => update({ persona: v })}
                />
                {bot.persona === "custom" && (
                  <ImagePicker
                    value={bot.avatarUrl || undefined}
                    onChange={(src) => update({ avatarUrl: src })}
                    {...(ed.uploadAsset ? { onUpload: ed.uploadAsset } : {})}
                  />
                )}
              </PanelSection>
            </>
          ) : (
            <PanelSection title="Más opciones">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-50/60 p-3 text-[12.5px] leading-snug text-amber-800">
                <CrownIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Precios, redes, tiendas, horario, FAQ y el <strong>rostro del bot</strong> están disponibles en el plan{" "}
                  <strong>Pro</strong>.
                </span>
              </div>
            </PanelSection>
          )}
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 border-t border-line bg-white/95 px-1 pb-1 pt-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={applyChanges}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-2"
          aria-live="polite"
        >
          Aplicar cambios
        </button>
      </div>
    </div>
  );
}

