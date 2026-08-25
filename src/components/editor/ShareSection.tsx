import { Button } from "../ui/button";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { QRCodeAdvanced, useQRAdvancedDownload } from "../qr/QRCodeAdvanced";
import { QRFrameShell } from "../qr/QRFrameShell";
import { requiresAdvancedRenderer } from "../../lib/qr-advanced-utils";
import { downloadQR, downloadSVG } from "../../lib/downloadQR";
import { getPublicProfileUrl, getAliasProfileUrl } from "../../lib/url";
import {
  Copy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Upload,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  Clock,
  Eye,
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Profile, QRVisualVersion } from "../../types/database";
import { CornerDotType, CornerSquareType, DotsType, QREffectType } from "../../types/qr-advanced";
import { profileService } from "../../services/profile.service";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Label } from "../ui/label";
import { ColorControl } from "./ColorControl";
import { analyzeQrContrast } from "../../lib/qr-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Alert, AlertDescription } from "../ui/alert";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { QRTemplateGallery } from "./QRTemplateGallery";
import { hasPremiumAccessByEmail } from "../../lib/entitlements";
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

function getQrColorStatus(color: string, background: string) {
  return analyzeQrContrast(color, background);
}

interface ShareSectionProps {
  publicId: string;
  published: boolean;
  saving: boolean;
  onSave: (publish: boolean) => void;
  isValid: boolean;
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

export function ShareSection({
  publicId,
  published,
  saving,
  onSave,
  isValid,
  profile,
  onChange,
}: ShareSectionProps) {
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

  useEffect(() => {
    rebuildPublicUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  useEffect(() => {
    let cancelled = false;

    const checkPremiumAccess = async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setIsPremiumUser(false);
          return;
        }

        if (hasPremiumAccessByEmail(user.email || "")) {
          if (!cancelled) setIsPremiumUser(true);
          return;
        }

        const { data } = await supabase
          .from("premium_users")
          .select("expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        const active = !!data && (!data.expires_at || new Date(data.expires_at) > new Date());
        if (!cancelled) setIsPremiumUser(active);
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
                  imageSize: 0.22, // 22% safe limit
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
      } catch (error) {
        console.error("Advanced QR export failed:", error);
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
      } catch (error) {
        console.error("SVG export failed:", error);
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
            toast.error("Error al cargar el logo para la exportación", {
              description: "Intenta sin logo o sube una imagen diferente.",
            });
            return;
          }
        }

        // Download QR (canvas should be ready now)
        downloadQR(publicId, "qr-export-canvas", `qr-${publicId}-${exportSize}px.png`);
        toast.success("QR descargado correctamente");
      } catch (error) {
        console.error("Export failed:", error);
        toast.error("Error al exportar el QR", {
          description: error instanceof Error ? error.message : "Error desconocido",
        });
      } finally {
        setIsPreparingDownload(false);
      }
    }
  };

  const previewImageSettings =
    logoEnabled && logoUrl
      ? {
          src: logoUrl,
          height: 240 * 0.22, // 22% of preview size (240px)
          width: 240 * 0.22,
          excavate: true,
        }
      : undefined;

  const exportImageSettings =
    logoEnabled && logoUrl
      ? {
          src: logoUrl,
          height: exportSize * 0.22, // 22% of export size
          width: exportSize * 0.22,
          excavate: true,
        }
      : undefined;

  return (
    <div className="space-y-5 pb-20">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Mi QR</h2>
          <p className="text-sm text-muted-foreground">Administra y comparte tu página.</p>
        </div>
        <div className="flex items-center">
          {published ? (
            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600 mr-1.5"></span>
              Publicado
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-600 mr-1.5"></span>
              Sin publicar
            </span>
          )}
        </div>
      </div>

      {!published && (
        <Alert>
          <AlertDescription>
            Tu página debe estar publicada para que otros puedan visitarla al escanear este QR.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-2">
        <Button
          className="h-11 w-full rounded-xl"
          disabled={saving || !isValid}
          onClick={() => onSave(false)}
          variant="secondary"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Guardar borrador
        </Button>
        <Button
          className="h-11 w-full rounded-xl"
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

      {published && publicId && publicUrl && (
        <div className="space-y-5">
          {/* STATS CARD */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                Aperturas
              </h4>
              <p className="text-sm text-muted-foreground mt-1">Total de visitas a tu perfil</p>
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight">
              {profile.scan_count || 0}
              <span className="ml-2 text-sm font-semibold text-muted-foreground">
                {profile.scan_count === 1 ? "apertura" : "aperturas"}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col items-center space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="text-xl font-bold text-center">Acciones Rápidas</h3>
              <p className="text-center text-muted-foreground text-sm max-w-[280px]">
                Tu código QR se previsualiza arriba. Usa estas acciones para interactuar con tu página.
              </p>

              <div className="grid w-full gap-2">
                <Button
                  onClick={rebuildPublicUrl}
                  variant="outline"
                  className="h-11 w-full rounded-xl justify-start"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerar patrón
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="h-11 w-full rounded-xl justify-start"
                >
                  <Copy className="w-4 h-4 mr-2" /> Copiar Enlace
                </Button>
                <Button variant="outline" className="h-11 w-full rounded-xl justify-start" asChild>
                  <a href={aliasUrl || publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Abrir Página
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              {/* DISEÑOS QR - BANCO DE PLANTILLAS */}
              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <h4 className="font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Diseños QR
                </h4>
                <p className="text-xs text-muted-foreground">
                  Explora plantillas listas para usar. Gratis y Premium.
                </p>
                <Button
                  onClick={() => setGalleryOpen(true)}
                  variant="outline"
                  className="w-full h-11 rounded-xl justify-start"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Explorar diseños
                </Button>
              </div>

              {/* COLORS */}
              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2">Personalizar QR</h4>
                  <p className="text-xs text-muted-foreground">
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
                    className="h-11 rounded-xl justify-start"
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
                    className="h-11 rounded-xl justify-start"
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

              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <h4 className="font-semibold">Forma del QR</h4>
                <div className="grid grid-cols-2 gap-2">
                  {DOT_STYLE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      className={`h-12 rounded-xl justify-start ${profile.qr_dots_type === option.value ? "border-primary bg-primary/5" : ""}`}
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

              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-semibold">Colores de esquinas</h4>
                  <p className="text-xs text-muted-foreground">
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

              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <h4 className="font-semibold">Marco visual</h4>
                <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
                  {QR_FRAME_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.id}
                        variant="outline"
                        className={`h-16 flex-col rounded-xl gap-1 ${qrFrameStyle === option.id ? "border-primary bg-primary/5" : ""}`}
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
              <div className="space-y-4 rounded-2xl border bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-4 shadow-sm border-amber-200/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Efectos Premium
                  <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                </h4>
                <p className="text-xs text-muted-foreground">
                  Selecciona degradados dinámicos o efecto neón.
                </p>

                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${!profile.qr_gradient && !profile.qr_effect ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                    onClick={() => onChange({ qr_gradient: null, qr_effect: null })}
                  >
                    <div className="w-5 h-5 rounded-full bg-black"></div>
                    <span className="text-[10px]">Clásico</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_effect === "neon" && profile.qr_foreground_color === "#ec4899" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
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
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_effect === "neon" && profile.qr_foreground_color === "#06b6d4" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
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
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_gradient?.colorStops?.[0]?.color === "#f59e0b" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
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
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_gradient?.colorStops?.[0]?.color === "#8b5cf6" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
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
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_gradient?.type === "radial" ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
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

              {/* LOGO */}
              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">Logo Central</h4>
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
                        className="relative h-11 flex-1 rounded-xl"
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
                          className="w-11 h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onChange({ qr_logo_url: null, qr_logo_enabled: false })}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DOWNLOAD OPTIONS */}
              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <h4 className="font-semibold flex items-center gap-2">Exportar</h4>

                <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Formato</Label>
                    <Select
                      value={exportFormat}
                      onValueChange={(val: "png" | "svg") => setExportFormat(val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG (Imagen)</SelectItem>
                        <SelectItem value="svg">SVG (Vectorial)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Resolución (PNG)</Label>
                    <Select
                      value={exportSize.toString()}
                      onValueChange={(val) => setExportSize(parseInt(val))}
                      disabled={exportFormat === "svg"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="256">256 px (Pruebas / pantalla)</SelectItem>
                        <SelectItem value="512">512 px (Web)</SelectItem>
                        <SelectItem value="1024">1024 px (Recomendado)</SelectItem>
                        <SelectItem value="2048">2048 px (Impresión)</SelectItem>
                        <SelectItem value="4096">4096 px (Impresión grande)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4 text-xs h-11 rounded-xl"
                  onClick={() => {
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
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restaurar QR clásico
                </Button>

                <Button
                  onClick={handleDownload}
                  className="w-full h-12 mt-2 rounded-xl"
                  disabled={isPreparingDownload}
                >
                  {isPreparingDownload ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 mr-2" />
                  )}
                  Descargar QR {exportFormat.toUpperCase()}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY SECTION */}
      {published && (
        <div className="space-y-4 mt-8">
          <h4 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Versiones visuales recientes
          </h4>

          {history.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {history.map((version) => (
                <div
                  key={version.id}
                  className="snap-start shrink-0 w-36 rounded-xl border bg-card p-3 shadow-sm flex flex-col gap-3"
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
            <div className="rounded-xl border border-dashed p-6 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20">
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
            {...(exportImageSettings ? { imageSettings: exportImageSettings } : {})}
          />
        </div>
      )}

      {/* QR TEMPLATE GALLERY */}
      <QRTemplateGallery
        profile={profile}
        onChange={onChange}
        isPremiumUser={isPremiumUser}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}
