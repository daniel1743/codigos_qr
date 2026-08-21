import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Auth } from "../components/Auth";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Shield,
  Lock,
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Archive,
  Download,
  Eye,
  Trash2,
  Copy,
  QrCode as QrCodeIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Key,
  Calendar,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { EncryptionService } from "../lib/encryption";
import type { CreateEncryptedDocumentRequest } from "../types/encrypted-documents";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/encrypted-documents")({
  component: EncryptedDocumentsPage,
});

function EncryptedDocumentsPage() {
  const supabase = getBrowserSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Documentos Encriptados</h1>
            <p className="text-muted-foreground">
              Comparte archivos confidenciales con cifrado local AES-256-GCM
            </p>
          </div>
          <Auth />
        </div>
      </div>
    );
  }

  return <EncryptedDocumentsApp userId={session.user.id} />;
}

function getFileIconHelper(fileType: string) {
  switch (fileType) {
    case "excel":
      return <FileText className="w-8 h-8 text-green-600" />;
    case "pdf":
      return <FileText className="w-8 h-8 text-red-600" />;
    case "image":
      return <ImageIcon className="w-8 h-8 text-blue-600" />;
    case "word":
      return <FileText className="w-8 h-8 text-blue-700" />;
    case "zip":
      return <Archive className="w-8 h-8 text-orange-600" />;
    default:
      return <File className="w-8 h-8 text-gray-600" />;
  }
}

function EncryptedDocumentsApp({ userId }: { userId: string }) {
  const [view, setView] = useState<"list" | "create">("list");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDocumentCreated = () => {
    setView("list");
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/editor" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                ← Volver al editor
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">Documentos Encriptados</h1>
                  <p className="text-xs text-muted-foreground">Máxima seguridad</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Mis Documentos
              </Button>
              <Button
                variant={view === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("create")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Crear Nuevo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {view === "list" ? (
          <DocumentsList userId={userId} refreshTrigger={refreshTrigger} onUploadClick={() => setView("create")} />
        ) : (
          <CreateDocument userId={userId} onSuccess={handleDocumentCreated} />
        )}
      </main>
    </div>
  );
}

interface DocumentsListProps {
  userId: string;
  refreshTrigger: number;
  onUploadClick: () => void;
}

function DocumentsList({ userId, refreshTrigger, onUploadClick }: DocumentsListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQrDoc, setSelectedQrDoc] = useState<any | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    fetchDocumentsAndStats();
  }, [userId, refreshTrigger]);

  const fetchDocumentsAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch documents
      const { data, error } = await supabase
        .from("encrypted_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);

      // 2. Fetch failed access logs count
      const docIds = data?.map((d: any) => d.id) || [];
      if (docIds.length > 0) {
        const { count, error: logError } = await supabase
          .from("document_access_logs")
          .select("*", { count: "exact", head: true })
          .in("document_id", docIds)
          .eq("success", false);

        if (!logError && count !== null) {
          setFailedCount(count);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar la lista de documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este documento de forma permanente? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("encrypted-documents")
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage delete warning:", storageError.message);
      }

      // Delete from DB (cascade deletes access logs)
      const { error: dbError } = await supabase
        .from("encrypted_documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast.success("Documento eliminado correctamente");
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar el documento");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      </div>
    );
  }

  // Calculate statistics
  const activeDocs = documents.filter((doc) => {
    const isExpired = doc.expire_at && new Date(doc.expire_at) < new Date();
    const isLimitReached = doc.max_downloads && doc.current_downloads >= doc.max_downloads;
    return !isExpired && !isLimitReached;
  }).length;

  const totalDownloads = documents.reduce((sum, doc) => sum + (doc.current_downloads || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeDocs}</p>
              <p className="text-xs text-muted-foreground">Documentos Activos</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDownloads}</p>
              <p className="text-xs text-muted-foreground">Descargas Totales</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Accesos Seguros</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Intentos Bloqueados</p>
            </div>
          </div>
        </div>
      </div>

      {documents.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 mb-6">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No tienes documentos encriptados</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Sube tu primer documento confidencial y genera un QR code seguro para compartirlo.
          </p>
          <Button size="lg" className="gap-2" onClick={onUploadClick}>
            <Upload className="w-5 h-5" />
            Subir Primer Documento
          </Button>
        </div>
      ) : (
        /* Documents Grid / Table */
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Documento</th>
                  <th className="p-4">Seguridad</th>
                  <th className="p-4">Expiración</th>
                  <th className="p-4">Descargas</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {documents.map((doc) => {
                  const isExpired = doc.expire_at && new Date(doc.expire_at) < new Date();
                  const isLimitReached = doc.max_downloads && doc.current_downloads >= doc.max_downloads;
                  const isLinkActive = !isExpired && !isLimitReached;
                  
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="p-4 flex items-center gap-3">
                        <div className="shrink-0 p-2 border rounded-lg bg-slate-50">
                          {getFileIconHelper(doc.file_type)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[240px]">{doc.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {doc.original_filename} • {EncryptionService.formatFileSize(doc.file_size_bytes)}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            doc.encryption_level === "maximum" ? "text-red-600" : doc.encryption_level === "high" ? "text-purple-600" : "text-blue-600"
                          }`}>
                            <Lock className="w-3.5 h-3.5" />
                            {doc.encryption_level === "maximum" ? "Máximo (2FA)" : doc.encryption_level === "high" ? "Alto" : "Estándar"}
                          </span>
                          {doc.password_required && (
                            <span className="text-[10px] text-amber-600 font-semibold">🔒 Con Contraseña</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {doc.expire_at ? (
                          <div className="flex flex-col">
                            <span className={`text-xs ${isExpired ? "text-red-500 font-medium" : "text-foreground"}`}>
                              {new Date(doc.expire_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {isExpired ? "Expirado" : new Date(doc.expire_at).toLocaleTimeString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nunca expira</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className={`text-xs font-medium ${isLimitReached ? "text-red-500" : "text-foreground"}`}>
                            {doc.current_downloads} / {doc.max_downloads || "∞"}
                          </span>
                          {doc.one_time_download && (
                            <span className="text-[10px] text-orange-600 font-semibold">Un solo uso</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isLinkActive || !doc.password_required}
                            onClick={() => {
                              const url = `${window.location.origin}/d/${doc.short_url}`;
                              navigator.clipboard.writeText(url);
                              toast.success("Enlace copiado al portapapeles");
                            }}
                            title={doc.password_required ? "Copiar enlace" : "La clave solo se muestra al crear el documento"}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isLinkActive || !doc.password_required}
                            onClick={() => setSelectedQrDoc(doc)}
                            title={doc.password_required ? "Ver código QR" : "La clave solo se muestra al crear el documento"}
                          >
                            <QrCodeIcon className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(doc.id, doc.encrypted_file_path)}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Modal Overlay */}
      {selectedQrDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl relative border">
            <button
              onClick={() => setSelectedQrDoc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">{selectedQrDoc.name}</h3>
              <p className="text-xs text-muted-foreground">Comparte este QR seguro de descarga</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border inline-block">
              <QRCodeSVG
                id={`qr-modal-${selectedQrDoc.id}`}
                value={`${window.location.origin}/d/${selectedQrDoc.short_url}`}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-2">
              <Input
                readOnly
                value={`${window.location.origin}/d/${selectedQrDoc.short_url}`}
                className="bg-slate-50 font-mono text-[10px] select-all text-center h-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => {
                  const svg = document.getElementById(`qr-modal-${selectedQrDoc.id}`);
                  if (svg) {
                    const svgString = new XMLSerializer().serializeToString(svg);
                    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                    const svgUrl = URL.createObjectURL(svgBlob);
                    const trigger = document.createElement("a");
                    trigger.href = svgUrl;
                    trigger.download = `QR_${selectedQrDoc.name}.svg`;
                    trigger.click();
                    URL.revokeObjectURL(svgUrl);
                    toast.success("Código QR descargado");
                  }
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Descargar QR
              </Button>
              <Button
                className="flex-1 text-xs"
                onClick={() => {
                  const url = `${window.location.origin}/d/${selectedQrDoc.short_url}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Enlace copiado");
                  setSelectedQrDoc(null);
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copiar Enlace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateDocumentProps {
  userId: string;
  onSuccess: () => void;
}

function CreateDocument({ userId, onSuccess }: CreateDocumentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<CreateEncryptedDocumentRequest>>({
    name: "",
    description: "",
    encryption_level: "standard",
    password: "",
    two_factor_enabled: false,
    one_time_download: false,
  });
  const [uploading, setUploading] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<any | null>(null);
  const maxFileSizeBytes = 50 * 1024 * 1024;
  
  const supabase = getBrowserSupabaseClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
      if (selectedFile.size > maxFileSizeBytes) {
        toast.error("El archivo supera el límite de 50 MB.");
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
      if (!formData.name) {
        setFormData((prev) => ({ ...prev, name: selectedFile.name }));
      }
    }
  };

  // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
  function generateShortUrl() {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function keyToUrlSafe(key: string) {
    return key.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setUploading(true);
    let uploadedPath: string | null = null;
    try {
      // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
      const encrypted = await EncryptionService.encryptFile(file, formData.password);
      const encryptedBlob = new Blob(
        [encrypted.encryptedData],
        { type: "application/octet-stream" },
      );

      const filePath = `${userId}/${Date.now()}_${file.name}.bin`;
      const { error: uploadError } = await supabase.storage
        .from("encrypted-documents")
        .upload(filePath, encryptedBlob, {
          contentType: "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPath = filePath;

      let expireAt: string | null = null;
      if (formData.expire_hours) {
        const expiration = new Date();
        expiration.setHours(expiration.getHours() + formData.expire_hours);
        expireAt = expiration.toISOString();
      }

      const shortUrl = generateShortUrl();
      const { data: dbData, error: dbError } = await supabase.rpc(
        "create_encrypted_document",
        {
          p_name: formData.name || file.name,
          p_description: formData.description || null,
          p_original_filename: file.name,
          p_file_type: EncryptionService.getDocumentType(file.type),
          p_file_size_bytes: file.size,
          p_mime_type: file.type || "application/octet-stream",
          p_encrypted_file_path: filePath,
          p_iv: encrypted.iv,
          p_salt: encrypted.salt || null,
          p_password: formData.password || null,
          p_expire_at: expireAt,
          p_max_downloads: formData.max_downloads || null,
          p_one_time_download: formData.one_time_download || false,
          p_short_url: shortUrl,
        },
      );

      if (dbError) throw dbError;

      const documentRecord = Array.isArray(dbData) ? dbData[0] : dbData;
      toast.success("Documento cifrado y subido con éxito");
      setCreatedDoc({
        ...documentRecord,
        short_url: documentRecord?.short_url ?? shortUrl,
        decryption_key: formData.password ? null : keyToUrlSafe(encrypted.key),
      });
    } catch (error: any) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("encrypted-documents")
          .remove([uploadedPath]);
        if (cleanupError) console.error("Encrypted upload cleanup failed", cleanupError);
      }
      console.error(error);
      toast.error("Error al guardar y cifrar: " + (error.message || "Error desconocido"));
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <FileText className="w-8 h-8" />;
    const type = EncryptionService.getDocumentType(file.type);
    switch (type) {
      case "excel":
        return <FileText className="w-8 h-8 text-green-600" />;
      case "pdf":
        return <FileText className="w-8 h-8 text-red-600" />;
      case "image":
        return <ImageIcon className="w-8 h-8 text-blue-600" />;
      case "word":
        return <FileText className="w-8 h-8 text-blue-700" />;
      case "zip":
        return <Archive className="w-8 h-8 text-orange-600" />;
      default:
        return <File className="w-8 h-8 text-gray-600" />;
    }
  };

  if (createdDoc) {
    const downloadUrl = `${window.location.origin}/d/${createdDoc.short_url}${createdDoc.decryption_key ? `#key=${createdDoc.decryption_key}` : ""}`;
    
    return (
      <div className="max-w-xl mx-auto rounded-xl border bg-white p-8 shadow-md text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-2">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">¡Documento Encriptado con Éxito!</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Tu archivo ha sido cifrado en el navegador y subido de forma segura. Comparte el código QR o el enlace corto.
        </p>

        {/* QR Code Card */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 inline-block shadow-sm">
          <QRCodeSVG
            id="qr-success-display"
            value={downloadUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Short URL copy widget */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Enlace Seguro de Descarga</Label>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Input readOnly value={downloadUrl} className="bg-slate-50 font-mono text-xs select-all text-center h-11" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(downloadUrl);
                toast.success("Enlace copiado al portapapeles");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              const svg = document.getElementById("qr-success-display");
              if (svg) {
                const svgString = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                const svgUrl = URL.createObjectURL(svgBlob);
                const trigger = document.createElement("a");
                trigger.href = svgUrl;
                trigger.download = `QR_${createdDoc.name}.svg`;
                trigger.click();
                URL.revokeObjectURL(svgUrl);
                toast.success("Código QR descargado");
              }
            }}
          >
            <Download className="w-4 h-4" />
            Descargar QR
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onSuccess}
          >
            Ver Mis Documentos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upload & Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Area */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subir Archivo
            </h3>

            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-xl cursor-pointer bg-gradient-to-br from-slate-50 to-blue-50 hover:from-blue-50 hover:to-cyan-50 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="mb-2 text-sm font-semibold">
                    Click para subir o arrastra el archivo aquí
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Excel, PDF, Word, Imágenes, ZIP (máx. 50 MB)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                />
              </label>
            ) : (
              <div className="flex items-center gap-4 p-4 border rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50">
                <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-white shadow-sm">
                  {getFileIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {EncryptionService.formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Información del Documento
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Documento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Nómina Enero 2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el contenido del documento..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Security Settings */}
        <div className="space-y-6">
          {/* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02 */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Cifrado disponible
            </h3>
            <p className="text-sm text-muted-foreground">
              AES-256-GCM con descifrado local. RSA y 2FA aún no están disponibles.
            </p>
          </div>

          {/* Password Protection */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              Protección con Contraseña
            </h3>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (opcional pero recomendado)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Ingresa una contraseña segura"
              />
              <p className="text-xs text-muted-foreground">
                La contraseña será requerida para descargar el documento
              </p>
            </div>
          </div>

          {/* Access Control */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              Control de Acceso
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Descarga única</Label>
                  <p className="text-xs text-muted-foreground">
                    Invalidar el enlace después de una autorización
                  </p>
                </div>
                <Switch
                  checked={formData.one_time_download || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, one_time_download: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expire_hours">Expiración (horas)</Label>
                <Select
                  value={formData.expire_hours?.toString() || "never"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      expire_hours: (value === "never" ? undefined : parseInt(value)) as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Nunca expira</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="48">48 horas</SelectItem>
                    <SelectItem value="168">7 días</SelectItem>
                    <SelectItem value="720">30 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_downloads">Máximo de descargas</Label>
                <Select
                  value={formData.max_downloads?.toString() || "unlimited"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      max_downloads: (value === "unlimited" ? undefined : parseInt(value)) as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Ilimitado</SelectItem>
                    <SelectItem value="1">1 descarga</SelectItem>
                    <SelectItem value="5">5 descargas</SelectItem>
                    <SelectItem value="10">10 descargas</SelectItem>
                    <SelectItem value="50">50 descargas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" size="lg" className="w-full gap-2" disabled={!file || uploading}>
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Encriptando...
              </>
            ) : (
              <>
                <QrCodeIcon className="w-5 h-5" />
                Crear Documento Seguro
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
