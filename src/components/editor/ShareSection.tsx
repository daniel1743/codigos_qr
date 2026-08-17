import { Button } from "../ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { downloadQR } from "../../lib/downloadQR";
import { getPublicProfileUrl } from "../../lib/url";
import { Copy, Download, ExternalLink, Loader2 } from "lucide-react";

interface ShareSectionProps {
  slug: string;
  published: boolean;
  saving: boolean;
  onSave: (publish: boolean) => void;
  isValid: boolean;
}

export function ShareSection({ slug, published, saving, onSave, isValid }: ShareSectionProps) {
  const publicUrl = slug ? getPublicProfileUrl(slug) : "";

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    alert("Enlace copiado al portapapeles");
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Button
          className="flex-1"
          disabled={saving || !isValid}
          onClick={() => onSave(false)}
          variant="secondary"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Guardar borrador
        </Button>
        <Button className="flex-1" disabled={saving || !isValid} onClick={() => onSave(true)}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {published ? "Actualizar y Publicar" : "Publicar ahora"}
        </Button>
      </div>

      {!isValid && (
        <p className="text-sm text-destructive text-center">
          Debes tener un slug válido, nombre, y al menos 3 enlaces visibles para publicar.
        </p>
      )}

      {published && slug && (
        <div className="p-6 border rounded-lg bg-card flex flex-col items-center space-y-6 mt-8">
          <h3 className="text-xl font-bold text-center">¡Tu código QR está listo!</h3>
          <p className="text-center text-muted-foreground text-sm max-w-sm">
            Este código apunta permanentemente a tu página pública. Imprímelo con confianza, siempre
            podrás cambiar tus redes desde el editor.
          </p>

          <div className="p-4 bg-white rounded-xl shadow-sm border flex justify-center items-center">
            <QRCodeCanvas
              id="qr-code-canvas"
              value={publicUrl}
              size={1024}
              level="H"
              marginSize={4}
              bgColor="#FFFFFF"
              fgColor="#000000"
              style={{ width: "200px", height: "200px" }}
            />
          </div>

          <div className="flex flex-col w-full gap-3">
            <Button onClick={() => downloadQR(slug)} variant="default" className="w-full">
              <Download className="w-4 h-4 mr-2" /> Descargar PNG (Alta calidad)
            </Button>

            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 mr-2" /> Copiar Enlace
              </Button>
              <Button variant="outline" className="flex-1" asChild>
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
