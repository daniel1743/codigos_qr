import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Shield,
  Lock,
  Download,
  AlertTriangle,
  FileText,
  Key,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { EncryptionService } from "../lib/encryption";

export const Route = createFileRoute("/d/$shortUrl")({
  component: PublicDownloadPage,
});

function PublicDownloadPage() {
  const { shortUrl } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    fetchDocumentMetadata();
  }, [shortUrl]);

  const fetchDocumentMetadata = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .rpc("get_encrypted_document_metadata", { p_short_url: shortUrl });

      if (fetchError) throw fetchError;

      const docData = Array.isArray(data) ? data[0] : data;

      if (!docData) {
        setError("El documento no existe, ha expirado o superó el límite de descargas.");
        return;
      }

      // Check expiration
      if (docData.expire_at && new Date(docData.expire_at) < new Date()) {
        setError("Este documento seguro ha expirado y ya no está disponible.");
        return;
      }

      // Check download limit
      if (docData.max_downloads && docData.current_downloads >= docData.max_downloads) {
        setError("Este documento ha alcanzado el límite máximo de descargas permitido.");
        return;
      }

      setDoc(docData);
    } catch (e: any) {
      console.error(e);
      setError("Error al cargar la información del documento.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;

    // Check password if required
    if (doc.password_required) {
      if (!password) {
        toast.error("Por favor ingresa la contraseña");
        return;
      }

      // Verify password hash
      setDecrypting(true);
      try {
        const isValid = await EncryptionService.verifyPassword(password, doc.password_hash);
        if (!isValid) {
          toast.error("Contraseña incorrecta");
          
          // Log failed attempt via secure RPC
          await supabase.rpc("log_document_access", {
            p_document_id: doc.id,
            p_success: false,
            p_user_agent: navigator.userAgent
          });

          setDecrypting(false);
          return;
        }
      } catch (err) {
        console.error(err);
        toast.error("Error al validar la contraseña");
        setDecrypting(false);
        return;
      }
    } else {
      // If no password is required, the key must be in the URL hash
      const keyFromHash = window.location.hash.substring(1);
      if (!keyFromHash) {
        toast.error("Enlace incompleto: Falta la clave de desencriptación en la URL.");
        return;
      }
    }

    setDecrypting(true);
    try {
      // 1. Download encrypted file from storage
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("encrypted-documents")
        .download(doc.encrypted_file_path);

      if (downloadError) throw downloadError;

      // 2. Convert Blob to ArrayBuffer
      const encryptedBuffer = await fileBlob.arrayBuffer();

      // 3. Decrypt file client-side
      const keyOrPassword = doc.password_required ? password : window.location.hash.substring(1);
      const decryptedBuffer = await EncryptionService.decryptFile(
        encryptedBuffer,
        keyOrPassword,
        doc.iv,
        doc.salt || undefined
      );

      // 4. Create decrypted file blob
      const decryptedBlob = new Blob([decryptedBuffer], { type: doc.mime_type });
      const decryptedUrl = URL.createObjectURL(decryptedBlob);

      // 5. Trigger download in browser
      const trigger = document.createElement("a");
      trigger.href = decryptedUrl;
      trigger.download = doc.original_filename;
      trigger.click();
      URL.revokeObjectURL(decryptedUrl);

      // 6. Update download count in database securely via RPC
      const newDownloads = (doc.current_downloads || 0) + 1;
      await supabase.rpc("increment_document_downloads", { p_document_id: doc.id });

      // 7. Log success access via secure RPC
      await supabase.rpc("log_document_access", {
        p_document_id: doc.id,
        p_success: true,
        p_user_agent: navigator.userAgent
      });

      toast.success("Documento descargado y descifrado con éxito");
      
      // Update local state if one-time download or limit reached
      if (doc.one_time_download || (doc.max_downloads && newDownloads >= doc.max_downloads)) {
        setError("Este documento ha sido descargado y ya no está disponible.");
      } else {
        setDoc((prev: any) => ({ ...prev, current_downloads: newDownloads }));
      }

    } catch (err: any) {
      console.error(err);
      toast.error("Error al descargar o descifrar el archivo: " + (err.message || "Error desconocido"));
    } finally {
      setDecrypting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          <p className="text-sm text-slate-300 font-medium">Verificando seguridad del documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-slate-800 p-8 text-center space-y-6 shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Documento No Disponible</h2>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
          <div className="pt-4 border-t border-slate-800/60">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 shadow-lg shadow-blue-500/20"
            >
              Ir a la Página de Inicio
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-slate-800 p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-950/50 border border-blue-500/30 text-blue-400 mb-2">
            <ShieldCheck className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Descarga Segura</h2>
          <p className="text-xs text-slate-400">Cifrado de extremo a extremo (Zero-Knowledge)</p>
        </div>

        {/* Document Info Card */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg shrink-0 text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate text-sm">{doc.name}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {doc.original_filename} • {EncryptionService.formatFileSize(doc.file_size_bytes)}
            </p>
          </div>
        </div>

        {/* Decrypt Form */}
        <form onSubmit={handleDownload} className="space-y-4">
          {doc.password_required ? (
            <div className="space-y-2">
              <Label htmlFor="password-download" className="text-slate-300 text-xs font-medium">
                Contraseña Requerida
              </Label>
              <Input
                id="password-download"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña para descifrar"
                className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 h-11 focus-visible:ring-blue-500"
                disabled={decrypting}
                required
              />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Este enlace contiene la clave de descifrado integrada de forma segura en el navegador.
              </span>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10 h-11 text-sm font-semibold rounded-xl"
            disabled={decrypting}
          >
            {decrypting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Descifrando archivo...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar y Descifrar
              </>
            )}
          </Button>
        </form>

        {/* Details Note */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-slate-500 leading-normal">
            El archivo se descarga encriptado y se descifra localmente en tu dispositivo. Tus contraseñas y llaves nunca son compartidas ni enviadas a nuestros servidores.
          </p>
        </div>
      </div>
    </div>
  );
}
