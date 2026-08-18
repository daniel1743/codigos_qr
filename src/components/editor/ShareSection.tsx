import { Button } from "../ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { downloadQR } from "../../lib/downloadQR";
import { getPublicProfileUrl } from "../../lib/url";
import { Copy, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ShareSectionProps {
  publicId: string;
  published: boolean;
  saving: boolean;
  onSave: (publish: boolean) => void;
  isValid: boolean;
}

export function ShareSection({ publicId, published, saving, onSave, isValid }: ShareSectionProps) {
  const [publicUrl, setPublicUrl] = useState("");
  const [qrVersion, setQrVersion] = useState(0);

  const rebuildPublicUrl = () => {
    setPublicUrl(publicId ? getPublicProfileUrl(publicId) : "");
    setQrVersion((version) => version + 1);
  };

  useEffect(() => {
    rebuildPublicUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Enlace copiado", { description: "Listo para compartir" });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Publicar y Compartir</h2>
        <p className="text-sm text-muted-foreground">Genera tu URL y código QR.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Button
          className="h-11 w-full"
          disabled={saving || !isValid}
          onClick={() => onSave(false)}
          variant="secondary"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Guardar borrador
        </Button>
        <Button className="h-11 w-full" disabled={saving || !isValid} onClick={() => onSave(true)}>
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
        <div className="mt-8 flex flex-col items-center space-y-5 rounded-lg border bg-card p-4 sm:p-6">
          <h3 className="text-xl font-bold text-center">Tu código QR</h3>
          <p className="text-center text-muted-foreground text-sm max-w-sm">
            Este código apunta permanentemente a tu página pública. Imprímelo con confianza, siempre
            podrás cambiar tus redes desde el editor.
          </p>

          <div className="w-full rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Destino:</p>
            <p className="mt-1 break-all text-muted-foreground">{publicUrl}</p>
          </div>

          <div className="flex items-center justify-center rounded-xl border bg-white p-3 shadow-sm sm:p-4">
            <QRCodeCanvas
              key={`${publicUrl}-${qrVersion}`}
              id="qr-code-canvas"
              value={publicUrl}
              size={1024}
              level="H"
              marginSize={4}
              bgColor="#FFFFFF"
              fgColor="#000000"
              style={{ width: "min(200px, 70vw)", height: "min(200px, 70vw)" }}
            />
          </div>

          <div className="flex flex-col w-full gap-3">
            <Button onClick={rebuildPublicUrl} variant="secondary" className="h-11 w-full">
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerar QR
            </Button>

            <Button onClick={() => downloadQR(publicId)} variant="default" className="h-11 w-full">
              <Download className="w-4 h-4 mr-2" /> Descargar PNG (Alta calidad)
            </Button>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <Button onClick={handleCopy} variant="outline" className="h-11 w-full">
                <Copy className="w-4 h-4 mr-2" /> Copiar Enlace
              </Button>
              <Button variant="outline" className="h-11 w-full" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Abrir Página
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
