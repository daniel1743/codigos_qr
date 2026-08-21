// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { EncryptionService } from "../lib/encryption";
import {
  secureEncryptedDocument,
  type SecureDocumentResponse,
} from "../lib/encrypted-document-delivery";

export const Route = createFileRoute("/d/$shortUrl")({
  component: PublicDownloadPage,
});

type PublicMetadata = Extract<
  SecureDocumentResponse,
  { ok: true; action: "metadata" }
>;

function statusMessage(status: string): string {
  switch (status) {
    case "expired":
      return "Este documento ha expirado.";
    case "revoked":
      return "El acceso a este documento fue revocado.";
    case "limit_reached":
      return "Este documento alcanzó su límite de descargas.";
    case "invalid_password":
      return "La contraseña es incorrecta.";
    case "temporary_error":
      return "El servicio no está disponible temporalmente. Inténtalo nuevamente.";
    default:
      return "El documento no existe o no está disponible.";
  }
}

function readKeyFromFragment(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const urlSafeKey = params.get("key");
  if (!urlSafeKey || !/^[A-Za-z0-9_-]{43,44}$/.test(urlSafeKey)) return null;

  const base64 = urlSafeKey.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
}

function PublicDownloadPage() {
  const { shortUrl } = Route.useParams();
  const [metadata, setMetadata] = useState<PublicMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      setLoading(true);
      setError(null);
      try {
        const response = await secureEncryptedDocument({
          data: { action: "metadata", shortUrl },
        });
        if (cancelled) return;
        if (!response.ok) {
          setError(statusMessage(response.status));
          return;
        }
        setMetadata(response);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError(statusMessage("temporary_error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMetadata();
    return () => {
      cancelled = true;
    };
  }, [shortUrl]);

  async function handleDownload(event: React.FormEvent) {
    event.preventDefault();
    if (!metadata) return;

    const fragmentKey = metadata.passwordRequired ? null : readKeyFromFragment();
    if (!metadata.passwordRequired && !fragmentKey) {
      toast.error("Enlace incompleto: falta la clave local de descifrado.");
      return;
    }
    if (metadata.passwordRequired && !password) {
      toast.error("Ingresa la contraseña.");
      return;
    }

    setDecrypting(true);
    try {
      const response = await secureEncryptedDocument({
        data: {
          action: "authorize",
          shortUrl,
          ...(metadata.passwordRequired ? { password } : {}),
        },
      });

      if (!response.ok) {
        const message = statusMessage(response.status);
        if (response.status === "invalid_password") toast.error(message);
        else setError(message);
        return;
      }

      const encryptedResponse = await fetch(response.signedUrl, {
        cache: "no-store",
        referrerPolicy: "no-referrer",
      });
      if (!encryptedResponse.ok) {
        throw new Error("No se pudo descargar el archivo cifrado.");
      }

      const encryptedBuffer = await encryptedResponse.arrayBuffer();
      const decryptedBuffer = await EncryptionService.decryptFile(
        encryptedBuffer,
        metadata.passwordRequired ? password : fragmentKey!,
        response.iv,
        response.salt ?? undefined,
      );

      const decryptedUrl = URL.createObjectURL(
        new Blob([decryptedBuffer], { type: response.mimeType }),
      );
      const trigger = document.createElement("a");
      trigger.href = decryptedUrl;
      trigger.download = response.originalFilename;
      trigger.click();
      URL.revokeObjectURL(decryptedUrl);
      toast.success("Documento descargado y descifrado.");

      if (metadata.passwordRequired) setPassword("");
    } catch (downloadError) {
      console.error(downloadError);
      toast.error("No fue posible descargar o descifrar el documento.");
    } finally {
      setDecrypting(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          <p className="text-sm text-slate-300">Verificando el documento...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !metadata) {
    return (
      <PageShell>
        <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-slate-800 p-8 text-center space-y-6 shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Documento no disponible</h2>
          <p className="text-slate-400 text-sm">{error}</p>
          <a href="/" className="inline-flex rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white">
            Ir al inicio
          </a>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-slate-800 p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-950/50 border border-blue-500/30 text-blue-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Descarga cifrada</h2>
          <p className="text-xs text-slate-400">Autorización temporal y descifrado local</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-white truncate text-sm">{metadata.name}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {metadata.originalFilename} · {EncryptionService.formatFileSize(metadata.fileSizeBytes)}
            </p>
          </div>
        </div>

        <form onSubmit={handleDownload} className="space-y-4">
          {metadata.passwordRequired ? (
            <div className="space-y-2">
              <Label htmlFor="password-download" className="text-slate-300 text-xs">
                Contraseña
              </Label>
              <Input
                id="password-download"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                maxLength={512}
                disabled={decrypting}
                required
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>La clave permanece únicamente en el fragmento local del enlace.</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full gap-2" disabled={decrypting}>
            {decrypting ? "Autorizando y descifrando..." : (
              <>
                <Download className="w-4 h-4" />
                Descargar y descifrar
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-[10px] text-slate-500">
          El servidor autoriza un acceso temporal al archivo cifrado. El descifrado ocurre en tu dispositivo.
        </p>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
