// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
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
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { EncryptionService } from "../lib/encryption";
import { createServerFn } from "@tanstack/react-start";
import { getPrivilegedSupabaseClient } from "../lib/supabase/server-privileged";
import { getRequestHeader } from "@tanstack/react-start/server";

// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
/**
 * Server function to securely authorize a document download.
 * Validates expiration, revocation, limits, and password server-side,
 * then generates a short-lived signed URL for the client.
 */
export const authorizeDownloadFn = createServerFn()
  .validator((d: { shortUrl: string; password?: string }) => d)
  .handler(async ({ data }) => {
    const { shortUrl, password } = data;
    const supabase = getPrivilegedSupabaseClient();
    
    // Retrieve user-agent header securely on the server
    let userAgent = "";
    try {
      userAgent = getRequestHeader("user-agent") || "";
    } catch (e) {
      console.warn("Could not retrieve user-agent header:", e);
    }

    // 1. Execute atomic check-and-increment RPC on DB
    const { data: claimRows, error: rpcError } = await supabase
      .rpc("authorize_and_claim_download", { p_short_url: shortUrl });

    if (rpcError) {
      console.error("Database authorization RPC error:", rpcError);
      return { success: false, error: "SERVER_ERROR" };
    }

    const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;

    if (!claim || !claim.success) {
      return { success: false, error: claim?.error_message || "DOCUMENT_NOT_AVAILABLE" };
    }

    // 2. Password validation server-side (if password is required)
    if (claim.password_hash) {
      if (!password) {
        // Compensate by decrementing download count
        await supabase.rpc("decrement_document_downloads", { p_document_id: claim.id });
        return { success: false, error: "PASSWORD_REQUIRED" };
      }

      const isValid = await EncryptionService.verifyPassword(password, claim.password_hash, claim.salt);
      if (!isValid) {
        // Compensate count
        await supabase.rpc("decrement_document_downloads", { p_document_id: claim.id });
        
        // Log failed attempt
        await supabase.rpc("log_document_access", {
          p_document_id: claim.id,
          p_success: false,
          p_user_agent: userAgent
        });

        return { success: false, error: "INVALID_PASSWORD" };
      }
    }

    // 3. Generate signed URL for private bucket (60 seconds TTL)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("encrypted-documents")
      .createSignedUrl(claim.encrypted_file_path, 60);

    if (signedUrlError || !signedUrlData) {
      console.error("Storage signed URL generation error:", signedUrlError);
      // Compensate count
      await supabase.rpc("decrement_document_downloads", { p_document_id: claim.id });
      return { success: false, error: "SIGNED_URL_FAILED" };
    }

    // 4. Log successful access
    await supabase.rpc("log_document_access", {
      p_document_id: claim.id,
      p_success: true,
      p_user_agent: userAgent
    });

    // 5. Return payload for client-side decryption (excluding password_hash)
    return {
      success: true,
      signedUrl: signedUrlData.signedUrl,
      iv: claim.iv,
      salt: claim.salt,
      originalFilename: claim.original_filename,
      mimeType: claim.mime_type
    };
  });

export const Route = createFileRoute("/d/$shortUrl")({
  component: PublicDownloadPage,
});

// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
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

      if (docData.revoked) {
        setError("Este documento seguro ha sido revocado y ya no está disponible.");
        return;
      }

      if (docData.expire_at && new Date(docData.expire_at) < new Date()) {
        setError("Este documento seguro ha expirado y ya no está disponible.");
        return;
      }

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

    if (doc.password_required && !password) {
      toast.error("Por favor ingresa la contraseña");
      return;
    }

    setDecrypting(true);
    try {
      // 1. Call server function to authorize and get signed URL
      const payload: any = { shortUrl };
      if (doc.password_required) {
        payload.password = password;
      }
      const res = await authorizeDownloadFn({ data: payload });

      if (!res.success) {
        if (res.error === "PASSWORD_REQUIRED") {
          toast.error("Por favor ingresa la contraseña");
        } else if (res.error === "INVALID_PASSWORD") {
          toast.error("Contraseña incorrecta");
        } else if (res.error === "DOCUMENT_REVOKED") {
          setError("Este documento seguro ha sido revocado y ya no está disponible.");
        } else if (res.error === "DOCUMENT_EXPIRED") {
          setError("Este documento seguro ha expirado y ya no está disponible.");
        } else if (res.error === "DOWNLOAD_LIMIT_REACHED") {
          setError("Este documento ha alcanzado el límite máximo de descargas permitido.");
        } else {
          toast.error("Error al autorizar la descarga.");
        }
        setDecrypting(false);
        return;
      }

      // 2. Fetch encrypted ciphertext binary using the signed URL
      const fetchRes = await fetch(res.signedUrl);
      if (!fetchRes.ok) {
        throw new Error("Fallo al obtener el archivo del almacenamiento.");
      }
      const encryptedBuffer = await fetchRes.arrayBuffer();

      // 3. Extract decryption key
      let keyOrPassword = "";
      if (doc.password_required) {
        keyOrPassword = password;
      } else {
        // Read key from hash fragment (#key=...)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        keyOrPassword = hashParams.get("key") || "";
        if (!keyOrPassword) {
          toast.error("Clave de descifrado no encontrada en el enlace.");
          setDecrypting(false);
          return;
        }
      }

      // 4. Decrypt file client-side
      const decryptedBuffer = await EncryptionService.decryptFile(
        encryptedBuffer,
        keyOrPassword,
        res.iv,
        res.salt || undefined
      );

      // 5. Create decrypted blob and trigger download
      const decryptedBlob = new Blob([decryptedBuffer], { type: res.mimeType });
      const decryptedUrl = URL.createObjectURL(decryptedBlob);

      const trigger = document.createElement("a");
      trigger.href = decryptedUrl;
      trigger.download = res.originalFilename;
      trigger.click();
      URL.revokeObjectURL(decryptedUrl);

      toast.success("Documento descargado y descifrado con éxito");

      // Optional hash cleanup for no-password files to clean browser URL address bar
      if (!doc.password_required) {
        try {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch (he) {
          console.warn("Could not clean hash:", he);
        }
      }

      // Update local state if it's a one-time download or limit reached
      const nextDownloads = (doc.current_downloads || 0) + 1;
      if (doc.one_time_download || (doc.max_downloads && nextDownloads >= doc.max_downloads)) {
        setError("Este documento ha sido descargado y ya no está disponible.");
      } else {
        setDoc((prev: any) => ({ ...prev, current_downloads: nextDownloads }));
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
