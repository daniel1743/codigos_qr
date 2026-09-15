import { useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { QRCodeAdvanced } from "./QRCodeAdvanced";
import { requiresAdvancedRenderer, createAdvancedOptionsFromSimple } from "../../lib/qr-advanced-utils";
import type { DotsType, QREffectType, QRFrameStyle } from "../../types/qr-advanced";
import { downloadQR, downloadSVG } from "../../lib/downloadQR";
import { getPublicPageUrl } from "../../lib/url";
import { ColorControl } from "../editor/ColorControl";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { pageQrService } from "../../services/page-qr.service";
import type { Page, PageQrConfig } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { toast } from "sonner";
import { Copy, Download, Loader2 } from "lucide-react";

const DOT_STYLE_OPTIONS = [
  { value: "square", label: "Clásico" },
  { value: "rounded", label: "Suave" },
  { value: "dots", label: "Puntos" },
] as const;

const PAGE_QR_CANVAS_ID = "page-qr-code-canvas";
const PAGE_QR_SVG_ID = "page-qr-code-svg";

interface PageQrPanelProps {
  page: Page;
  userId: string;
}

/**
 * PAGES_5 — Per-page QR panel.
 *
 * Reuses the SAME QR generation engine as the profile QR Studio
 * (`qrcode.react` QRCodeCanvas/QRCodeSVG + `QRCodeAdvanced`) and the same
 * `downloadQR`/`downloadSVG` export helpers. The QR destination is the stable
 * child-page URL `/pg/{public_id}` (never title/slug/alias). Styling persists
 * independently to `public.pages.qr_config`, never to `profiles`.
 */
export function PageQrPanel({ page, userId }: PageQrPanelProps) {
  const [config, setConfig] = useState<PageQrConfig>(page.qr_config ?? {});
  const [saving, setSaving] = useState(false);

  const publicUrl = getPublicPageUrl(page.public_id);
  const fgColor = config.qr_foreground_color ?? "#000000";
  const bgColor = config.qr_background_color ?? "#ffffff";
  const dotsType = config.qr_dots_type ?? "square";
  const effect = config.qr_effect ?? "none";

  const advanced = requiresAdvancedRenderer(config.qr_gradient ?? fgColor, dotsType, effect);

  const update = (patch: PageQrConfig) => setConfig((c) => ({ ...c, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const supabase = getBrowserSupabaseClient();
      await pageQrService.saveQrConfig(supabase, page.id, userId, config);
      toast.success("Diseño del QR guardado");
    } catch (error) {
      console.error("Error saving page QR:", error);
      toast.error("Error al guardar el diseño del QR");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const advancedOptions = createAdvancedOptionsFromSimple(
    publicUrl,
    fgColor,
    bgColor,
    256,
    config.qr_logo_enabled ? config.qr_logo_url ?? undefined : undefined,
    config.qr_logo_enabled ?? false,
  );
  advancedOptions.dotsType = dotsType as DotsType;
  advancedOptions.effect = effect as QREffectType;
  if (config.qr_frame_style) {
    advancedOptions.frameStyle = config.qr_frame_style as QRFrameStyle;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Destino del QR</p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{publicUrl}</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyUrl} className="shrink-0">
          <Copy className="mr-2 h-4 w-4" /> Copiar
        </Button>
      </div>

      <div className="flex justify-center rounded-xl border bg-white p-6">
        {advanced ? (
          <QRCodeAdvanced options={advancedOptions} />
        ) : (
          <QRCodeCanvas
            id={PAGE_QR_CANVAS_ID}
            value={publicUrl}
            size={256}
            fgColor={fgColor}
            bgColor={bgColor}
          />
        )}
        {/* Hidden SVG used only for SVG export (standard square-dot QR). */}
        <span className="hidden">
          <QRCodeSVG id={PAGE_QR_SVG_ID} value={publicUrl} size={256} fgColor={fgColor} bgColor={bgColor} />
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <Label className="text-sm font-medium">Color del código</Label>
          <div className="mt-2">
            <ColorControl value={fgColor} onChange={(v) => update({ qr_foreground_color: v })} />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Color del fondo</Label>
          <div className="mt-2">
            <ColorControl value={bgColor} onChange={(v) => update({ qr_background_color: v })} />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Estilo de puntos</Label>
          <Select value={dotsType} onValueChange={(value) => update({ qr_dots_type: value as DotsType })}>
            <SelectTrigger className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOT_STYLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => downloadQR(page.public_id, PAGE_QR_CANVAS_ID, `qr-${page.public_id}.png`)}
        >
          <Download className="mr-2 h-4 w-4" /> PNG
        </Button>
        <Button
          variant="outline"
          onClick={() => downloadSVG(page.public_id, PAGE_QR_SVG_ID, `qr-${page.public_id}.svg`)}
        >
          <Download className="mr-2 h-4 w-4" /> SVG
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar diseño
        </Button>
      </div>
    </div>
  );
}
