import { useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { QRCodeAdvanced, useQRAdvancedDownload } from "./QRCodeAdvanced";
import {
  requiresAdvancedRenderer,
  createAdvancedOptionsFromSimple,
} from "../../lib/qr-advanced-utils";
import type { DotsType, QREffectType, QRFrameStyle } from "../../types/qr-advanced";
import { downloadQR, downloadSVG } from "../../lib/downloadQR";
import { getPublicPageUrl, getPublicQrUrl } from "../../lib/url";
import { ColorControl } from "../editor/ColorControl";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { QRFrameShell } from "./QRFrameShell";
import { QrUrlBox } from "./studio/QrUrlBox";
import { QrPreviewCard } from "./studio/QrPreviewCard";
import { QrStudioSection } from "./studio/QrStudioSection";
import { QrExportPanel, type QrExportState } from "./studio/QrExportPanel";
import { pageQrService } from "../../services/page-qr.service";
import type { Page, PageQrConfig } from "../../types/database";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const DOT_STYLE_OPTIONS = [
  { value: "square", label: "Clásico" },
  { value: "rounded", label: "Suave" },
  { value: "dots", label: "Puntos" },
] as const;

const FRAME_STYLE_OPTIONS = [
  { value: "plain", label: "Simple" },
  { value: "stamp", label: "Sello" },
  { value: "badge", label: "Etiqueta" },
  { value: "phone", label: "Celular" },
  { value: "bottle", label: "Bebida" },
] as const;

/** Export formats/sizes actually produced by the existing page exporters. */
const PAGE_EXPORT_FORMATS = [
  { value: "png", label: "PNG", hint: "Imagen lista para usar" },
  { value: "svg", label: "SVG", hint: "Vectorial, ideal imprenta" },
] as const;

const PAGE_EXPORT_SIZES = [
  { value: 256, label: "256 px", hint: "Pruebas / pantalla" },
  { value: 512, label: "512 px", hint: "Web y mensajes" },
  { value: 1024, label: "1024 px", hint: "Recomendado" },
] as const;

const PAGE_QR_CANVAS_ID = "page-qr-code-canvas";
const PAGE_QR_SVG_ID = "page-qr-code-svg";
const PAGE_QR_EXPORT_CANVAS_ID = "page-qr-export-canvas";

interface PageQrPanelProps {
  page: Page;
  userId: string;
}

/**
 * PAGES_5 / F4 — Per-page QR panel.
 *
 * Reuses the SAME QR generation engine as the profile QR Studio
 * (`qrcode.react` QRCodeCanvas/QRCodeSVG + `QRCodeAdvanced`) and the same
 * `downloadQR`/`downloadSVG`/`useQRAdvancedDownload` exporters.
 *
 * F4 canonical payload: the QR encodes `/q/{public_id}` (the QR scan boundary
 * that resolves the published page, records ONE `qr_scan` and redirects to
 * `/pg/{public_id}`). It never encodes the direct `/pg/` destination and never
 * an alias. Styling persists independently to `public.pages.qr_config`, never
 * to `profiles`.
 */
export function PageQrPanel({ page, userId }: PageQrPanelProps) {
  const [config, setConfig] = useState<PageQrConfig>(page.qr_config ?? {});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "svg">("png");
  const [exportSize, setExportSize] = useState<number>(256);
  const [preparingExport, setPreparingExport] = useState(false);
  const [exportState, setExportState] = useState<QrExportState>("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const { download: downloadAdvancedQR } = useQRAdvancedDownload();

  /** URL the QR physically encodes — the canonical `/q/` scan boundary. */
  const qrUrl = getPublicQrUrl(page.public_id);
  /** Final destination after the scan is registered and the visitor is redirected. */
  const destinationUrl = getPublicPageUrl(page.public_id);
  const displayUrl = qrUrl.replace(/^https?:\/\//, "");

  const fgColor = config.qr_foreground_color ?? "#000000";
  const bgColor = config.qr_background_color ?? "#ffffff";
  const dotsType = config.qr_dots_type ?? "square";
  const effect = config.qr_effect ?? "none";
  const frameStyle = (config.qr_frame_style ?? "plain") as QRFrameStyle;

  const advanced =
    requiresAdvancedRenderer(config.qr_gradient ?? fgColor, dotsType, effect) ||
    frameStyle !== "plain";

  const update = (patch: PageQrConfig) => setConfig((c) => ({ ...c, ...patch }));

  /**
   * F4 — format/size changes are real user actions: clear the previous export
   * result so the download button becomes actionable again (no fake timers).
   */
  const changeExportFormat = (next: "png" | "svg") => {
    setExportFormat(next);
    setExportState("idle");
    setExportError(null);
  };

  const changeExportSize = (next: number) => {
    setExportSize(next);
    setExportState("idle");
    setExportError(null);
  };

  const advancedOptions = createAdvancedOptionsFromSimple(
    qrUrl,
    fgColor,
    bgColor,
    256,
    config.qr_logo_enabled ? (config.qr_logo_url ?? undefined) : undefined,
    config.qr_logo_enabled ?? false,
  );
  advancedOptions.dotsType = dotsType as DotsType;
  advancedOptions.effect = effect as QREffectType;
  if (config.qr_frame_style) {
    advancedOptions.frameStyle = frameStyle;
  }

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

  const copyQrUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast.success("Enlace del QR copiado");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleExport = async () => {
    setExportState("working");
    setExportError(null);
    try {
      if (advanced) {
        await downloadAdvancedQR(
          { ...advancedOptions, width: exportSize, height: exportSize },
          `qr-${page.public_id}-${exportSize}px.${exportFormat}`,
          exportFormat,
        );
        setExportState("done");
        toast.success(`QR ${exportFormat.toUpperCase()} descargado`);
        return;
      }

      if (exportFormat === "svg") {
        await downloadSVG(page.public_id, PAGE_QR_SVG_ID, `qr-${page.public_id}.svg`);
        setExportState("done");
        toast.success("QR SVG descargado");
        return;
      }

      // Deterministic wait for the hidden high-res canvas to mount before
      // reading it from the DOM (no timers, no guessed delays).
      setPreparingExport(true);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });
      const canvas = document.getElementById(PAGE_QR_EXPORT_CANVAS_ID);
      if (!canvas) {
        setExportState("error");
        setExportError("El lienzo de exportación no está listo. Inténtalo de nuevo.");
        toast.error("No se pudo preparar el QR para descargar");
        return;
      }
      downloadQR(page.public_id, PAGE_QR_EXPORT_CANVAS_ID, `qr-${page.public_id}-${exportSize}px.png`);
      setExportState("done");
      toast.success("QR PNG descargado");
    } catch (error) {
      console.error("Page QR export failed:", error);
      setExportState("error");
      setExportError(error instanceof Error ? error.message : "Error desconocido");
      toast.error("Error al exportar el QR");
    } finally {
      setPreparingExport(false);
    }
  };

  return (
    <div className="space-y-4">
      <QrUrlBox
        label="URL del QR (canónica)"
        url={qrUrl}
        description="Es la URL que codifica el QR: identifica la página, registra el escaneo y luego redirige."
        onCopy={copyQrUrl}
        copied={copied}
        secondary={{
          label: "Destino final tras el escaneo",
          url: destinationUrl,
          description: "El visitante llega aquí después de que se registre el escaneo.",
        }}
      />

      <QrPreviewCard
        title="Código QR de la página"
        displayUrl={displayUrl}
        published={page.published}
        onCopy={copyQrUrl}
        copied={copied}
        onOpen={destinationUrl}
        openLabel="Abrir destino"
        note="El QR apunta a la URL canónica /q/: el escaneo se registra antes de redirigir."
      >
        <QRFrameShell frameStyle={frameStyle} className="w-full max-w-[260px]">
          {advanced ? (
            <QRCodeAdvanced options={advancedOptions} />
          ) : (
            <QRCodeCanvas
              id={PAGE_QR_CANVAS_ID}
              value={qrUrl}
              size={256}
              fgColor={fgColor}
              bgColor={bgColor}
            />
          )}
        </QRFrameShell>
      </QrPreviewCard>



      <QrStudioSection title="Diseño" description="Forma de los módulos y marco del código.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-cq-muted">Estilo de puntos</Label>
            <Select
              value={dotsType}
              onValueChange={(value) => update({ qr_dots_type: value as DotsType })}
            >
              <SelectTrigger className="w-full">
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
          <div className="space-y-2">
            <Label className="text-xs text-cq-muted">Marco</Label>
            <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
              {FRAME_STYLE_OPTIONS.map((opt) => {
                const selected = frameStyle === opt.value;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant="outline"
                    aria-pressed={selected}
                    className={`h-11 justify-start rounded-cq-sm ${
                      selected ? "border-cq-blue bg-cq-blue-50 text-cq-ink" : "text-cq-muted"
                    }`}
                    onClick={() => update({ qr_frame_style: opt.value })}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </QrStudioSection>

      <QrStudioSection
        title="Colores"
        description="Usa un patrón oscuro sobre fondo claro para mantener el escaneo."
      >
        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-cq-muted">Color del código</Label>
            <ColorControl value={fgColor} onChange={(v) => update({ qr_foreground_color: v })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-cq-muted">Color del fondo</Label>
            <ColorControl value={bgColor} onChange={(v) => update({ qr_background_color: v })} />
          </div>
        </div>
      </QrStudioSection>

      <QrExportPanel
        format={exportFormat}
        formats={PAGE_EXPORT_FORMATS}
        onFormatChange={changeExportFormat}
        size={exportSize}
        sizes={PAGE_EXPORT_SIZES}
        onSizeChange={changeExportSize}
        onDownload={handleExport}
        state={exportState}
        errorMessage={exportError}
      />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="h-11 rounded-cq-sm px-5">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar diseño
        </Button>
      </div>

      {/* Hidden SVG used only for the standard (non-advanced) SVG export. */}
      <span className="hidden" aria-hidden>
        <QRCodeSVG
          id={PAGE_QR_SVG_ID}
          value={qrUrl}
          size={256}
          fgColor={fgColor}
          bgColor={bgColor}
        />
      </span>

      {/* Hidden high-res canvas used only for PNG export of the simple QR. */}
      {preparingExport && exportFormat === "png" && !advanced ? (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px", visibility: "hidden" }}>
          <QRCodeCanvas
            id={PAGE_QR_EXPORT_CANVAS_ID}
            value={qrUrl}
            size={exportSize}
            level="H"
            marginSize={4}
            fgColor={fgColor}
            bgColor={bgColor}
          />
        </div>
      ) : null}
    </div>
  );
}

