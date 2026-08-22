import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Auth } from "../components/Auth";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Shield,
  Lock,
  Upload,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  File,
  Presentation,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  QrCode as QrCodeIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Key,
  X,
  MoreVertical,
  Ban,
  RefreshCw,
  Calendar as CalendarIcon,
  Info,
  Check,
  Search,
  ChevronDown,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import { toast } from "sonner";
import { EncryptionService } from "../lib/encryption";
import {
  MAX_ENCRYPTED_DOCUMENT_SIZE_LABEL,
  generateSecureDocumentPassword,
  getDocumentFileType,
  getFileTypeQrTheme,
  isEncryptedDocumentSizeAllowed,
  type DocumentFileCategory,
} from "../lib/document-file-types";
import type { EncryptionLevel, CreateEncryptedDocumentRequest } from "../types/encrypted-documents";
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
            <p className="text-muted-foreground">Comparte archivos de forma segura con un QR</p>
          </div>
          <Auth />
        </div>
      </div>
    );
  }

  return <EncryptedDocumentsApp userId={session.user.id} />;
}

// Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04
const documentIconMap = {
  excel: FileSpreadsheet,
  pdf: FileText,
  word: FileText,
  powerpoint: Presentation,
  image: ImageIcon,
  archive: FileArchive,
  text: FileText,
  generic: File,
} satisfies Record<DocumentFileCategory, typeof File>;

function normalizeDocumentCategory(fileType?: string): DocumentFileCategory {
  if (fileType === "zip") return "archive";
  if (
    fileType === "excel" ||
    fileType === "pdf" ||
    fileType === "word" ||
    fileType === "powerpoint" ||
    fileType === "image" ||
    fileType === "archive" ||
    fileType === "text" ||
    fileType === "generic"
  ) {
    return fileType;
  }
  return "generic";
}

function FileTypeIcon({
  fileType,
  className = "w-8 h-8",
}: {
  fileType?: string;
  className?: string;
}) {
  const category = normalizeDocumentCategory(fileType);
  const theme = getFileTypeQrTheme(category);
  const Icon = documentIconMap[category];
  return <Icon className={className} style={{ color: theme.iconColor }} aria-hidden="true" />;
}

function getQrIconDataUri(fileType?: string) {
  const category = normalizeDocumentCategory(fileType);
  const theme = getFileTypeQrTheme(category);
  const iconColor = theme.iconColor;
  const stroke = `stroke="${iconColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const shapes: Record<DocumentFileCategory, string> = {
    excel: `<path ${stroke} d="M5 3h10l4 4v14H5z"/><path ${stroke} d="M15 3v5h5"/><path ${stroke} d="M8 12h8M8 16h8M12 10v8"/>`,
    pdf: `<path ${stroke} d="M6 3h9l3 3v15H6z"/><path ${stroke} d="M15 3v4h4"/><path ${stroke} d="M8 16c2-4 3-7 3-7s1 4 5 6c0 0-4-1-8 1z"/>`,
    word: `<path ${stroke} d="M6 3h9l3 3v15H6z"/><path ${stroke} d="M15 3v4h4"/><path ${stroke} d="M8 11l1.5 6 2-5 2 5 1.5-6"/>`,
    powerpoint: `<path ${stroke} d="M4 5h16v11H4z"/><path ${stroke} d="M8 21h8M12 16v5"/><path ${stroke} d="M9 13V8h4a2 2 0 0 1 0 4H9"/>`,
    image: `<path ${stroke} d="M5 5h14v14H5z"/><circle ${stroke} cx="9" cy="9" r="1.4"/><path ${stroke} d="M6 17l4-4 3 3 2-2 3 3"/>`,
    archive: `<path ${stroke} d="M6 3h12v18H6z"/><path ${stroke} d="M10 3v18M10 7h4M10 11h4M10 15h4"/>`,
    text: `<path ${stroke} d="M6 3h9l3 3v15H6z"/><path ${stroke} d="M15 3v4h4"/><path ${stroke} d="M8 12h8M8 16h6"/>`,
    generic: `<path ${stroke} d="M6 3h9l3 3v15H6z"/><path ${stroke} d="M15 3v4h4"/><path ${stroke} d="M9 13h6"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">${shapes[category]}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function ThemedDocumentQr({
  id,
  value,
  fileType,
  size,
}: {
  id: string;
  value: string;
  fileType?: string;
  size: number;
}) {
  const category = normalizeDocumentCategory(fileType);
  const theme = getFileTypeQrTheme(category);
  return (
    <QRCodeSVG
      id={id}
      value={value}
      size={size}
      level="H"
      includeMargin={true}
      bgColor={theme.background}
      fgColor={theme.foreground}
      imageSettings={{
        src: getQrIconDataUri(category),
        height: Math.round(size * 0.14),
        width: Math.round(size * 0.14),
        excavate: true,
      }}
    />
  );
}

function downloadSvgElement(elementId: string, filename: string) {
  const svg = document.getElementById(elementId);
  if (!svg) return;
  const svgString = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const trigger = document.createElement("a");
  trigger.href = svgUrl;
  trigger.download = filename;
  trigger.click();
  URL.revokeObjectURL(svgUrl);
}

function downloadPngFromSvgElement(elementId: string, filename: string) {
  const svg = document.getElementById(elementId);
  if (!svg) return;
  const svgString = new XMLSerializer().serializeToString(svg);
  const image = new window.Image();
  const svgUrl = URL.createObjectURL(
    new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }),
  );
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const trigger = document.createElement("a");
    trigger.href = canvas.toDataURL("image/png");
    trigger.download = filename;
    trigger.click();
    URL.revokeObjectURL(svgUrl);
  };
  image.src = svgUrl;
}

function EncryptedDocumentsApp({ userId }: { userId: string }) {
  const [view, setView] = useState<"list" | "create">("list");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Modified by Codex — ENC-DOC-COPY-PASSWORD-HOTFIX
  const passwordStorageKey = `encrypted-document-passwords:${userId}`;
  const [documentPasswords, setDocumentPasswords] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = window.localStorage.getItem(passwordStorageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Modified by Codex — ENC-DOC-COPY-PASSWORD-HOTFIX
  const persistDocumentPasswords = (nextPasswords: Record<string, string>) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(passwordStorageKey, JSON.stringify(nextPasswords));
    } catch (error) {
      console.warn("No se pudieron guardar localmente las contraseñas de documentos", error);
    }
  };

  const handleDocumentCreated = () => {
    setView("list");
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePasswordCaptured = (documentId: string, password: string) => {
    setDocumentPasswords((prev) => {
      const next = { ...prev, [documentId]: password };
      persistDocumentPasswords(next);
      return next;
    });
  };

  const handleDocumentDeleted = (documentId: string) => {
    setDocumentPasswords((prev) => {
      const next = { ...prev };
      delete next[documentId];
      persistDocumentPasswords(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <Link
                to="/editor"
                className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
              >
                ← <span className="hidden sm:inline">Volver al editor</span>
                <span className="sm:hidden">Volver</span>
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold tracking-tight sm:text-lg">
                    Documentos Encriptados
                  </h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                    Máxima seguridad
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
                className="min-h-11 px-2 text-xs sm:h-9 sm:min-h-0 sm:px-3 sm:text-sm"
              >
                <FileText className="w-4 h-4 sm:mr-2" />
                <span className="ml-1 sm:ml-0">Mis Documentos</span>
              </Button>
              <Button
                variant={view === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("create")}
                className="min-h-11 px-2 text-xs sm:h-9 sm:min-h-0 sm:px-3 sm:text-sm"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="ml-1 sm:ml-0">Crear Nuevo</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-8">
        {view === "list" ? (
          <DocumentsList
            userId={userId}
            refreshTrigger={refreshTrigger}
            onUploadClick={() => setView("create")}
            documentPasswords={documentPasswords}
            onPasswordCaptured={handlePasswordCaptured}
            onDocumentDeleted={handleDocumentDeleted}
          />
        ) : (
          <CreateDocument
            userId={userId}
            onSuccess={handleDocumentCreated}
            onPasswordCaptured={handlePasswordCaptured}
          />
        )}
      </main>
    </div>
  );
}

interface DocumentsListProps {
  userId: string;
  refreshTrigger: number;
  onUploadClick: () => void;
  documentPasswords: Record<string, string>;
  onPasswordCaptured: (documentId: string, password: string) => void;
  onDocumentDeleted: (documentId: string) => void;
}

function DocumentsList({
  userId,
  refreshTrigger,
  onUploadClick,
  documentPasswords,
  onPasswordCaptured,
  onDocumentDeleted,
}: DocumentsListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQrDoc, setSelectedQrDoc] = useState<any | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const supabase = getBrowserSupabaseClient();

  // Search, filter, and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "revoked" | "expired" | "limit_reached"
  >("all");
  const [securityFilter, setSecurityFilter] = useState<"all" | "password" | "no_password">("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "access" | "expiration">("recent");

  // Control modals states
  const [selectedLimitDoc, setSelectedLimitDoc] = useState<any | null>(null);
  const [limitMaxDownloads, setLimitMaxDownloads] = useState<string>("");
  const [limitOneTime, setLimitOneTime] = useState<boolean>(false);

  const [selectedExpirationDoc, setSelectedExpirationDoc] = useState<any | null>(null);
  const [expirationOption, setExpirationOption] = useState<string>("never");
  const [expirationCustomDate, setExpirationCustomDate] = useState<string>("");

  const [selectedActivityDoc, setSelectedActivityDoc] = useState<any | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [mutatingDocId, setMutatingDocId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocumentsAndStats();
  }, [userId, refreshTrigger]);

  useEffect(() => {
    if (selectedActivityDoc) {
      fetchActivityLogs(selectedActivityDoc.id);
    } else {
      setActivityLogs([]);
    }
  }, [selectedActivityDoc]);

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

  const fetchActivityLogs = async (docId: string) => {
    setLoadingActivity(true);
    try {
      const { data, error } = await supabase
        .from("document_access_logs")
        .select("*")
        .eq("document_id", docId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar el historial de actividad");
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleToggleRevoked = async (doc: any) => {
    setMutatingDocId(doc.id);
    const newRevoked = !doc.revoked;
    try {
      if (newRevoked) {
        const ok = window.confirm(
          "¿Estás seguro de que deseas revocar el acceso a este documento? Ningún destinatario podrá descargarlo a partir de ahora.",
        );
        if (!ok) {
          setMutatingDocId(null);
          return;
        }
      }
      const { error } = await supabase
        .from("encrypted_documents")
        .update({
          revoked: newRevoked,
          revoked_at: newRevoked ? new Date().toISOString() : null,
        })
        .eq("id", doc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                revoked: newRevoked,
                revoked_at: newRevoked ? new Date().toISOString() : null,
              }
            : d,
        ),
      );
      toast.success(
        newRevoked ? "Acceso revocado correctamente" : "Acceso reactivado correctamente",
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar el estado de revocación");
    } finally {
      setMutatingDocId(null);
    }
  };

  const handleToggleOneTime = async (doc: any) => {
    setMutatingDocId(doc.id);
    const newValue = !doc.one_time_download;

    if (newValue && doc.current_downloads >= 1) {
      const ok = window.confirm(
        `Este documento ya tiene ${doc.current_downloads} accesos autorizados. Si activas la descarga única, quedará bloqueado de inmediato para futuros accesos. ¿Deseas continuar?`,
      );
      if (!ok) {
        setMutatingDocId(null);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("encrypted_documents")
        .update({ one_time_download: newValue })
        .eq("id", doc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, one_time_download: newValue } : d)),
      );
      toast.success(newValue ? "Descarga única activada" : "Descarga única desactivada");
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar configuración de descarga única");
    } finally {
      setMutatingDocId(null);
    }
  };

  const openLimitModal = (doc: any) => {
    setSelectedLimitDoc(doc);
    setLimitMaxDownloads(doc.max_downloads ? doc.max_downloads.toString() : "");
    setLimitOneTime(doc.one_time_download || false);
  };

  const handleSaveLimits = async () => {
    if (!selectedLimitDoc) return;
    const newMaxDownloads = limitMaxDownloads.trim() === "" ? null : parseInt(limitMaxDownloads);

    if (newMaxDownloads !== null && isNaN(newMaxDownloads)) {
      toast.error("Por favor ingresa un número válido");
      return;
    }

    if (newMaxDownloads !== null && newMaxDownloads < selectedLimitDoc.current_downloads) {
      const ok = window.confirm(
        `Este documento ya tiene ${selectedLimitDoc.current_downloads} accesos autorizados. Si reduces el límite a ${newMaxDownloads}, quedará bloqueado inmediatamente para nuevos accesos. ¿Deseas continuar?`,
      );
      if (!ok) return;
    }

    setMutatingDocId(selectedLimitDoc.id);
    try {
      const { error } = await supabase
        .from("encrypted_documents")
        .update({
          max_downloads: newMaxDownloads,
          one_time_download: limitOneTime,
        })
        .eq("id", selectedLimitDoc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedLimitDoc.id
            ? { ...d, max_downloads: newMaxDownloads, one_time_download: limitOneTime }
            : d,
        ),
      );
      toast.success("Límites de descarga actualizados");
      setSelectedLimitDoc(null);
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar límites");
    } finally {
      setMutatingDocId(null);
    }
  };

  const openExpirationModal = (doc: any) => {
    setSelectedExpirationDoc(doc);
    if (!doc.expire_at) {
      setExpirationOption("never");
      setExpirationCustomDate("");
    } else {
      setExpirationOption("custom");
      // Format to datetime-local input format (YYYY-MM-DDThh:mm)
      const date = new Date(doc.expire_at);
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      setExpirationCustomDate(localISOTime);
    }
  };

  const handleSaveExpiration = async () => {
    if (!selectedExpirationDoc) return;
    let newExpireAt: string | null = null;

    if (expirationOption !== "never") {
      const now = new Date();
      if (expirationOption === "1h") {
        now.setHours(now.getHours() + 1);
        newExpireAt = now.toISOString();
      } else if (expirationOption === "6h") {
        now.setHours(now.getHours() + 6);
        newExpireAt = now.toISOString();
      } else if (expirationOption === "24h") {
        now.setHours(now.getHours() + 24);
        newExpireAt = now.toISOString();
      } else if (expirationOption === "3d") {
        now.setDate(now.getDate() + 3);
        newExpireAt = now.toISOString();
      } else if (expirationOption === "7d") {
        now.setDate(now.getDate() + 7);
        newExpireAt = now.toISOString();
      } else if (expirationOption === "custom") {
        if (!expirationCustomDate) {
          toast.error("Por favor selecciona una fecha personalizada");
          return;
        }
        newExpireAt = new Date(expirationCustomDate).toISOString();
      }
    }

    setMutatingDocId(selectedExpirationDoc.id);
    try {
      const { error } = await supabase
        .from("encrypted_documents")
        .update({ expire_at: newExpireAt })
        .eq("id", selectedExpirationDoc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) => (d.id === selectedExpirationDoc.id ? { ...d, expire_at: newExpireAt } : d)),
      );
      toast.success("Fecha de expiración actualizada");
      setSelectedExpirationDoc(null);
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar la expiración");
    } finally {
      setMutatingDocId(null);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar este documento de forma permanente? Se borrarán de forma definitiva el archivo cifrado y todos sus logs de acceso. Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }

    setMutatingDocId(id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("encrypted-documents")
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage delete warning:", storageError.message);
      }

      // Delete from DB (cascade deletes access logs)
      const { error: dbError } = await supabase.from("encrypted_documents").delete().eq("id", id);

      if (dbError) throw dbError;

      toast.success("Documento eliminado correctamente");
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      onDocumentDeleted(id);
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar el documento");
    } finally {
      setMutatingDocId(null);
    }
  };

  // Modified by Codex — ENC-DOC-COPY-PASSWORD-HOTFIX
  const handleCopyPasswordAction = (doc: any, currentPassword?: string) => {
    if (!doc.password_required) {
      toast.info("Este documento no usa contraseña");
      return;
    }

    if (currentPassword) {
      navigator.clipboard.writeText(currentPassword);
      toast.success("Contraseña copiada");
      return;
    }

    const password = window.prompt(
      "Esta contraseña no está guardada en este navegador. Pégala una vez para guardarla localmente y copiarla.",
    );
    if (!password) return;

    onPasswordCaptured(doc.id, password);
    navigator.clipboard.writeText(password);
    toast.success("Contraseña guardada localmente y copiada");
  };

  // Calculate statistics
  const activeDocs = documents.filter((doc) => {
    const isExpired = doc.expire_at && new Date(doc.expire_at) < new Date();
    const isLimitReached = doc.max_downloads && doc.current_downloads >= doc.max_downloads;
    return !doc.revoked && !isExpired && !isLimitReached;
  }).length;

  const totalDownloads = documents.reduce((sum, doc) => sum + (doc.current_downloads || 0), 0);

  // Client-side filtering and sorting
  const filteredDocuments = documents
    .filter((doc) => {
      // 1. Search term
      const search = searchTerm.toLowerCase().trim();
      if (search) {
        const matchesName = (doc.name || "").toLowerCase().includes(search);
        const matchesFilename = (doc.original_filename || "").toLowerCase().includes(search);
        const matchesType = (doc.file_type || "").toLowerCase().includes(search);
        if (!matchesName && !matchesFilename && !matchesType) return false;
      }

      // 2. Status filter
      const isExpired = doc.expire_at && new Date(doc.expire_at) < new Date();
      const isLimitReached = doc.max_downloads && doc.current_downloads >= doc.max_downloads;

      let status: "active" | "revoked" | "expired" | "limit_reached" = "active";
      if (doc.revoked) status = "revoked";
      else if (isExpired) status = "expired";
      else if (isLimitReached) status = "limit_reached";

      if (statusFilter !== "all" && statusFilter !== status) return false;

      // 3. Security filter
      if (securityFilter === "password" && !doc.password_required) return false;
      if (securityFilter === "no_password" && doc.password_required) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "access") {
        return (b.current_downloads || 0) - (a.current_downloads || 0);
      }
      if (sortBy === "expiration") {
        if (!a.expire_at) return 1;
        if (!b.expire_at) return -1;
        return new Date(a.expire_at).getTime() - new Date(b.expire_at).getTime();
      }
      return 0;
    });

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card p-3 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 sm:h-12 sm:w-12">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight sm:text-2xl">{activeDocs}</p>
            <p className="break-words text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">
              Documentos Activos
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card p-3 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 sm:h-12 sm:w-12">
            <Download className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight sm:text-2xl">{totalDownloads}</p>
            <p
              className="break-words text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs"
              title="Suma de current_downloads (Accesos autorizados por el servidor)"
            >
              Accesos Autorizados
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card p-3 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 sm:h-12 sm:w-12">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight sm:text-2xl">{documents.length}</p>
            <p className="break-words text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">
              Documentos Protegidos
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card p-3 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 sm:h-12 sm:w-12">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight sm:text-2xl">{failedCount}</p>
            <p
              className="break-words text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs"
              title="Suma de logs fallidos (Intentos con contraseña incorrecta o bloqueos)"
            >
              Intentos Bloqueados
            </p>
          </div>
        </div>
      </div>

      {/* Control panel and filters */}
      <div className="flex flex-col gap-3 bg-card p-3 sm:p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o archivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-[160px] h-10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="revoked">Revocados</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="limit_reached">Límite alcanzado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={securityFilter} onValueChange={(v: any) => setSecurityFilter(v)}>
              <SelectTrigger className="w-full sm:w-[160px] h-10">
                <SelectValue placeholder="Seguridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier seguridad</SelectItem>
                <SelectItem value="password">Con contraseña</SelectItem>
                <SelectItem value="no_password">Sin contraseña</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex min-w-0 gap-2">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[150px] h-10">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="access">Más accesos</SelectItem>
              <SelectItem value="expiration">Expiración</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onUploadClick} className="h-10 shrink-0 px-3 sm:px-4">
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Subir Nuevo</span>
          </Button>
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
      ) : filteredDocuments.length === 0 ? (
        /* No results empty state */
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            No se encontraron documentos con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Documento</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Seguridad</th>
                    <th className="p-4">Actividad</th>
                    <th className="p-4">Límite</th>
                    <th className="p-4">Expiración</th>
                    <th className="p-4">Último Acceso</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {filteredDocuments.map((doc) => {
                    const isExpired = doc.expire_at && new Date(doc.expire_at) < new Date();
                    const isLimitReached =
                      doc.max_downloads && doc.current_downloads >= doc.max_downloads;
                    const sessionPassword = documentPasswords[doc.id];
                    const isMutating = mutatingDocId === doc.id;

                    let statusLabel = "Activo";
                    const statusVariant: "default" | "secondary" | "destructive" | "outline" =
                      "default";
                    let statusClass =
                      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30";

                    if (doc.revoked) {
                      statusLabel = "Revocado";
                      statusClass =
                        "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
                    } else if (isExpired) {
                      statusLabel = "Expirado";
                      statusClass =
                        "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
                    } else if (isLimitReached) {
                      statusLabel = "Límite Alcanzado";
                      statusClass =
                        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30";
                    }

                    // Progress bar values
                    const limitVal = doc.max_downloads || 0;
                    const progressVal =
                      limitVal > 0
                        ? Math.min(100, Math.round((doc.current_downloads / limitVal) * 100))
                        : 0;

                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-muted/30 transition-colors ${isMutating ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <td className="p-4 flex items-center gap-3">
                          <div
                            className="shrink-0 p-2 border rounded-lg"
                            style={{
                              backgroundColor: getFileTypeQrTheme(
                                normalizeDocumentCategory(doc.file_type),
                              ).accentBackground,
                            }}
                          >
                            <FileTypeIcon fileType={doc.file_type} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-semibold text-foreground truncate max-w-[200px]"
                              title={doc.name}
                            >
                              {doc.name}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground truncate max-w-[200px]"
                              title={doc.original_filename}
                            >
                              {doc.original_filename} •{" "}
                              {EncryptionService.formatFileSize(doc.file_size_bytes)}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={`font-semibold text-xs border uppercase tracking-wider rounded-full px-2.5 py-0.5 ${statusClass}`}
                          >
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                doc.encryption_level === "maximum"
                                  ? "text-red-600 dark:text-red-400"
                                  : doc.encryption_level === "high"
                                    ? "text-purple-600 dark:text-purple-400"
                                    : "text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              <Lock className="w-3 h-3" />
                              {doc.encryption_level === "maximum"
                                ? "Máximo (2FA)"
                                : doc.encryption_level === "high"
                                  ? "Alto"
                                  : "Estándar"}
                            </span>
                            {doc.password_required ? (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                                🔒 Con Contraseña
                              </span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                                🔓 Sin Contraseña
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                              {doc.current_downloads} accesos
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              0 intentos bloqueados
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 w-24">
                            <span className="text-[11px] font-medium text-foreground">
                              {doc.current_downloads} / {limitVal || "∞"}
                            </span>
                            {limitVal > 0 ? (
                              <Progress
                                value={progressVal}
                                className={`h-1.5 ${isLimitReached ? "[&>div]:bg-red-500" : ""}`}
                              />
                            ) : (
                              <div className="h-1.5 w-full bg-slate-100 rounded-full dark:bg-slate-800" />
                            )}
                            {doc.one_time_download && (
                              <span className="text-[9px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
                                Un solo uso
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {doc.expire_at ? (
                            <div className="flex flex-col">
                              <span
                                className={`text-xs ${isExpired ? "text-red-500 font-medium" : "text-foreground"}`}
                              >
                                {new Date(doc.expire_at).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {isExpired
                                  ? "Expiró"
                                  : new Date(doc.expire_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nunca expira</span>
                          )}
                        </td>
                        <td className="p-4">
                          {doc.last_accessed_at ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-foreground">
                                {new Date(doc.last_accessed_at).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(doc.last_accessed_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nunca accedido</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-[calc(100vw-24px)] max-w-72 md:w-56"
                            >
                              <DropdownMenuLabel>Compartir</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setSelectedQrDoc(doc)}>
                                <QrCodeIcon className="w-4 h-4 mr-2" /> Ver Código QR
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const url = `${window.location.origin}/d/${doc.short_url}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success("Enlace copiado al portapapeles");
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" /> Copiar Enlace
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!doc.password_required}
                                onClick={() => handleCopyPasswordAction(doc, sessionPassword)}
                              >
                                <Key className="w-4 h-4 mr-2" />
                                {sessionPassword
                                  ? "Copiar Contraseña"
                                  : doc.password_required
                                    ? "Guardar/Copiar Contraseña"
                                    : "Sin contraseña"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Control</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openLimitModal(doc)}>
                                <Shield className="w-4 h-4 mr-2" /> Cambiar Límite
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openExpirationModal(doc)}>
                                <Clock className="w-4 h-4 mr-2" /> Cambiar Expiración
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleOneTime(doc)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {doc.one_time_download
                                  ? "Desactivar un solo uso"
                                  : "Activar un solo uso"}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                                <Ban className="w-4 h-4 mr-2" /> Pausar Acceso (MIGRATION REQ)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleRevoked(doc)}>
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                {doc.revoked ? "Reactivar Acceso" : "Revocar Acceso"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Actividad</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setSelectedActivityDoc(doc)}>
                                <FileText className="w-4 h-4 mr-2" /> Ver Actividad
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 hover:text-red-700 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                                onClick={() => handleDelete(doc.id, doc.encrypted_file_path)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {filteredDocuments.map((doc) => {
              const isExpired = doc.expire_at && new Date(doc.expire_at) < new Date();
              const isLimitReached =
                doc.max_downloads && doc.current_downloads >= doc.max_downloads;
              const sessionPassword = documentPasswords[doc.id];
              const isMutating = mutatingDocId === doc.id;

              let statusLabel = "Activo";
              let statusClass =
                "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30";

              if (doc.revoked) {
                statusLabel = "Revocado";
                statusClass =
                  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
              } else if (isExpired) {
                statusLabel = "Expirado";
                statusClass =
                  "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
              } else if (isLimitReached) {
                statusLabel = "Límite Alcanzado";
                statusClass =
                  "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30";
              }

              return (
                <div
                  key={doc.id}
                  className={`relative max-w-full space-y-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm ${isMutating ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="p-2 border rounded-lg shrink-0"
                        style={{
                          backgroundColor: getFileTypeQrTheme(
                            normalizeDocumentCategory(doc.file_type),
                          ).accentBackground,
                        }}
                      >
                        <FileTypeIcon fileType={doc.file_type} />
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-full truncate font-semibold text-foreground">
                          {doc.name}
                        </p>
                        <p className="max-w-full truncate text-xs text-muted-foreground">
                          {doc.original_filename} •{" "}
                          {EncryptionService.formatFileSize(doc.file_size_bytes)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mt-1">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[calc(100vw-24px)] max-w-72">
                        <DropdownMenuLabel>Compartir</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedQrDoc(doc)}>
                          <QrCodeIcon className="w-4 h-4 mr-2" /> Ver Código QR
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const url = `${window.location.origin}/d/${doc.short_url}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Enlace copiado al portapapeles");
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" /> Copiar Enlace
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!doc.password_required}
                          onClick={() => handleCopyPasswordAction(doc, sessionPassword)}
                        >
                          <Key className="w-4 h-4 mr-2" />
                          {sessionPassword
                            ? "Copiar Contraseña"
                            : doc.password_required
                              ? "Guardar/Copiar Contraseña"
                              : "Sin contraseña"}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Control</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openLimitModal(doc)}>
                          <Shield className="w-4 h-4 mr-2" /> Cambiar Límite
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openExpirationModal(doc)}>
                          <Clock className="w-4 h-4 mr-2" /> Cambiar Expiración
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleOneTime(doc)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {doc.one_time_download ? "Desactivar un solo uso" : "Activar un solo uso"}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                          <Ban className="w-4 h-4 mr-2" /> Pausar Acceso (MIGRATION REQ)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleRevoked(doc)}>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          {doc.revoked ? "Reactivar Acceso" : "Revocar Acceso"}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Actividad</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedActivityDoc(doc)}>
                          <FileText className="w-4 h-4 mr-2" /> Ver Actividad
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 hover:text-red-700 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                          onClick={() => handleDelete(doc.id, doc.encrypted_file_path)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t pt-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Estado</p>
                      <Badge
                        variant="outline"
                        className={`mt-1 font-semibold text-[10px] border uppercase tracking-wider rounded-full px-2 py-0.5 ${statusClass}`}
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Límite descargas</p>
                      <p className="font-semibold text-foreground mt-1">
                        {doc.current_downloads} / {doc.max_downloads || "∞"}{" "}
                        {doc.one_time_download && "• 1 uso"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expiración</p>
                      <p className="font-semibold text-foreground mt-1">
                        {doc.expire_at ? new Date(doc.expire_at).toLocaleDateString() : "Nunca"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Último acceso autorizado</p>
                      <p className="font-semibold text-foreground mt-1">
                        {doc.last_accessed_at
                          ? new Date(doc.last_accessed_at).toLocaleDateString()
                          : "Nunca"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* QR VIEW MODAL */}
      {selectedQrDoc && (
        <Dialog open={!!selectedQrDoc} onOpenChange={() => setSelectedQrDoc(null)}>
          <DialogContent className="max-w-sm w-full p-6 text-center space-y-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{selectedQrDoc.name}</DialogTitle>
              <DialogDescription className="text-xs">
                Comparte este QR seguro de descarga
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-50 p-6 rounded-xl border inline-block mx-auto dark:bg-slate-900/50">
              <ThemedDocumentQr
                id={`qr-modal-${selectedQrDoc.id}`}
                value={`${window.location.origin}/d/${selectedQrDoc.short_url}`}
                size={180}
                fileType={selectedQrDoc.file_type}
              />
            </div>

            <div className="space-y-2">
              <Input
                readOnly
                value={`${window.location.origin}/d/${selectedQrDoc.short_url}`}
                className="bg-slate-50 font-mono text-[10px] select-all text-center h-10 dark:bg-slate-900/50"
              />
              {!selectedQrDoc.password_required && (
                <div className="text-[10px] text-amber-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50 leading-relaxed text-left dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                  <span className="font-semibold">⚠️ Atención:</span> Como este documento no tiene
                  contraseña, quien reciba el QR necesitará el enlace original con la llave de
                  fragmento (`#key=...`) para descifrarlo en su navegador.
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-row gap-2 sm:justify-center">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => {
                  downloadSvgElement(
                    `qr-modal-${selectedQrDoc.id}`,
                    `QR_${selectedQrDoc.name}.svg`,
                  );
                  toast.success("Código QR SVG descargado");
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                SVG
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => {
                  downloadPngFromSvgElement(
                    `qr-modal-${selectedQrDoc.id}`,
                    `QR_${selectedQrDoc.name}.png`,
                  );
                  toast.success("Código QR PNG descargado");
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                PNG
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
                Copiar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CHANGE DOWNLOAD LIMITS MODAL */}
      {selectedLimitDoc && (
        <Dialog open={!!selectedLimitDoc} onOpenChange={() => setSelectedLimitDoc(null)}>
          <DialogContent className="max-w-md w-full p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Cambiar límites de descargas</DialogTitle>
              <DialogDescription className="text-xs">
                Configura cuántas veces puede autorizarse la descarga de este archivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="maxDownloadsInput">Máximo de descargas permitidas</Label>
                <Input
                  id="maxDownloadsInput"
                  type="number"
                  placeholder="Sin límite (deja vacío)"
                  value={limitMaxDownloads}
                  onChange={(e) => setLimitMaxDownloads(e.target.value)}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground">
                  Consumo actual: **{selectedLimitDoc.current_downloads} descargas**.
                </p>
              </div>

              <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Descarga única</Label>
                  <p className="text-xs text-muted-foreground">
                    Bloquea el enlace automáticamente tras el primer acceso.
                  </p>
                </div>
                <Switch checked={limitOneTime} onCheckedChange={setLimitOneTime} />
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedLimitDoc(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLimits}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CHANGE EXPIRATION MODAL */}
      {selectedExpirationDoc && (
        <Dialog open={!!selectedExpirationDoc} onOpenChange={() => setSelectedExpirationDoc(null)}>
          <DialogContent className="max-w-md w-full p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Cambiar expiración de acceso</DialogTitle>
              <DialogDescription className="text-xs">
                Modifica el límite de tiempo a partir del cual el documento dejará de estar
                disponible.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="expirationOption">Plazo de expiración</Label>
                <Select value={expirationOption} onValueChange={setExpirationOption}>
                  <SelectTrigger id="expirationOption" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Nunca expira</SelectItem>
                    <SelectItem value="1h">1 hora</SelectItem>
                    <SelectItem value="6h">6 horas</SelectItem>
                    <SelectItem value="24h">24 horas</SelectItem>
                    <SelectItem value="3d">3 días</SelectItem>
                    <SelectItem value="7d">7 días</SelectItem>
                    <SelectItem value="custom">Fecha personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {expirationOption === "custom" && (
                <div className="space-y-1.5">
                  <Label htmlFor="customDateInput">Selecciona fecha y hora</Label>
                  <Input
                    id="customDateInput"
                    type="datetime-local"
                    value={expirationCustomDate}
                    onChange={(e) => setExpirationCustomDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedExpirationDoc(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveExpiration}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ACTIVITY TIMELINE DRAWER */}
      <Sheet open={!!selectedActivityDoc} onOpenChange={() => setSelectedActivityDoc(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-bold">Actividad de acceso</SheetTitle>
            <SheetDescription className="text-xs">
              Historial y auditoría de accesos autorizados y bloqueados de tu documento.
            </SheetDescription>
          </SheetHeader>

          {selectedActivityDoc && (
            <div className="space-y-6 pt-6">
              <div className="border p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                <p className="font-semibold text-sm truncate">{selectedActivityDoc.name}</p>
                <p className="text-xs text-muted-foreground">
                  Consumo: **{selectedActivityDoc.current_downloads}** accesos autorizados.
                </p>
              </div>

              {loadingActivity ? (
                <div className="flex justify-center py-12">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl p-4">
                  No se registran accesos ni intentos para este documento todavía.
                </div>
              ) : (
                <div className="relative border-l border-muted pl-6 ml-3 space-y-6">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[32px] top-1 w-4 h-4 rounded-full border bg-card flex items-center justify-center ${
                          log.success
                            ? "border-green-500 text-green-500"
                            : "border-red-500 text-red-500"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${log.success ? "bg-green-500" : "bg-red-500"}`}
                        />
                      </div>

                      {/* Log Details */}
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      <div className="text-xs font-bold mt-0.5 text-foreground">
                        {log.success ? "Acceso Autorizado" : "Intento Bloqueado"}
                      </div>
                      {log.user_agent && (
                        <div className="text-[10px] text-muted-foreground mt-1 border bg-muted/20 p-2 rounded-lg break-words max-w-[280px]">
                          <span className="font-semibold">Dispositivo:</span> {log.user_agent}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface CreateDocumentProps {
  userId: string;
  onSuccess: () => void;
  onPasswordCaptured: (documentId: string, password: string) => void;
}

function CreateDocument({ userId, onSuccess, onPasswordCaptured }: CreateDocumentProps) {
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
  // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  // Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04
  const [plainPasswordForSession, setPlainPasswordForSession] = useState("");
  const [passwordWasGenerated, setPasswordWasGenerated] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const supabase = getBrowserSupabaseClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!isEncryptedDocumentSizeAllowed(selectedFile.size)) {
        toast.error(
          `Este archivo supera el límite de ${MAX_ENCRYPTED_DOCUMENT_SIZE_LABEL}. Selecciona un archivo más pequeño.`,
        );
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
      if (!formData.name) {
        setFormData((prev) => ({ ...prev, name: selectedFile.name }));
      }
    }
  };

  // Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04
  const fileTypeInfo = file ? getDocumentFileType(file) : null;
  const fileTheme = getFileTypeQrTheme(fileTypeInfo?.category || "generic");

  function updatePassword(password: string, generated = false) {
    setFormData((prev) => ({ ...prev, password }));
    setPlainPasswordForSession(password);
    setPasswordWasGenerated(generated);
    setPasswordCopied(false);
  }

  function copyPassword() {
    if (!formData.password) return;
    navigator.clipboard.writeText(formData.password);
    setPasswordCopied(true);
    toast.success("Contraseña copiada");
  }

  // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
  function generateShortUrl() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    let result = "";
    for (let i = 0; i < array.length; i++) {
      result += chars.charAt(array[i]! % chars.length);
    }
    return result;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }
    if (!isEncryptedDocumentSizeAllowed(file.size)) {
      toast.error(
        `Este archivo supera el límite de ${MAX_ENCRYPTED_DOCUMENT_SIZE_LABEL}. Selecciona un archivo más pequeño.`,
      );
      return;
    }

    setUploading(true);
    try {
      // 1. Client-Side Encryption
      const encrypted = await EncryptionService.encryptFile(file, formData.password);

      // 2. Wrap encrypted ArrayBuffer in a Blob using original file type
      // (Bypasses bucket MIME restrictions that block raw application/octet-stream)
      const encryptedBlob = new Blob([encrypted.encryptedData], {
        type: file.type || "application/octet-stream",
      });

      // 3. Upload encrypted binary to Storage
      const filePath = `${userId}/${Date.now()}_${file.name}.bin`;
      const { error: uploadError } = await supabase.storage
        .from("encrypted-documents")
        .upload(filePath, encryptedBlob, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 4. Calculate password hash if provided using unique salt (harden verify)
      // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
      let passwordHash = null;
      if (formData.password && encrypted.salt) {
        passwordHash = await EncryptionService.hashPassword(formData.password, encrypted.salt);
      }

      // 5. Calculate expiration date
      let expireAt = null;
      if (formData.expire_hours) {
        const d = new Date();
        d.setHours(d.getHours() + formData.expire_hours);
        expireAt = d.toISOString();
      }

      // 6. Generate Short URL key
      const shortUrl = generateShortUrl();

      // 7. Write metadata record in Supabase DB
      const { data: dbData, error: dbError } = await supabase
        .from("encrypted_documents")
        .insert({
          user_id: userId,
          name: formData.name || file.name,
          description: formData.description || null,
          original_filename: file.name,
          file_type: EncryptionService.getDocumentType(file.type, file.name),
          file_size_bytes: file.size,
          mime_type: file.type,
          encrypted_file_path: filePath,
          iv: encrypted.iv,
          salt: encrypted.salt || null,
          encryption_level: formData.encryption_level,
          password_required: !!formData.password,
          password_hash: passwordHash,
          expire_at: expireAt,
          max_downloads: formData.max_downloads || null,
          one_time_download: formData.one_time_download || false,
          short_url: shortUrl,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
      if (!formData.password) {
        setGeneratedKey(encrypted.key);
      } else {
        setGeneratedKey(null);
        onPasswordCaptured(dbData.id, formData.password);
      }

      toast.success("Documento encriptado y subido con éxito");
      setCreatedDoc(dbData);
    } catch (error: any) {
      console.error(error);
      toast.error("Error al guardar y encriptar: " + (error.message || "Error desconocido"));
    } finally {
      setUploading(false);
    }
  };

  if (createdDoc) {
    // Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
    const downloadUrl = `${window.location.origin}/d/${createdDoc.short_url}${generatedKey ? `#key=${generatedKey}` : ""}`;
    // Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04
    const createdTheme = getFileTypeQrTheme(normalizeDocumentCategory(createdDoc.file_type));

    return (
      <div className="max-w-xl mx-auto rounded-xl border bg-white p-4 sm:p-8 shadow-md text-center space-y-5 sm:space-y-6 animate-fade-in overflow-hidden">
        <div
          className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-1 sm:mb-2"
          style={{ backgroundColor: createdTheme.accentBackground }}
        >
          <FileTypeIcon fileType={createdDoc.file_type} className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">Documento protegido</h2>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
          Tu archivo ha sido cifrado en el navegador y subido de forma segura. Comparte el código QR
          o el enlace corto.
        </p>
        <div className="mx-auto max-w-md rounded-lg border bg-slate-50 p-3 text-left">
          <p className="truncate text-sm font-semibold">{createdDoc.original_filename}</p>
          <p className="text-xs text-muted-foreground">
            {createdTheme.label} • {EncryptionService.formatFileSize(createdDoc.file_size_bytes)}
          </p>
        </div>

        {/* QR Code Card */}
        <div
          className="p-4 sm:p-6 rounded-xl border inline-block shadow-sm"
          style={{ backgroundColor: createdTheme.accentBackground }}
        >
          <ThemedDocumentQr
            id="qr-success-display"
            value={downloadUrl}
            size={180}
            fileType={createdDoc.file_type}
          />
        </div>

        {/* Short URL copy widget */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Enlace Seguro de Descarga</Label>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <div className="flex-1 min-w-0">
              <Input
                readOnly
                value={downloadUrl}
                className="bg-slate-50 font-mono text-[10px] sm:text-xs select-all text-center h-11 w-full"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="Copiar enlace seguro"
              onClick={() => {
                navigator.clipboard.writeText(downloadUrl);
                toast.success("Enlace copiado al portapapeles");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {createdDoc.password_required && plainPasswordForSession && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Contraseña</Label>
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <div className="flex-1 min-w-0">
                <Input
                  readOnly
                  type={showPassword ? "text" : "password"}
                  value={plainPasswordForSession}
                  className="bg-slate-50 font-mono text-[10px] sm:text-xs select-all text-center h-11 w-full"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="Copiar contraseña"
                onClick={() => {
                  if (plainPasswordForSession) {
                    navigator.clipboard.writeText(plainPasswordForSession);
                    setPasswordCopied(true);
                    toast.success("Contraseña copiada al portapapeles");
                  }
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {passwordWasGenerated && !passwordCopied ? "Guarda esta contraseña ahora. " : ""}
              Envíala por un canal separado del QR.
            </p>
          </div>
        )}

        {/* Zero-Knowledge warning for no-password files */}
        {/* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02 */}
        {!createdDoc.password_required && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left max-w-md mx-auto space-y-1.5 shadow-sm">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Guarda este enlace ahora
            </p>
            <p className="leading-relaxed text-amber-800">
              Por seguridad (Zero-Knowledge), la clave de descifrado está integrada en el fragmento
              de la URL (`#key=...`) y no se guarda en nuestros servidores. Si cierras esta
              pantalla, no podrás recuperar el acceso al archivo.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-3 sm:pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 text-xs sm:text-sm"
            onClick={() => {
              downloadSvgElement("qr-success-display", `QR_${createdDoc.name}.svg`);
              toast.success("Código QR SVG descargado");
            }}
          >
            <Download className="w-4 h-4" />
            Descargar SVG
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 text-xs sm:text-sm"
            onClick={() => {
              downloadPngFromSvgElement("qr-success-display", `QR_${createdDoc.name}.png`);
              toast.success("Código QR PNG descargado");
            }}
          >
            <Download className="w-4 h-4" />
            Descargar PNG
          </Button>
          <Button type="button" className="flex-1 text-xs sm:text-sm" onClick={onSuccess}>
            Ver Mis Documentos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Left Column - Upload & Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Area */}
          <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
              <Upload className="w-5 h-5" />
              Subir Archivo
            </h3>

            {!file ? (
              <label className="flex min-h-52 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-slate-50 to-blue-50 p-4 text-center transition-all hover:from-blue-50 hover:to-cyan-50 sm:h-64">
                <div className="flex min-w-0 flex-col items-center justify-center">
                  <Upload className="mb-4 h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
                  <p className="mb-2 text-sm font-semibold leading-tight">
                    Click para subir o arrastra el archivo aquí
                  </p>
                  <p className="max-w-full break-words text-xs text-muted-foreground">
                    Excel, PDF, Word, PowerPoint, imágenes y ZIP. Hasta{" "}
                    {MAX_ENCRYPTED_DOCUMENT_SIZE_LABEL} por archivo.
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
                />
              </label>
            ) : (
              <div
                className="flex min-w-0 items-center gap-3 rounded-xl border p-3 sm:gap-4 sm:p-4"
                style={{ backgroundColor: fileTheme.accentBackground }}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm sm:h-16 sm:w-16">
                  <FileTypeIcon fileType={fileTypeInfo?.category || "other"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{file.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {fileTypeInfo?.label} • {EncryptionService.formatFileSize(file.size)}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
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
          {/* Encryption Level */}
          <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Nivel de Seguridad
            </h3>

            <div className="space-y-3">
              {[
                {
                  value: "standard",
                  icon: Shield,
                  label: "Estándar",
                  description: "AES-256",
                  color: "text-blue-600",
                },
                {
                  value: "high",
                  icon: Lock,
                  label: "Alto",
                  description: "Contraseña + controles",
                  color: "text-purple-600",
                },
                {
                  value: "maximum",
                  icon: Key,
                  label: "Máximo",
                  description: "Contraseña + límites",
                  color: "text-red-600",
                },
              ].map((level) => {
                const Icon = level.icon;
                const isActive = formData.encryption_level === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        encryption_level: level.value as EncryptionLevel,
                      })
                    }
                    className={`flex w-full min-w-0 items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${level.color}`} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-semibold text-sm">{level.label}</p>
                      <p className="break-words text-xs text-muted-foreground">
                        {level.description}
                      </p>
                    </div>
                    {isActive && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password Protection */}
          <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
              <Key className="w-5 h-5 text-amber-600" />
              Protección con Contraseña
            </h3>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (opcional pero recomendado)</Label>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updatePassword(e.target.value, false)}
                  placeholder="Ingresa una contraseña segura"
                  autoComplete="new-password"
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {formData.password && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label="Copiar contraseña"
                    title="Copiar contraseña"
                    onClick={copyPassword}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full whitespace-normal break-words px-3 text-center leading-tight"
                onClick={() => updatePassword(generateSecureDocumentPassword(), true)}
              >
                <Key className="w-4 h-4" />
                Generar contraseña segura
              </Button>
              <p className="text-xs text-muted-foreground">
                La contraseña será requerida para descargar el documento. Compártela por separado
                con el destinatario.
              </p>
            </div>
          </div>

          {/* Access Control */}
          <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold sm:text-lg">
              <Clock className="w-5 h-5 text-green-600" />
              Control de Acceso
            </h3>

            <div className="space-y-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <Label>Descarga única</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-destruir después de 1 descarga
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
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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
