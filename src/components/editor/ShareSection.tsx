import { Button } from "../ui/button";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { QRCodeAdvanced, useQRAdvancedDownload } from "../qr/QRCodeAdvanced";
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
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Profile, QRVisualVersion } from "../../types/database";
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
import { canUsePremiumTemplates } from "../../lib/entitlements";
import imageCompression from "browser-image-compression";

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
  const isPremiumUser = canUsePremiumTemplates(profile.user_id);

  const fgColor = profile.qr_foreground_color || "#000000";
  const bgColor = profile.qr_background_color || "#FFFFFF";
  const logoUrl = profile.qr_logo_url;
  const logoEnabled = profile.qr_logo_enabled ?? false;

  const [history, setHistory] = useState<QRVisualVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { contrast, isInverted, status: contrastStatus } = analyzeQrContrast(fgColor, bgColor);

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
    onChange({ qr_foreground_color: "#000000", qr_background_color: "#FFFFFF" });
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
          maxSizeMB: 0.5, // Max 500KB
          maxWidthOrHeight: 800, // Max 800px (ideal para QR logo)
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

    const isAdvanced = requiresAdvancedRenderer(
      profile.qr_gradient || fgColor,
      profile.qr_dots_type || "square",
      profile.qr_effect || "none"
    );

    if (isAdvanced) {
      setIsPreparingDownload(true);
      const advOptions = {
        data: publicUrl,
        width: exportSize,
        height: exportSize,
        margin: 4,
        dotsColor: profile.qr_gradient || fgColor,
        backgroundColor: bgColor,
        dotsType: (profile.qr_dots_type as any) || "square",
        effect: (profile.qr_effect as any) || "none",
        ...(logoEnabled && logoUrl ? { image: logoUrl } : {}),
        ...(logoEnabled && logoUrl ? {
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.18,
            margin: 8,
            crossOrigin: "anonymous"
          }
        } : {}),
        qrOptions: { errorCorrectionLevel: "H" as const }
      };
      await downloadAdvancedQR(advOptions, `qr-${publicId}-${exportSize}px.${exportFormat}`, exportFormat);
      setIsPreparingDownload(false);
      return;
    }

    if (exportFormat === "svg") {
      await downloadSVG(publicId, "qr-preview-svg", `qr-${publicId}.svg`);
    } else {
      if (logoEnabled && logoUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setIsPreparingDownload(true);
          setTimeout(() => {
            downloadQR(publicId, "qr-export-canvas", `qr-${publicId}-${exportSize}px.png`);
            setIsPreparingDownload(false);
          }, 100);
        };
        img.onerror = () => {
          toast.error("Error al cargar el logo para la exportación. Intenta sin logo.");
        };
        img.src = logoUrl;
      } else {
        setIsPreparingDownload(true);
        setTimeout(() => {
          downloadQR(publicId, "qr-export-canvas", `qr-${publicId}-${exportSize}px.png`);
          setIsPreparingDownload(false);
        }, 100);
      }
    }
  };

  const imageSettings =
    logoEnabled && logoUrl
      ? {
          src: logoUrl,
          height: 43,
          width: 43,
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
        <Button className="h-11 w-full rounded-xl" disabled={saving || !isValid} onClick={() => onSave(true)}>
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
              <h3 className="text-xl font-bold text-center">Tu código QR</h3>
              <p className="text-center text-muted-foreground text-sm max-w-[280px]">
                Este QR apunta permanentemente a tu página. Su destino no cambiará aunque edites el
                diseño.
              </p>

              <div className="flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border bg-white p-4 shadow-sm overflow-hidden relative">
                {requiresAdvancedRenderer(
                  profile.qr_gradient || fgColor,
                  profile.qr_dots_type || "square",
                  profile.qr_effect || "none"
                ) ? (
                  <QRCodeAdvanced
                    key={`adv-${publicUrl}-${qrVersion}-${JSON.stringify(profile.qr_gradient)}-${fgColor}-${bgColor}-${logoEnabled}-${profile.qr_effect}`}
                    options={{
                      data: publicUrl,
                      width: 240,
                      height: 240,
                      margin: 4,
                      dotsColor: profile.qr_gradient || fgColor,
                      backgroundColor: bgColor,
                      dotsType: (profile.qr_dots_type as any) || "square",
                      effect: (profile.qr_effect as any) || "none",
                      ...(logoEnabled && logoUrl ? { image: logoUrl } : {}),
                      ...(logoEnabled && logoUrl ? {
                        imageOptions: {
                          hideBackgroundDots: true,
                          imageSize: 0.18,
                          margin: 8,
                          crossOrigin: "anonymous"
                        }
                      } : {}),
                      qrOptions: { errorCorrectionLevel: "H" }
                    }}
                    className="w-full h-full flex items-center justify-center"
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
              </div>

              <div className="grid w-full gap-2">
                <Button onClick={rebuildPublicUrl} variant="outline" className="h-11 w-full rounded-xl justify-start">
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerar patrón
                </Button>
                <Button onClick={handleCopy} variant="outline" className="h-11 w-full rounded-xl justify-start">
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
                <h4 className="font-semibold flex items-center gap-2">Colores</h4>

                <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Color del QR</Label>
                    <ColorControl
                      compact
                      value={fgColor}
                      onChange={(val) => onChange({ qr_foreground_color: val, qr_gradient: null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Fondo</Label>
                    <ColorControl
                      compact
                      value={bgColor}
                      onChange={(val) => onChange({ qr_background_color: val })}
                    />
                  </div>
                </div>

                {(contrastStatus !== "good" || isInverted) && (
                  <Alert variant="destructive" className="py-2 px-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <AlertDescription className="text-xs flex flex-col gap-2 ml-2">
                      <span>
                        {isInverted || contrastStatus === "poor"
                          ? "Contraste insuficiente. Usa un patrón más oscuro o un fondo más claro."
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
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${!profile.qr_gradient && !profile.qr_effect ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                    onClick={() => onChange({ qr_gradient: null, qr_effect: null })}
                  >
                    <div className="w-5 h-5 rounded-full bg-black"></div>
                    <span className="text-[10px]">Clásico</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_effect === 'neon' && profile.qr_foreground_color === '#ec4899' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                    onClick={() => onChange({ 
                      qr_gradient: null, 
                      qr_effect: 'neon', 
                      qr_foreground_color: '#ec4899', 
                      qr_background_color: '#000000',
                      qr_dots_type: 'classy'
                    })}
                  >
                    <div className="w-5 h-5 rounded-full shadow-[0_0_8px_#ec4899] bg-[#ec4899]"></div>
                    <span className="text-[10px]">Neón Pink</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_effect === 'neon' && profile.qr_foreground_color === '#06b6d4' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                    onClick={() => onChange({ 
                      qr_gradient: null, 
                      qr_effect: 'neon', 
                      qr_foreground_color: '#06b6d4', 
                      qr_background_color: '#000000',
                      qr_dots_type: 'classy'
                    })}
                  >
                    <div className="w-5 h-5 rounded-full shadow-[0_0_8px_#06b6d4] bg-[#06b6d4]"></div>
                    <span className="text-[10px]">Neón Cyan</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_gradient?.colorStops?.[0]?.color === '#f59e0b' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                    onClick={() => onChange({ 
                      qr_effect: null,
                      qr_foreground_color: '#f59e0b',
                      qr_background_color: '#ffffff',
                      qr_dots_type: 'rounded',
                      qr_gradient: {
                        type: 'linear',
                        rotation: 45,
                        colorStops: [
                          { offset: 0, color: '#f59e0b' },
                          { offset: 1, color: '#ef4444' }
                        ]
                      }
                    })}
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-red-500"></div>
                    <span className="text-[10px]">Sunset</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_gradient?.colorStops?.[0]?.color === '#8b5cf6' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                    onClick={() => onChange({ 
                      qr_effect: null,
                      qr_foreground_color: '#8b5cf6',
                      qr_background_color: '#ffffff',
                      qr_dots_type: 'rounded',
                      qr_gradient: {
                        type: 'linear',
                        rotation: 135,
                        colorStops: [
                          { offset: 0, color: '#8b5cf6' },
                          { offset: 1, color: '#3b82f6' }
                        ]
                      }
                    })}
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500"></div>
                    <span className="text-[10px]">Galaxy</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className={`h-16 flex flex-col gap-1 rounded-xl border-2 ${profile.qr_gradient?.type === 'radial' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                    onClick={() => onChange({ 
                      qr_effect: null,
                      qr_foreground_color: '#10b981',
                      qr_background_color: '#ffffff',
                      qr_dots_type: 'dots',
                      qr_gradient: {
                        type: 'radial',
                        colorStops: [
                          { offset: 0, color: '#10b981' },
                          { offset: 1, color: '#047857' }
                        ]
                      }
                    })}
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
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}
