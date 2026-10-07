import { Button } from "../ui/button";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { QRCodeAdvanced, useQRAdvancedDownload } from "../qr/QRCodeAdvanced";
import { QRFrameShell } from "../qr/QRFrameShell";
import { QrStudioHeader } from "./studio/QrStudioHeader";
import { QrPreviewCard } from "./studio/QrPreviewCard";
import { QrStatStrip } from "./studio/QrStatStrip";
import { QrExportPanel, type QrExportSizeOption, type QrExportState } from "./studio/QrExportPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { requiresAdvancedRenderer } from "../../lib/qr-advanced-utils";
import { downloadQR, downloadSVG } from "../../lib/downloadQR";
import { getPublicProfileUrl, getAliasProfileUrl } from "../../lib/url";
import {
  Download,
  Loader2,
  Upload,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  Clock,
  Layers,
  Sparkles,
  Crown,
  Stamp,
  Smartphone,
  Tag,
  Wine,
  Square,
  Circle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Profile, QRVisualVersion } from "../../types/database";
import { CornerDotType, CornerSquareType, DotsType, QREffectType } from "../../types/qr-advanced";
import { profileService } from "../../services/profile.service";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Label } from "../ui/label";
import { ColorControl } from "../editor/ColorControl";
import { analyzeQrContrast } from "../../lib/qr-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Alert, AlertDescription } from "../ui/alert";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { QRTemplateGallery } from "../editor/QRTemplateGallery";
import { getMyPlanFn } from "../../lib/billing/plan-server";
import imageCompression from "browser-image-compression";
import { loadImageDeterministic } from "../../lib/qr-export/loadImage";

const QR_FRAME_OPTIONS = [
  { id: "plain", label: "Simple", icon: Square },
  { id: "stamp", label: "Sello", icon: Stamp },
  { id: "badge", label: "Etiqueta", icon: Tag },
  { id: "phone", label: "Celular", icon: Smartphone },
  { id: "bottle", label: "Bebida", icon: Wine },
] as const;

const DOT_STYLE_OPTIONS = [
  { value: "square", label: "Clásico" },
  { value: "rounded", label: "Suave" },
  { value: "dots", label: "Puntos" },
  { value: "classy-rounded", label: "Sello" },
] as const;

const CORNER_STYLE_OPTIONS = [
  { value: "square", label: "Cuadrada" },
  { value: "extra-rounded", label: "Redonda" },
  { value: "dot", label: "Circular" },
] as const;

/**
 * F4 — presentation-only grouping of the REAL control blocks into the Magic
 * QR Studio tab structure. No capability is added or hidden here: each tab only
 * re-hosts a control that already existed in this component.
 */
type QrTabId = "diseno" | "esquinas" | "marco" | "logo" | "exportar";

const QR_TABS: ReadonlyArray<{ id: QrTabId; label: string }> = [
  { id: "diseno", label: "Diseño" },
  { id: "esquinas", label: "Esquinas" },
  { id: "marco", label: "Marco" },
  { id: "logo", label: "Logo" },
  { id: "exportar", label: "Exportar" },
];

const MAGIC_CONTROL_PANEL =
  "space-y-5 rounded-cq-xl border border-cq-line bg-white p-5 shadow-soft sm:rounded-cq-2xl sm:p-6";

/** Export formats actually produced by the existing exporters. */
const EXPORT_FORMATS = [
  { value: "png", label: "PNG", hint: "Imagen lista para usar" },
  { value: "svg", label: "SVG", hint: "Vectorial, ideal imprenta" },
] as const;

/** Export sizes actually produced by the existing exporters. */
const EXPORT_SIZES: ReadonlyArray<QrExportSizeOption> = [
  { value: 256, label: "256 px", hint: "Pruebas / pantalla" },
  { value: 512, label: "512 px", hint: "Web y mensajes" },
  { value: 1024, label: "1024 px", hint: "Recomendado" },
  { value: 2048, label: "2048 px", hint: "Impresión" },
  { value: 4096, label: "4096 px", hint: "Impresión grande" },
];


function getQrColorStatus(color: string, background: string) {
  return analyzeQrContrast(color, background);
}

export interface QRStudioProps {
  publicId: string;
  published: boolean;
  saving: boolean;
  onSave: (publish: boolean) => void;
  isValid: boolean;
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  basicOnly?: boolean;
  showSaveControls?: boolean;
  /**
   * F4 — layout only.
   * `embedded` (default) keeps the historical single-column layout used by the
   * Basic Editor share section. `studio` renders the Magic two-column layout
   * (sticky preview + tabbed controls) used by the dedicated `/qr` route.
   */
  presentation?: "embedded" | "studio";
  /** Extra content rendered above the controls in `studio` mode (e.g. the alias editor). */
  topSlot?: ReactNode;
}

export function QRStudio({
  publicId,
  published,
  saving,
  onSave,
  isValid,
  profile,
  onChange,
  basicOnly = false,
  showSaveControls = true,
  presentation = "embedded",
  topSlot,
}: QRStudioProps) {
  const [publicUrl, setPublicUrl] = useState("");
  const [qrVersion, setQrVersion] = useState(0);

  // Download state
  const [exportSize, setExportSize] = useState<number>(1024);
  const [exportFormat, setExportFormat] = useState<"png" | "svg">("png");
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const { download: downloadAdvancedQR } = useQRAdvancedDownload();

  // Logo state
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  // F4 — presentation state only (no business logic, no fake jobs).
  const [qrTab, setQrTab] = useState<QrTabId>("diseno");
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [exportState, setExportState] = useState<QrExportState>("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  const fgColor = profile.qr_foreground_color || "#000000";
  const bgColor = profile.qr_background_color || "#FFFFFF";
  const cornerTopLeftColor =
    profile.qr_corner_top_left_color || profile.qr_corners_square_color || fgColor;
  const cornerTopRightColor =
    profile.qr_corner_top_right_color || profile.qr_corners_square_color || fgColor;
  const cornerBottomLeftColor =
    profile.qr_corner_bottom_left_color || profile.qr_corners_square_color || fgColor;
  const cornerDotColor = profile.qr_corners_dot_color || fgColor;
  const qrFrameStyle = profile.qr_frame_style || "plain";
  const selectedFrame =
    QR_FRAME_OPTIONS.find((option) => option.id === qrFrameStyle) || QR_FRAME_OPTIONS[0];
  const logoUrl = profile.qr_logo_url;
  const logoEnabled = profile.qr_logo_enabled ?? false;

  const [history, setHistory] = useState<QRVisualVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { contrast, isInverted, status: contrastStatus } = analyzeQrContrast(fgColor, bgColor);
  const cornerContrastChecks = [
    getQrColorStatus(cornerTopLeftColor, bgColor),
    getQrColorStatus(cornerTopRightColor, bgColor),
    getQrColorStatus(cornerBottomLeftColor, bgColor),
    getQrColorStatus(cornerDotColor, bgColor),
  ];
  const hasCornerContrastIssue = cornerContrastChecks.some(
    (check) => check.status !== "good" || check.isInverted,
  );

  const usesAdvancedQR =
    requiresAdvancedRenderer(
      profile.qr_gradient || fgColor,
      profile.qr_dots_type || "square",
      profile.qr_effect || "none",
    ) ||
    !!profile.qr_corners_square_type ||
    !!profile.qr_corners_dot_type ||
    !!profile.qr_corners_square_color ||
    !!profile.qr_corners_dot_color ||
    !!profile.qr_corner_top_left_color ||
    !!profile.qr_corner_top_right_color ||
    !!profile.qr_corner_bottom_left_color ||
    qrFrameStyle !== "plain";

  const rebuildPublicUrl = () => {
    setPublicUrl(publicId ? getPublicProfileUrl(publicId) : "");
    setQrVersion((version) => version + 1);
  };

  const aliasUrl = profile.slug ? getAliasProfileUrl(profile.slug) : publicUrl;

  /**
   * The URL the QR physically encodes (canonical helper), shown without the
   * protocol so it matches the Magic preview caption.
   */
  const previewDisplayUrl = (publicUrl || aliasUrl || "").replace(/^https?:\/\//, "");

  useEffect(() => {
    rebuildPublicUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  /**
   * B0 — this component no longer decides Premium.
   *
   * It used to read the `premium_users` table straight from the browser and
   * short-circuit on a hardcoded e-mail allowlist, which made the QR studio a
   * second, independent authority on who is Pro. It now ASKS the canonical
   * server boundary (`getMyPlanFn`), which resolves the single answer from the
   * two legitimate sources — a paid subscription or a canonical grant.
   *
   * The browser supplies no identity and reads no table. Fail-closed: any error
   * or absent session resolves to Free.
   */
  useEffect(() => {
    let cancelled = false;

    const checkPremiumAccess = async () => {
      try {
        const plan = await getMyPlanFn();
        if (!cancelled) setIsPremiumUser(plan.isPro);
      } catch (error) {
        console.error("Error checking premium access:", error);
        if (!cancelled) setIsPremiumUser(false);
      }
    };

    checkPremiumAccess();

    return () => {
      cancelled = true;
    };
  }, [profile.user_id]);

  useEffect(() => {
    if (profile?.id) {
      setLoadingHistory(true);
      const supabase = getBrowserSupabaseClient();
      profileService
        .getQRVisualVersions(supabase, profile.id)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    }
  }, [profile?.id]);

  const handleCopy = () => {
    const urlToCopy = aliasUrl || publicUrl;
    if (!urlToCopy) return;
    navigator.clipboard.writeText(urlToCopy);
    toast.success("Enlace copiado", { description: "Listo para compartir" });
    // Presentation feedback only (mirrors the Magic copy state). No fake work.
    setCopiedFeedback(true);
    window.setTimeout(() => setCopiedFeedback(false), 2000);
  };

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

  /** F4 — real reset of every styling knob back to the classic QR. */
  const restoreClassicQr = () => {
    onChange({
      qr_foreground_color: "#000000",
      qr_background_color: "#FFFFFF",
      qr_gradient: null,
      qr_dots_type: "square",
      qr_corners_square_type: "square",
      qr_corners_dot_type: "square",
      qr_corners_square_color: "#000000",
      qr_corners_dot_color: "#000000",
      qr_corner_top_left_color: "#000000",
      qr_corner_top_right_color: "#000000",
      qr_corner_bottom_left_color: "#000000",
      qr_frame_style: "plain",
      qr_logo_enabled: false,
    });
    setExportSize(1024);
  };

  const handleFixContrast = () => {
    onChange({
      qr_gradient: null,
      qr_foreground_color: "#000000",
      qr_background_color: "#FFFFFF",
      qr_corners_square_color: "#000000",
      qr_corners_dot_color: "#000000",
      qr_corner_top_left_color: "#000000",
      qr_corner_top_right_color: "#000000",
      qr_corner_bottom_left_color: "#000000",
    });
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no válido", { description: "Usa PNG, JPG, WEBP o SVG" });
      return;
    }

    setUploadingLogo(true);
    try {
      const supabase = getBrowserSupabaseClient();
      let fileToUpload = file;

      // Comprimir imagen automáticamente (excepto SVG)
      if (file.type !== "image/svg+xml") {
        toast.info("Optimizando imagen...");

        const options = {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1600,
          initialQuality: 0.95,
          useWebWorker: true,
          fileType: file.type,
        };

        try {
          const compressedFile = await imageCompression(file, options);
          fileToUpload = compressedFile;

          const savedKB = ((file.size - compressedFile.size) / 1024).toFixed(0);
          toast.success(`Imagen optimizada (${savedKB}KB reducidos)`);
        } catch (compressionError) {
          console.warn("Compression failed, using original:", compressionError);
          // Si falla la compresión, usar original
          if (file.size > 2 * 1024 * 1024) {
            toast.error("El archivo es muy grande", { description: "Máximo 2MB" });
            return;
          }
        }
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `qr-logo-${Date.now()}.${fileExt}`;
      const filePath = `${profile.user_id}/logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, fileToUpload, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      onChange({ qr_logo_url: data.publicUrl, qr_logo_enabled: true });
      toast.success("Logo subido correctamente");
    } catch (error) {
      console.error("Error al subir logo:", error);
      toast.error("Error al subir el logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDownload = async () => {
    setExportState("working");
    setExportError(null);
    // Save version if not duplicate
    if (profile?.id) {
      const lastVersion = history[0];
      const isDuplicate =
        lastVersion &&
        lastVersion.foreground_color === fgColor &&
        lastVersion.background_color === bgColor &&
        lastVersion.logo_url === logoUrl &&
        lastVersion.logo_enabled === logoEnabled;

      if (!isDuplicate) {
        try {
          const supabase = getBrowserSupabaseClient();
          const newVersion = await profileService.saveQRVisualVersion(supabase, {
            profile_id: profile.id,
            foreground_color: fgColor,
            background_color: bgColor,
            logo_url: logoUrl,
            logo_enabled: logoEnabled,
          });
          setHistory((prev) => [newVersion, ...prev].slice(0, 10));
        } catch (e) {
          console.error("Error saving QR version:", e);
        }
      }
    }

    const isAdvanced = usesAdvancedQR;

    if (isAdvanced) {
      try {
        setIsPreparingDownload(true);
        const advOptions = {
          data: publicUrl,
          width: exportSize,
          height: exportSize,
          margin: 4,
          dotsColor: profile.qr_gradient || fgColor,
          backgroundColor: bgColor,
          dotsType: (profile.qr_dots_type || "square") as DotsType,
          cornersSquareType: (profile.qr_corners_square_type ||
            "extra-rounded") as CornerSquareType,
          cornersDotType: (profile.qr_corners_dot_type || "dot") as CornerDotType,
          cornersSquareColor: profile.qr_corners_square_color || fgColor,
          cornersDotColor: cornerDotColor,
          cornerSquareColors: {
            topLeft: cornerTopLeftColor,
            topRight: cornerTopRightColor,
            bottomLeft: cornerBottomLeftColor,
          },
          frameStyle: qrFrameStyle,
          effect: (profile.qr_effect || "none") as QREffectType,
          ...(logoEnabled && logoUrl ? { image: logoUrl } : {}),
          ...(logoEnabled && logoUrl
            ? {
                imageOptions: {
                  hideBackgroundDots: true,
                  imageSize: 0.18, // 18% safe limit
                  margin: 4,
                  crossOrigin: "anonymous",
                },
              }
            : {}),
          qrOptions: { errorCorrectionLevel: "H" as const },
        };
        await downloadAdvancedQR(
          advOptions,
          `qr-${publicId}-${exportSize}px.${exportFormat}`,
          exportFormat,
        );
        toast.success("QR avanzado descargado correctamente");
        setExportState("done");
      } catch (error) {
        console.error("Advanced QR export failed:", error);
        setExportState("error");
        setExportError(error instanceof Error ? error.message : "Error desconocido");
        toast.error("Error al exportar QR avanzado", {
          description: error instanceof Error ? error.message : "Error desconocido",
        });
      } finally {
        setIsPreparingDownload(false);
      }
      return;
    }

    if (exportFormat === "svg") {
      try {
        setIsPreparingDownload(true);
        await downloadSVG(publicId, "qr-preview-svg", `qr-${publicId}.svg`);
        toast.success("SVG descargado correctamente");
        setExportState("done");
      } catch (error) {
        console.error("SVG export failed:", error);
        setExportState("error");
        setExportError(error instanceof Error ? error.message : "Error desconocido");
        toast.error("Error al exportar SVG", {
          description: error instanceof Error ? error.message : "Error desconocido",
        });
      } finally {
        setIsPreparingDownload(false);
      }
    } else {
      // PNG export with deterministic image loading
      try {
        setIsPreparingDownload(true);

        // Load logo if enabled
        if (logoEnabled && logoUrl) {
          try {
            await loadImageDeterministic(logoUrl, { crossOrigin: "anonymous", timeout: 10000 });
          } catch (logoError) {
            console.error("Logo load failed:", logoError);
            setExportState("error");
            setExportError("No se pudo cargar el logo para la exportación.");
            toast.error("Error al cargar el logo para la exportación", {
              description: "Intenta sin logo o sube una imagen diferente.",
            });
            return;
          }
        }

        // F4 — deterministic wait for the hidden high-res canvas to mount.
        // Previously the DOM was read in the same tick as the state update, so
        // the canvas did not exist yet when no logo was involved.
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
        });
        const exportCanvas = document.getElementById("qr-export-canvas");
        if (!exportCanvas) {
          setExportState("error");
          setExportError("El lienzo de exportación no está listo. Inténtalo de nuevo.");
          toast.error("No se pudo preparar el QR para descargar");
          return;
        }

        downloadQR(publicId, "qr-export-canvas", `qr-${publicId}-${exportSize}px.png`);
        toast.success("QR descargado correctamente");
        setExportState("done");
      } catch (error) {
        console.error("Export failed:", error);
        setExportState("error");
        setExportError(error instanceof Error ? error.message : "Error desconocido");
        toast.error("Error al exportar el QR", {
          description: error instanceof Error ? error.message : "Error desconocido",
        });
      } finally {
        setIsPreparingDownload(false);
      }
    }
  };

  const imageSettings =
    logoEnabled && logoUrl
      ? {
          src: logoUrl,
          height: exportSize * 0.18, // 18% of QR size for consistency with advanced renderer
          width: exportSize * 0.18,
          excavate: true,
        }
      : undefined;

  return (
    <div className="space-y-6 pb-24">
      {/* F4 — in `studio` mode the dedicated /qr route owns the page header. */}
      {presentation !== "studio" ? (
        <QrStudioHeader
          title="Mi QR"
          description="Administra y comparte tu página."
          published={published}
          activeLabel="Publicado"
          inactiveLabel="Sin publicar"
          context={
            previewDisplayUrl ? (
              <span className="break-all font-mono text-[12px]">{previewDisplayUrl}</span>
            ) : undefined
          }
        />
      ) : null}

      {!published && (
        <Alert>
          <AlertDescription>
            Tu página debe estar publicada para que otros puedan visitarla al escanear este QR.
          </AlertDescription>
        </Alert>
      )}

      {showSaveControls && (
        <>
          <div className="grid grid-cols-1 gap-2">
            <Button
              className="h-11 w-full rounded-cq-md"
              disabled={saving || !isValid}
              onClick={() => onSave(false)}
              variant="secondary"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar borrador
            </Button>
            <Button
              className="h-11 w-full rounded-cq-md"
              disabled={saving || !isValid}
              onClick={() => onSave(true)}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {published ? "Actualizar y Publicar" : "Publicar ahora"}
            </Button>
          </div>

          {!isValid && (
            <p className="text-sm text-destructive text-center">
              Debes tener nombre y al menos 3 enlaces visibles válidos para publicar.
            </p>
          )}
        </>
      )}

      {published && publicId && publicUrl && (
        <div className="space-y-5">
          {topSlot}

          {/* STATS — real value only (profiles.scan_count). Hidden in studio mode
              because the /qr route renders the shared stat strip above. */}
          {presentation !== "studio" ? (
            <QrStatStrip
              items={[
                {
                  label: "Aperturas",
                  value: profile.scan_count || 0,
                  hint: "Total de visitas a tu perfil",
                },
              ]}
            />
          ) : null}

          <div
            className={
              presentation === "studio"
                ? "grid min-w-0 gap-8 lg:grid-cols-12 lg:items-start lg:gap-x-10 lg:gap-y-12"
                : "space-y-5"
            }
          >
            <aside
              className={
                presentation === "studio"
                  ? "min-w-0 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:sticky lg:top-24"
                  : "min-w-0"
              }
            >
              <QrPreviewCard
                title="Tu código QR"
                displayUrl={previewDisplayUrl}
                published={published}
                visual="magic"
                onCopy={handleCopy}
                copied={copiedFeedback}
                onOpen={aliasUrl || publicUrl}
                onRegenerate={rebuildPublicUrl}
                regenerateHint="Cambia el dibujo, no el destino."
                note="El QR codifica la URL permanente; su destino no cambia aunque edites el diseño."
              >
                <QRFrameShell frameStyle={selectedFrame.id} className="w-full max-w-[260px]">
                {usesAdvancedQR ? (
                  <QRCodeAdvanced
                    key={`adv-${publicUrl}-${qrVersion}-${JSON.stringify(profile.qr_gradient)}-${fgColor}-${bgColor}-${logoEnabled}-${profile.qr_effect}`}
                    options={{
                      data: publicUrl,
                      width: 240,
                      height: 240,
                      margin: 4,
                      dotsColor: profile.qr_gradient || fgColor,
                      backgroundColor: bgColor,
                      dotsType: (profile.qr_dots_type || "square") as DotsType,
                      cornersSquareType: (profile.qr_corners_square_type ||
                        "extra-rounded") as CornerSquareType,
                      cornersDotType: (profile.qr_corners_dot_type || "dot") as CornerDotType,
                      cornersSquareColor: profile.qr_corners_square_color || fgColor,
                      cornersDotColor: cornerDotColor,
                      cornerSquareColors: {
                        topLeft: cornerTopLeftColor,
                        topRight: cornerTopRightColor,
                        bottomLeft: cornerBottomLeftColor,
                      },
                      frameStyle: qrFrameStyle,
                      effect: (profile.qr_effect || "none") as QREffectType,
                      ...(logoEnabled && logoUrl ? { image: logoUrl } : {}),
                      ...(logoEnabled && logoUrl
                        ? {
                            imageOptions: {
                              hideBackgroundDots: true,
                              imageSize: 0.28,
                              margin: 4,
                              crossOrigin: "anonymous",
                            },
                          }
                        : {}),
                      qrOptions: { errorCorrectionLevel: "H" },
                    }}
                    className="flex h-full w-full items-center justify-center [&_canvas]:h-full [&_canvas]:w-full"
                  />
                ) : exportFormat === "svg" ? (
                  <QRCodeSVG
                    key={`svg-${publicUrl}-${qrVersion}-${fgColor}-${bgColor}-${logoEnabled}`}
                    id="qr-preview-svg"
                    value={publicUrl}
                    size={240}
                    level="H"
                    marginSize={4}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    {...(imageSettings ? { imageSettings } : {})}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <QRCodeCanvas
                    key={`png-${publicUrl}-${qrVersion}-${fgColor}-${bgColor}-${logoEnabled}`}
                    id="qr-preview-canvas"
                    value={publicUrl}
                    size={240}
                    level="H"
                    marginSize={4}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    {...(imageSettings ? { imageSettings } : {})}
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
                </QRFrameShell>
              </QrPreviewCard>
            </aside>

            <div
              className={
                presentation === "studio"
                  ? "min-w-0 space-y-6 lg:col-span-7 lg:col-start-1 lg:row-start-1"
                  : "space-y-5"
              }
            >
              <Tabs
                value={qrTab}
                onValueChange={(value) => setQrTab(value as QrTabId)}
                className="space-y-4"
              >
                <TabsList
                  aria-label="Secciones de personalización del QR"
                  className="flex h-auto w-full flex-wrap justify-start gap-1.5 rounded-cq-md bg-cq-canvas p-1.5 ring-1 ring-inset ring-cq-line"
                >
                  {QR_TABS.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className="h-11 rounded-cq-sm px-4 text-[13.5px] font-semibold text-cq-muted data-[state=active]:bg-white data-[state=active]:text-cq-ink data-[state=active]:shadow-soft sm:h-10"
                    >
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="diseno" className="space-y-4 focus-visible:outline-none">
                  {/* DISEÑOS QR - BANCO DE PLANTILLAS */}
                  <div className={MAGIC_CONTROL_PANEL}>
                    <h4 className="font-semibold flex items-center gap-2 text-cq-ink">
                      <Layers className="w-4 h-4 text-cq-blue" />
                      Diseños QR
                    </h4>
                    <p className="text-xs text-cq-muted">
                      Explora plantillas listas para usar. Gratis y Premium.
                    </p>
                <Button
                  onClick={() => setGalleryOpen(true)}
                  variant="outline"
                  className="w-full h-11 rounded-cq-md justify-start"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Explorar diseños
                </Button>
              </div>

              {/* COLORS */}
                  <div className={MAGIC_CONTROL_PANEL}>
                    <div className="space-y-1">
                      <h4 className="font-semibold flex items-center gap-2 text-cq-ink">Personalizar QR</h4>
                      <p className="text-xs text-cq-muted">
                        Usa colores oscuros sobre fondo claro para mantener buen escaneo.
                      </p>
                    </div>

                <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Patrón principal</Label>
                    <ColorControl
                      compact
                      value={fgColor}
                      onChange={(val) =>
                        onChange({
                          qr_foreground_color: val,
                          qr_gradient: null,
                          qr_corners_square_color: val,
                          qr_corners_dot_color: val,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Fondo seguro</Label>
                    <ColorControl
                      compact
                      value={bgColor}
                      onChange={(val) => onChange({ qr_background_color: val })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-cq-md justify-start"
                    onClick={() =>
                      onChange({
                        qr_gradient: null,
                        qr_foreground_color: "#0f172a",
                        qr_background_color: "#ffffff",
                        qr_corners_square_color: "#0f172a",
                        qr_corners_dot_color: "#0f172a",
                        qr_corner_top_left_color: "#0f172a",
                        qr_corner_top_right_color: "#0f172a",
                        qr_corner_bottom_left_color: "#0f172a",
                      })
                    }
                  >
                    <span className="mr-2 h-4 w-4 rounded-full bg-slate-900" />
                    Seguro
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-cq-md justify-start"
                    onClick={() =>
                      onChange({
                        qr_gradient: null,
                        qr_foreground_color: "#0b5cad",
                        qr_background_color: "#ffffff",
                        qr_corners_square_color: "#0b5cad",
                        qr_corners_dot_color: "#111827",
                        qr_corner_top_left_color: "#0b5cad",
                        qr_corner_top_right_color: "#111827",
                        qr_corner_bottom_left_color: "#b91c1c",
                      })
                    }
                  >
                    <span className="mr-2 flex -space-x-1">
                      <span className="h-4 w-4 rounded-full bg-blue-700" />
                      <span className="h-4 w-4 rounded-full bg-slate-900" />
                      <span className="h-4 w-4 rounded-full bg-red-700" />
                    </span>
                    3 esquinas
                  </Button>
                </div>

                {(contrastStatus !== "good" || isInverted || hasCornerContrastIssue) && (
                  <Alert variant="destructive" className="py-2 px-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <AlertDescription className="text-xs flex flex-col gap-2 ml-2">
                      <span>
                        {isInverted || contrastStatus === "poor" || hasCornerContrastIssue
                          ? "Hay colores con poco contraste. Usa patrón y esquinas oscuras sobre fondo claro."
                          : "Esta combinación puede reducir la fiabilidad de escaneo."}
                      </span>
                      <button
                        onClick={handleFixContrast}
                        className="underline font-semibold text-left"
                      >
                        Usar colores seguros
                      </button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

                  <div className={MAGIC_CONTROL_PANEL}>
                    <h4 className="font-semibold text-cq-ink">Forma del QR</h4>
                <div className="grid grid-cols-2 gap-2">
                  {DOT_STYLE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      className={`h-12 rounded-cq-md justify-start ${profile.qr_dots_type === option.value ? "border-primary bg-primary/5" : ""}`}
                      onClick={() =>
                        onChange({
                          qr_dots_type: option.value,
                          qr_gradient: null,
                        })
                      }
                    >
                      <Circle className="mr-2 h-4 w-4" />
                      {option.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Forma de los 3 cuadros</Label>
                  <Select
                    value={profile.qr_corners_square_type || "extra-rounded"}
                    onValueChange={(value) => onChange({ qr_corners_square_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORNER_STYLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                </TabsContent>

                <TabsContent value="esquinas" className="space-y-4 focus-visible:outline-none">
                  <div className={MAGIC_CONTROL_PANEL}>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-cq-ink">Colores de esquinas</h4>
                      <p className="text-xs text-cq-muted">
                        Puedes dejar un solo color o diferenciar las tres esquinas principales.
                      </p>
                    </div>
                <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Arriba izquierda</Label>
                    <ColorControl
                      compact
                      value={cornerTopLeftColor}
                      // Modified by Codex — QR-STUDIO-11C
                      onChange={(val) => onChange({ qr_corner_top_left_color: val })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Arriba derecha</Label>
                    <ColorControl
                      compact
                      value={cornerTopRightColor}
                      onChange={(val) => onChange({ qr_corner_top_right_color: val })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Abajo izquierda</Label>
                    <ColorControl
                      compact
                      value={cornerBottomLeftColor}
                      onChange={(val) => onChange({ qr_corner_bottom_left_color: val })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Centro de cuadros</Label>
                    <ColorControl
                      compact
                      value={cornerDotColor}
                      onChange={(val) => onChange({ qr_corners_dot_color: val })}
                    />
                  </div>
                </div>
              </div>

                </TabsContent>

                <TabsContent value="marco" className="space-y-4 focus-visible:outline-none">
                  <div className={MAGIC_CONTROL_PANEL}>
                    <h4 className="font-semibold text-cq-ink">Marco visual</h4>
                <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
                  {QR_FRAME_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.id}
                        variant="outline"
                        className={`h-16 flex-col rounded-cq-md gap-1 ${qrFrameStyle === option.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => onChange({ qr_frame_style: option.id })}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px]">{option.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* EFECTOS AVANZADOS PREMIUM */}
              {!basicOnly && (
                <div className="space-y-5 rounded-cq-xl border border-cq-gold/30 bg-cq-gold-50/60 p-5 shadow-soft sm:rounded-cq-2xl sm:p-6">
                  <h4 className="font-semibold flex items-center gap-2 text-cq-ink">
                    <Sparkles className="w-4 h-4 text-cq-gold" />
                    Efectos Premium
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Selecciona degradados dinámicos o efecto neón.
                  </p>

                  <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className={`h-16 flex flex-col gap-1 rounded-cq-md border-2 ${!profile.qr_gradient && !profile.qr_effect ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                      onClick={() => onChange({ qr_gradient: null, qr_effect: null })}
                    >
                      <div className="w-5 h-5 rounded-full bg-black"></div>
                      <span className="text-[10px]">Clásico</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-16 flex flex-col gap-1 rounded-cq-md border-2 ${profile.qr_effect === "neon" && profile.qr_foreground_color === "#ec4899" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                      onClick={() =>
                        onChange({
                          qr_gradient: null,
                          qr_effect: "neon",
                          qr_foreground_color: "#ec4899",
                          qr_background_color: "#000000",
                          qr_dots_type: "classy",
                        })
                      }
                    >
                      <div className="w-5 h-5 rounded-full shadow-[0_0_8px_#ec4899] bg-[#ec4899]"></div>
                      <span className="text-[10px]">Neón Pink</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-16 flex flex-col gap-1 rounded-cq-md border-2 ${profile.qr_effect === "neon" && profile.qr_foreground_color === "#06b6d4" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                      onClick={() =>
                        onChange({
                          qr_gradient: null,
                          qr_effect: "neon",
                          qr_foreground_color: "#06b6d4",
                          qr_background_color: "#000000",
                          qr_dots_type: "classy",
                        })
                      }
                    >
                      <div className="w-5 h-5 rounded-full shadow-[0_0_8px_#06b6d4] bg-[#06b6d4]"></div>
                      <span className="text-[10px]">Neón Cyan</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-16 flex flex-col gap-1 rounded-cq-md border-2 ${profile.qr_gradient?.colorStops?.[0]?.color === "#f59e0b" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                      onClick={() =>
                        onChange({
                          qr_effect: null,
                          qr_foreground_color: "#f59e0b",
                          qr_background_color: "#ffffff",
                          qr_dots_type: "rounded",
                          qr_gradient: {
                            type: "linear",
                            rotation: 45,
                            colorStops: [
                              { offset: 0, color: "#f59e0b" },
                              { offset: 1, color: "#ef4444" },
                            ],
                          },
                        })
                      }
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-red-500"></div>
                      <span className="text-[10px]">Sunset</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-16 flex flex-col gap-1 rounded-cq-md border-2 ${profile.qr_gradient?.colorStops?.[0]?.color === "#8b5cf6" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                      onClick={() =>
                        onChange({
                          qr_effect: null,
                          qr_foreground_color: "#8b5cf6",
                          qr_background_color: "#ffffff",
                          qr_dots_type: "rounded",
                          qr_gradient: {
                            type: "linear",
                            rotation: 135,
                            colorStops: [
                              { offset: 0, color: "#8b5cf6" },
                              { offset: 1, color: "#3b82f6" },
                            ],
                          },
                        })
                      }
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500"></div>
                      <span className="text-[10px]">Galaxy</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-16 flex flex-col gap-1 rounded-cq-md border-2 ${profile.qr_gradient?.type === "radial" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                      onClick={() =>
                        onChange({
                          qr_effect: null,
                          qr_foreground_color: "#10b981",
                          qr_background_color: "#ffffff",
                          qr_dots_type: "dots",
                          qr_gradient: {
                            type: "radial",
                            colorStops: [
                              { offset: 0, color: "#10b981" },
                              { offset: 1, color: "#047857" },
                            ],
                          },
                        })
                      }
                    >
                      <div className="w-5 h-5 rounded-full bg-[radial-gradient(circle_at_center,_#10b981_0%,_#047857_100%)]"></div>
                      <span className="text-[10px]">Emerald</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* LOGO */}
                </TabsContent>

                <TabsContent value="logo" className="space-y-4 focus-visible:outline-none">
                  <div className={MAGIC_CONTROL_PANEL}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-cq-ink">Logo Central</h4>
                  <Switch
                    checked={logoEnabled}
                    onCheckedChange={(val) => onChange({ qr_logo_enabled: val })}
                    disabled={!logoUrl && !uploadingLogo}
                  />
                </div>

                <div className="flex flex-col gap-3 min-[360px]:flex-row min-[360px]:items-center">
                  <div className="w-12 h-12 rounded-md border flex items-center justify-center overflow-hidden bg-muted">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col gap-2 min-[360px]:flex-row">
                      <Button
                        variant="outline"
                        className="relative h-11 flex-1 rounded-cq-md"
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {logoUrl ? "Cambiar" : "Subir Logo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleUploadLogo}
                        />
                      </Button>

                      {logoUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-11 h-11 rounded-cq-md text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onChange({ qr_logo_url: null, qr_logo_enabled: false })}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                </TabsContent>

                <TabsContent value="exportar" className="space-y-4 focus-visible:outline-none">
                  <QrExportPanel
                    format={exportFormat}
                    formats={EXPORT_FORMATS}
                    onFormatChange={changeExportFormat}
                    size={exportSize}
                    sizes={EXPORT_SIZES}
                    onSizeChange={changeExportSize}
                    onDownload={handleDownload}
                    state={exportState}
                    errorMessage={exportError}
                    onReset={restoreClassicQr}
                    visual="magic"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY SECTION — real persisted records (profileService.getQRVisualVersions) */}
      {published && (
        <div className="mt-8 space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-cq-ink">
            <Clock className="w-4 h-4 text-cq-muted" />
            Versiones visuales recientes
          </h4>

          {history.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {history.map((version) => (
                <div
                  key={version.id}
                  className="snap-start shrink-0 w-36 rounded-cq-xl border border-cq-line bg-white p-3 shadow-soft flex flex-col gap-3"
                >
                  <div className="bg-white rounded-md p-2 aspect-square flex items-center justify-center border pointer-events-none relative">
                    <QRCodeSVG
                      value={publicUrl}
                      size={100}
                      level="H"
                      marginSize={4}
                      bgColor={version.background_color}
                      fgColor={version.foreground_color}
                      {...(version.logo_enabled && version.logo_url
                        ? {
                            imageSettings: {
                              src: version.logo_url,
                              excavate: true,
                              height: 18,
                              width: 18,
                            },
                          }
                        : {})}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(version.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-11 text-xs w-full mt-1"
                      onClick={() => {
                        onChange({
                          qr_foreground_color: version.foreground_color,
                          qr_background_color: version.background_color,
                          qr_logo_url: version.logo_url,
                          qr_logo_enabled: version.logo_enabled,
                        });
                        toast.success("Apariencia restaurada", {
                          description: "Ahora puedes volver a descargarla.",
                        });
                      }}
                    >
                      Usar esta apariencia
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-cq-xl border border-dashed p-6 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20">
              <Clock className="w-8 h-8 mb-3 opacity-20" />
              <p className="font-medium text-sm text-foreground">
                Aún no tienes versiones guardadas
              </p>
              <p className="text-xs max-w-[250px] mt-1">
                Cuando descargues diferentes apariencias de tu QR, aparecerán aquí.
              </p>
            </div>
          )}
        </div>
      )}

      {/* HIDDEN CANVAS FOR HIGH RES PNG DOWNLOAD */}
      {isPreparingDownload && exportFormat === "png" && (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px", visibility: "hidden" }}>
          <QRCodeCanvas
            id="qr-export-canvas"
            value={publicUrl}
            size={exportSize}
            level="H"
            marginSize={4}
            bgColor={bgColor}
            fgColor={fgColor}
            {...(imageSettings
              ? {
                  imageSettings: {
                    src: imageSettings.src,
                    excavate: true,
                    height: exportSize * 0.18,
                    width: exportSize * 0.18,
                  },
                }
              : {})}
          />
        </div>
      )}

      {/* QR TEMPLATE GALLERY */}
      <QRTemplateGallery
        profile={profile}
        onChange={onChange}
        isPremiumUser={isPremiumUser}
        allowPremiumTemplates={!basicOnly}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}
