import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
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
  ChevronDown,
  ExternalLink,
} from "lucide-react";
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
import type {
  CreateEncryptedDocumentRequest,
  EncryptedDocument,
  EncryptionLevel,
} from "../types/encrypted-documents";
import { QRCodeSVG } from "qrcode.react";
import { CANONICAL_PUBLIC_ORIGIN } from "../lib/url";
import { AppShell } from "../components/app-shell/AppShell";
import { CqEmptyState } from "../components/cq-ui/CqEmptyState";
import { CqIconTile } from "../components/cq-ui/CqIconTile";
import { CqPageHeader } from "../components/cq-ui/CqPageHeader";
import { CqPanel } from "../components/cq-ui/CqPanel";
import { CqStatusPill } from "../components/cq-ui/CqStatusPill";
import type { CqStatusTone } from "../components/cq-ui/CqStatusPill";
import {
  cqDangerButton,
  cqIconButton,
  cqPrimaryButton,
  cqSecondaryButton,
  cqSoftButton,
} from "../components/cq-ui/buttonStyles";

/* ── F6 visual language helpers (presentation only) ──────────────────────────
 * These read REAL document columns (`expire_at`, `max_downloads`,
 * `current_downloads`, `encryption_level`, `password_required`,
 * `one_time_download`) and only label them. No new state, no new field.
 */

/** Compact icon-only control (approved F4 icon-control treatment). */
const iconControlClass = cqIconButton;

/** In-row action (approved F2/F4 compact outlined treatment). */
const rowActionClass = cqSecondaryButton;

const deleteActionClass = cqDangerButton;

/** Segmented view switch built from approved cq tokens. */
const segmentShellClass =
  "inline-flex min-w-0 shrink-0 items-center gap-1 rounded-cq-sm bg-white p-1 ring-1 ring-cq-line";
const segmentOptionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-cq-xs px-3.5 text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue";
const segmentOnClass = "bg-cq-blue text-white shadow-[0_10px_24px_-10px_rgba(30,86,224,0.6)]";
const segmentOffClass = "text-cq-muted hover:bg-cq-canvas hover:text-cq-ink";

/**
 * Encryption level → approved pill tone / label.
 *
 * Written as functions (not `Record` lookups) because the list rows are typed
 * `any` at the fetch boundary in this pre-existing route; a `Record` index would
 * raise an implicit-any error under `noImplicitAny`.
 */
function encryptionTone(level: EncryptionLevel | string | undefined): CqStatusTone {
  if (level === "maximum") return "danger";
  if (level === "high") return "warning";
  return "info";
}

function encryptionLabel(level: EncryptionLevel | string | undefined): string {
  if (level === "maximum") return "Máximo";
  if (level === "high") return "Alto";
  return "Estándar";
}

/**
 * Derives the link status pill from the same expressions the legacy list already
 * used to enable/disable its actions plus the real `revoked` flag, which the
 * download route enforces server-side (`d.$shortUrl.tsx` → DOCUMENT_REVOKED).
 * An expiry date in the past or a reached download cap blocks the link.
 * Nothing else is invented.
 */
function documentStatus(doc: EncryptedDocument): {
  tone: CqStatusTone;
  label: string;
  active: boolean;
} {
  const isExpired = Boolean(doc.expire_at && new Date(doc.expire_at) < new Date());
  const isLimitReached = Boolean(doc.max_downloads && doc.current_downloads >= doc.max_downloads);
  if (doc.revoked) return { tone: "danger", label: "Revocado", active: false };
  if (isExpired) return { tone: "danger", label: "Expirado", active: false };
  if (isLimitReached) return { tone: "warning", label: "Agotado", active: false };
  return { tone: "positive", label: "Activo", active: true };
}

export const Route = createFileRoute("/encrypted-documents")({
  component: EncryptedDocumentsPage,
});

function EncryptedDocumentsPage() {
  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/login" });
  }, [loading, navigate, session]);

  if (loading) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14">
          <p className="text-sm text-cq-muted" role="status">
            Cargando tus documentos…
          </p>
        </main>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14">
          <p className="text-sm text-cq-muted" role="status">
            Redirigiendo a iniciar sesión…
          </p>
        </main>
      </AppShell>
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
  const [documentPasswords, setDocumentPasswords] = useState<Record<string, string>>({});

  const handleDocumentCreated = () => {
    setView("list");
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePasswordCaptured = (documentId: string, password: string) => {
    setDocumentPasswords((prev) => ({ ...prev, [documentId]: password }));
  };

  const handleDocumentDeleted = (documentId: string) => {
    setDocumentPasswords((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14">
        <CqPageHeader
          title="Documentos encriptados"
          description="Cifra archivos en el navegador y compártelos con un enlace privado de un solo uso."
          visual="magic"
          context={
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {MAX_ENCRYPTED_DOCUMENT_SIZE_LABEL} por archivo · el cifrado ocurre antes de subir
            </span>
          }
          actions={
            <div className={segmentShellClass} role="group" aria-label="Vista de documentos">
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={`${segmentOptionClass} ${view === "list" ? segmentOnClass : segmentOffClass}`}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Mis documentos
              </button>
              <button
                type="button"
                onClick={() => setView("create")}
                aria-pressed={view === "create"}
                className={`${segmentOptionClass} ${view === "create" ? segmentOnClass : segmentOffClass}`}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Crear nuevo
              </button>
            </div>
          }
        />

        <div className="mt-8 sm:mt-10">
          {view === "list" ? (
            <DocumentsList
              userId={userId}
              refreshTrigger={refreshTrigger}
              onUploadClick={() => setView("create")}
              documentPasswords={documentPasswords}
              onDocumentDeleted={handleDocumentDeleted}
            />
          ) : (
            <CreateDocument
              userId={userId}
              onSuccess={handleDocumentCreated}
              onPasswordCaptured={handlePasswordCaptured}
            />
          )}
        </div>
      </main>
    </AppShell>
  );
}

interface DocumentsListProps {
  userId: string;
  refreshTrigger: number;
  onUploadClick: () => void;
  documentPasswords: Record<string, string>;
  onDocumentDeleted: (documentId: string) => void;
}

function DocumentsList({
  userId,
  refreshTrigger,
  onUploadClick,
  documentPasswords,
  onDocumentDeleted,
}: DocumentsListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQrDoc, setSelectedQrDoc] = useState<any | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [expandedDocumentIds, setExpandedDocumentIds] = useState<Set<string>>(new Set());
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
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar este documento de forma permanente? Esta acción no se puede deshacer.",
      )
    ) {
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
      const { error: dbError } = await supabase.from("encrypted_documents").delete().eq("id", id);

      if (dbError) throw dbError;

      toast.success("Documento eliminado correctamente");
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      onDocumentDeleted(id);
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar el documento");
    }
  };

  const toggleDocumentExpanded = (documentId: string) => {
    setExpandedDocumentIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <p className="text-sm text-cq-muted" role="status">
        Cargando documentos…
      </p>
    );
  }

  // Statistics — all four values are derived from the rows already fetched.
  const activeDocs = documents.filter((doc) => documentStatus(doc).active).length;

  const totalDownloads = documents.reduce((sum, doc) => sum + (doc.current_downloads || 0), 0);

  const stats = [
    { id: "total", label: "Documentos", value: documents.length, icon: FileText },
    { id: "active", label: "Enlaces activos", value: activeDocs, icon: CheckCircle2 },
    { id: "downloads", label: "Descargas", value: totalDownloads, icon: Download },
    { id: "blocked", label: "Intentos bloqueados", value: failedCount, icon: AlertTriangle },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Stats — honest labels for the real counters (no storage/quota guesses). */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map(({ id, label, value, icon: Icon }) => (
          <CqPanel key={id} as="div" visual="magic" className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <CqIconTile size="sm" className="h-10 w-10 rounded-cq-sm sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </CqIconTile>
              <div className="min-w-0">
                <p className="text-[22px] font-bold leading-tight text-cq-ink tabular-nums">
                  {value}
                </p>
                <p className="text-[12px] leading-tight text-cq-muted">{label}</p>
              </div>
            </div>
          </CqPanel>
        ))}
      </div>

      {documents.length === 0 ? (
        /* Empty State */
        <CqEmptyState
          headingId="documents-empty-heading"
          icon={<Shield className="h-6 w-6" />}
          title="No tienes documentos encriptados"
          description="Sube tu primer documento confidencial y genera un QR code seguro para compartirlo."
          action={
            <button type="button" onClick={onUploadClick} className={cqPrimaryButton}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Subir primer documento
            </button>
          }
        />
      ) : (
        /* Documents list — one premium panel, self-padded rows (Magic parity). */
        <CqPanel
          variant="flush"
          visual="magic"
          headingId="documents-list-heading"
          title="Tus documentos"
          actions={
            <span className="text-[12.5px] text-cq-muted tabular-nums">
              {documents.length} {documents.length === 1 ? "documento" : "documentos"}
            </span>
          }
        >
          {/* Mobile / tablet: expandable rows inside the same panel. */}
          <div className="divide-y divide-cq-line lg:hidden">
            {documents.map((doc) => {
              const status = documentStatus(doc);
              const isExpired = doc.expire_at && new Date(doc.expire_at) < new Date();
              const isLimitReached =
                doc.max_downloads && doc.current_downloads >= doc.max_downloads;
              const isLinkActive = status.active;
              const sessionPassword = documentPasswords[doc.id];
              const detailsId = `document-details-${doc.id}`;
              const isExpanded = expandedDocumentIds.has(doc.id);

              return (
                <article key={doc.id} className="min-w-0 p-4 sm:p-5">
                  <button
                    type="button"
                    className="flex min-h-[88px] w-full items-start gap-3 text-left transition-colors hover:bg-cq-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cq-blue rounded-cq-xs"
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    onClick={() => toggleDocumentExpanded(doc.id)}
                  >
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-cq-sm ring-1 ring-cq-line"
                      style={{
                        backgroundColor: getFileTypeQrTheme(
                          normalizeDocumentCategory(doc.file_type),
                        ).accentBackground,
                      }}
                    >
                      <FileTypeIcon fileType={doc.file_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-[15px] font-semibold text-cq-ink">
                          {doc.name}
                        </p>
                        <CqStatusPill tone={status.tone} label={status.label} />
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-cq-muted">
                        {doc.original_filename} •{" "}
                        {EncryptionService.formatFileSize(doc.file_size_bytes)}
                      </p>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-cq-subtle">
                        <CqStatusPill
                          tone={encryptionTone(doc.encryption_level)}
                          label={encryptionLabel(doc.encryption_level)}
                        />
                        <span>
                          {isExpired
                            ? "Expirado"
                            : doc.expire_at
                              ? `Expira ${new Date(doc.expire_at).toLocaleDateString()}`
                              : "Nunca expira"}
                        </span>
                        <span className="tabular-nums">
                          {doc.current_downloads} / {doc.max_downloads || "∞"} descargas
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-cq-subtle transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {isExpanded && (
                    <div
                      id={detailsId}
                      className="mt-4 rounded-cq-md bg-cq-canvas p-4 ring-1 ring-inset ring-cq-line"
                    >
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                        <div>
                          <dt className="text-[11.5px] text-cq-subtle">Seguridad</dt>
                          <dd className="mt-1 font-semibold text-cq-ink">
                            {encryptionLabel(doc.encryption_level)}
                            {doc.two_factor_enabled && (
                              <span className="ml-1 font-medium text-cq-muted">· 2FA</span>
                            )}
                            {doc.password_required && (
                              <span className="ml-1 font-medium text-cq-muted">
                                · Con contraseña
                              </span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] text-cq-subtle">Expiración</dt>
                          <dd
                            className={`mt-1 font-semibold ${isExpired ? "text-red-600" : "text-cq-ink"}`}
                          >
                            {doc.expire_at
                              ? `${new Date(doc.expire_at).toLocaleDateString()} · ${isExpired ? "Expirado" : new Date(doc.expire_at).toLocaleTimeString()}`
                              : "Nunca expira"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] text-cq-subtle">Descargas</dt>
                          <dd
                            className={`mt-1 font-semibold tabular-nums ${isLimitReached ? "text-red-600" : "text-cq-ink"}`}
                          >
                            {doc.current_downloads} / {doc.max_downloads || "∞"}
                            {doc.one_time_download && (
                              <span className="ml-1 font-medium text-cq-muted">· Un solo uso</span>
                            )}
                          </dd>
                        </div>
                        {doc.password_required ? (
                          <div>
                            <dt className="text-[11.5px] text-cq-subtle">Contraseña</dt>
                            <dd className="mt-1 font-semibold text-cq-ink">
                              {sessionPassword
                                ? "Disponible en esta sesión"
                                : "No disponible en esta sesión"}
                            </dd>
                          </div>
                        ) : null}
                        <div className="col-span-2">
                          <dt className="text-[11.5px] text-cq-subtle">Enlace privado</dt>
                          <dd className="mt-1 flex min-w-0 items-center gap-1 truncate font-mono text-[12px] text-cq-muted">
                            <span className="shrink-0">{CANONICAL_PUBLIC_ORIGIN}/d/</span>
                            <span className="min-w-0 truncate font-semibold text-cq-ink">
                              {doc.short_url}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      {/* Grouped actions: share first, destroy last. */}
                      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                        <button
                          type="button"
                          className={rowActionClass}
                          disabled={!isLinkActive}
                          onClick={() => {
                            const url = `${CANONICAL_PUBLIC_ORIGIN}/d/${doc.short_url}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Enlace copiado al portapapeles");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                          Copiar enlace
                        </button>
                        {doc.password_required ? (
                          <button
                            type="button"
                            className={rowActionClass}
                            disabled={!sessionPassword}
                            onClick={() => {
                              if (!sessionPassword) return;
                              navigator.clipboard.writeText(sessionPassword);
                              toast.success("Contraseña copiada al portapapeles");
                            }}
                          >
                            <Key className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                            Copiar contraseña
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={rowActionClass}
                          disabled={!isLinkActive}
                          onClick={() => setSelectedQrDoc(doc)}
                        >
                          <QrCodeIcon className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                          Ver código QR
                        </button>
                        {isLinkActive ? (
                          <a
                            href={`${CANONICAL_PUBLIC_ORIGIN}/d/${doc.short_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`${rowActionClass} no-underline`}
                          >
                            <ExternalLink
                              className="h-3.5 w-3.5 text-cq-muted"
                              aria-hidden="true"
                            />
                            Abrir enlace
                          </a>
                        ) : (
                          <button type="button" className={rowActionClass} disabled>
                            <ExternalLink
                              className="h-3.5 w-3.5 text-cq-muted"
                              aria-hidden="true"
                            />
                            Abrir enlace
                          </button>
                        )}
                        <button
                          type="button"
                          className={deleteActionClass}
                          onClick={() => handleDelete(doc.id, doc.encrypted_file_path)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Eliminar documento
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Desktop: Magic card rows — same real data and actions, far less density. */}
          <ul className="hidden divide-y divide-cq-line lg:block">
            {documents.map((doc) => {
              const status = documentStatus(doc);
              const isExpired = Boolean(doc.expire_at && new Date(doc.expire_at) < new Date());
              const isLimitReached = Boolean(
                doc.max_downloads && doc.current_downloads >= doc.max_downloads,
              );
              const isLinkActive = status.active;
              const sessionPassword = documentPasswords[doc.id];
              const fileTheme = getFileTypeQrTheme(normalizeDocumentCategory(doc.file_type));
              const createdLabel = doc.created_at
                ? new Date(doc.created_at).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : null;

              return (
                <li
                  key={doc.id}
                  className="flex min-w-0 gap-4 px-5 py-5 transition-colors hover:bg-cq-canvas sm:px-6"
                >
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-cq-md ring-1 ring-cq-line"
                    style={{ backgroundColor: fileTheme.accentBackground }}
                  >
                    <FileTypeIcon fileType={doc.file_type} className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-cq-ink">{doc.name}</p>
                        <p className="mt-0.5 truncate text-[12.5px] text-cq-muted">
                          <span className="font-semibold text-cq-ink/70">{fileTheme.label}</span>
                          {" · "}
                          {EncryptionService.formatFileSize(doc.file_size_bytes)}
                          {doc.original_filename && doc.original_filename !== doc.name
                            ? ` · ${doc.original_filename}`
                            : ""}
                          {createdLabel ? ` · Creado el ${createdLabel}` : ""}
                        </p>
                      </div>
                      <CqStatusPill tone={status.tone} label={status.label} />
                    </div>

                    <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-cq-subtle">
                      <CqStatusPill
                        tone={encryptionTone(doc.encryption_level)}
                        label={encryptionLabel(doc.encryption_level)}
                      />
                      <span
                        className={`inline-flex items-center gap-1 ${isExpired ? "font-semibold text-red-600" : ""}`}
                      >
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {isExpired
                          ? "Expirado"
                          : doc.expire_at
                            ? `Expira ${new Date(doc.expire_at).toLocaleDateString()}`
                            : "Nunca expira"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 tabular-nums ${isLimitReached ? "font-semibold text-red-600" : ""}`}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {doc.current_downloads} / {doc.max_downloads || "∞"} descargas
                      </span>
                      {doc.password_required ? (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          {sessionPassword ? "Contraseña disponible" : "Con contraseña"}
                        </span>
                      ) : null}
                      {doc.one_time_download ? <span>Un solo uso</span> : null}
                    </div>

                    <p className="mt-3 flex h-10 min-w-0 items-center gap-1 truncate rounded-cq-sm bg-cq-canvas px-3.5 text-[13px] ring-1 ring-inset ring-cq-line">
                      <span className="shrink-0 text-cq-subtle">{CANONICAL_PUBLIC_ORIGIN}/d/</span>
                      <span className="min-w-0 truncate font-semibold text-cq-ink">
                        {doc.short_url}
                      </span>
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:inline-flex sm:flex-wrap sm:items-center">
                      <button
                        type="button"
                        className={rowActionClass}
                        disabled={!isLinkActive}
                        onClick={() => {
                          const url = `${CANONICAL_PUBLIC_ORIGIN}/d/${doc.short_url}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Enlace copiado al portapapeles");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                        Copiar enlace
                      </button>
                      {doc.password_required ? (
                        <button
                          type="button"
                          className={rowActionClass}
                          disabled={!sessionPassword}
                          onClick={() => {
                            if (!sessionPassword) return;
                            navigator.clipboard.writeText(sessionPassword);
                            toast.success("Contraseña copiada al portapapeles");
                          }}
                        >
                          <Key className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                          Copiar contraseña
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={rowActionClass}
                        disabled={!isLinkActive}
                        onClick={() => setSelectedQrDoc(doc)}
                      >
                        <QrCodeIcon className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                        Ver código QR
                      </button>
                      {isLinkActive ? (
                        <a
                          href={`${CANONICAL_PUBLIC_ORIGIN}/d/${doc.short_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`${rowActionClass} no-underline`}
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                          Abrir enlace
                        </a>
                      ) : (
                        <button type="button" className={rowActionClass} disabled>
                          <ExternalLink className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                          Abrir enlace
                        </button>
                      )}
                      <button
                        type="button"
                        className={deleteActionClass}
                        onClick={() => handleDelete(doc.id, doc.encrypted_file_path)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Eliminar documento
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CqPanel>
      )}

      {/* QR Modal Overlay — presentation migrated; download/copy logic untouched. */}
      {selectedQrDoc ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-cq-ink/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-qr-heading"
        >
          <div className="relative w-full max-w-sm space-y-5 rounded-cq-2xl border border-cq-line bg-white p-6 text-center shadow-float">
            <button
              type="button"
              onClick={() => setSelectedQrDoc(null)}
              className={`${iconControlClass} absolute top-4 right-4`}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h2 id="document-qr-heading" className="truncate text-[17px] font-bold text-cq-ink">
                {selectedQrDoc.name}
              </h2>
              <p className="text-[12.5px] text-cq-muted">Comparte este QR seguro de descarga</p>
            </div>

            <div className="inline-block rounded-cq-lg bg-cq-canvas p-6 ring-1 ring-cq-line">
              <ThemedDocumentQr
                id={`qr-modal-${selectedQrDoc.id}`}
                value={`${CANONICAL_PUBLIC_ORIGIN}/d/${selectedQrDoc.short_url}`}
                size={180}
                fileType={selectedQrDoc.file_type}
              />
            </div>

            <div className="space-y-2 text-left">
              <Input
                readOnly
                value={`${CANONICAL_PUBLIC_ORIGIN}/d/${selectedQrDoc.short_url}`}
                className="h-10 rounded-cq-xs bg-cq-canvas text-center font-mono text-[10px] select-all"
              />
              {/* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02 */}
              {!selectedQrDoc.password_required ? (
                <p className="rounded-cq-xs bg-amber-50 p-2.5 text-left text-[11.5px] leading-relaxed text-amber-800 ring-1 ring-inset ring-amber-200">
                  <span className="font-semibold">Atención:</span> como este documento no tiene
                  contraseña, quien reciba el QR necesitará el enlace original con el fragmento{" "}
                  <code className="font-mono">#key=...</code> para descifrarlo.
                </p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={cqSecondaryButton}
                onClick={() => {
                  downloadSvgElement(
                    `qr-modal-${selectedQrDoc.id}`,
                    `QR_${selectedQrDoc.name}.svg`,
                  );
                  toast.success("Código QR SVG descargado");
                }}
              >
                <Download className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                SVG
              </button>
              <button
                type="button"
                className={cqSecondaryButton}
                onClick={() => {
                  downloadPngFromSvgElement(
                    `qr-modal-${selectedQrDoc.id}`,
                    `QR_${selectedQrDoc.name}.png`,
                  );
                  toast.success("Código QR PNG descargado");
                }}
              >
                <Download className="h-3.5 w-3.5 text-cq-muted" aria-hidden="true" />
                PNG
              </button>
              <button
                type="button"
                className={cqPrimaryButton}
                onClick={() => {
                  const url = `${CANONICAL_PUBLIC_ORIGIN}/d/${selectedQrDoc.short_url}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Enlace copiado");
                  setSelectedQrDoc(null);
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar enlace
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
    const downloadUrl = `${CANONICAL_PUBLIC_ORIGIN}/d/${createdDoc.short_url}${generatedKey ? `#key=${generatedKey}` : ""}`;
    // Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04
    const createdTheme = getFileTypeQrTheme(normalizeDocumentCategory(createdDoc.file_type));

    return (
      <div className="mx-auto max-w-xl space-y-6 rounded-cq-2xl border border-cq-line bg-white p-6 text-center shadow-soft sm:p-8">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-2"
          style={{ backgroundColor: createdTheme.accentBackground }}
        >
          <FileTypeIcon fileType={createdDoc.file_type} className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold">Documento protegido</h2>
        <p className="mx-auto max-w-sm text-[13px] text-cq-muted">
          Tu archivo ha sido cifrado en el navegador y subido de forma segura. Comparte el código QR
          o el enlace corto.
        </p>
        <div className="mx-auto max-w-md rounded-cq-xs bg-cq-canvas p-3 text-left ring-1 ring-inset ring-cq-line">
          <p className="truncate text-sm font-semibold">{createdDoc.original_filename}</p>
          <p className="text-[12.5px] text-cq-muted">
            {createdTheme.label} • {EncryptionService.formatFileSize(createdDoc.file_size_bytes)}
          </p>
        </div>

        {/* QR Code Card */}
        <div
          className="inline-block rounded-cq-lg bg-cq-canvas p-6 ring-1 ring-cq-line"
          style={{ backgroundColor: createdTheme.accentBackground }}
        >
          <ThemedDocumentQr
            id="qr-success-display"
            value={downloadUrl}
            size={200}
            fileType={createdDoc.file_type}
          />
        </div>

        {/* Short URL copy widget */}
        <div className="space-y-2">
          <Label className="text-[12.5px] text-cq-muted">Enlace Seguro de Descarga</Label>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Input
              readOnly
              value={downloadUrl}
              className="h-11 rounded-cq-xs bg-cq-canvas text-center font-mono text-xs select-all ring-1 ring-inset ring-cq-line"
            />
            <button
              type="button"
              className={`${cqIconButton} h-11 w-11 shrink-0`}
              aria-label="Copiar enlace seguro"
              onClick={() => {
                navigator.clipboard.writeText(downloadUrl);
                toast.success("Enlace copiado al portapapeles");
              }}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {createdDoc.password_required && plainPasswordForSession && (
          <div className="space-y-2">
            <Label className="text-[12.5px] text-cq-muted">Contraseña</Label>
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <Input
                readOnly
                type={showPassword ? "text" : "password"}
                value={plainPasswordForSession}
                className="h-11 rounded-cq-xs bg-cq-canvas text-center font-mono text-xs select-all ring-1 ring-inset ring-cq-line"
              />
              <button
                type="button"
                className={`${cqIconButton} h-11 w-11 shrink-0`}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                className={`${cqIconButton} h-11 w-11 shrink-0`}
                aria-label="Copiar contraseña"
                onClick={copyPassword}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12.5px] text-cq-muted">
              {passwordWasGenerated && !passwordCopied ? "Guarda esta contraseña ahora. " : ""}
              Envíala por un canal separado del QR.
            </p>
          </div>
        )}

        {/* Zero-Knowledge warning for no-password files */}
        {/* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02 */}
        {!createdDoc.password_required && (
          <div className="rounded-cq-xs bg-amber-50 p-3.5 text-amber-900 ring-1 ring-inset ring-amber-200 text-xs text-left max-w-md mx-auto space-y-1.5 shadow-sm">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Guarda este enlace ahora
            </p>
            <p className="leading-relaxed text-amber-800">
              Por seguridad (Zero-Knowledge), la clave de descifrado está integrada en el fragmento
              de la URL (`#key=...`) y no se guarda en nuestros servidores. Si cierras esta
              pantalla, no podrás recuperar el acceso al archivo.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            type="button"
            className={`${cqSecondaryButton} flex-1`}
            onClick={() => {
              downloadSvgElement("qr-success-display", `QR_${createdDoc.name}.svg`);
              toast.success("Código QR SVG descargado");
            }}
          >
            <Download className="w-4 h-4" />
            Descargar SVG
          </button>
          <button
            type="button"
            className={`${cqSecondaryButton} flex-1`}
            onClick={() => {
              downloadPngFromSvgElement("qr-success-display", `QR_${createdDoc.name}.png`);
              toast.success("Código QR PNG descargado");
            }}
          >
            <Download className="w-4 h-4" />
            Descargar PNG
          </button>
          <button type="button" className={`${cqPrimaryButton} flex-1`} onClick={onSuccess}>
            Ver mis documentos
          </button>
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
          <CqPanel
            visual="magic"
            title="Subir archivo"
            icon={<Upload className="h-5 w-5 text-cq-blue" />}
          >
            {!file ? (
              <label className="flex h-64 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-cq-2xl border-2 border-dashed border-cq-line bg-cq-canvas p-6 text-center transition-colors hover:border-cq-blue-200 hover:bg-cq-blue-50">
                <span className="grid h-12 w-12 place-items-center rounded-cq-md bg-white text-cq-blue ring-1 ring-cq-line">
                  <Upload className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-[15px] font-semibold text-cq-ink">
                  Arrastra un archivo o haz clic para subirlo
                </p>
                <p className="max-w-[420px] text-[12.5px] leading-relaxed text-cq-muted">
                  Excel, PDF, Word, PowerPoint, imágenes y ZIP. Hasta{" "}
                  {MAX_ENCRYPTED_DOCUMENT_SIZE_LABEL} por archivo.
                </p>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
                />
              </label>
            ) : (
              <div
                className="flex min-w-0 items-center gap-4 rounded-cq-lg p-4 ring-1 ring-inset ring-cq-line"
                style={{ backgroundColor: fileTheme.accentBackground }}
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-cq-md bg-white shadow-soft ring-1 ring-cq-line">
                  <FileTypeIcon fileType={fileTypeInfo?.category || "other"} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{file.name}</p>
                  <p className="text-[13px] text-cq-muted">
                    {fileTypeInfo?.label} • {EncryptionService.formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  className={cqIconButton}
                  onClick={() => setFile(null)}
                  aria-label="Quitar archivo seleccionado"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </CqPanel>

          {/* Basic Info */}
          <CqPanel
            visual="magic"
            title="Información del documento"
            icon={<FileText className="h-5 w-5 text-cq-blue" />}
          >
            <div className="space-y-5">
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
          </CqPanel>
        </div>

        {/* Right Column - Security Settings */}
        <div className="space-y-6">
          {/* Encryption Level */}
          <CqPanel
            visual="magic"
            title="Nivel de seguridad"
            icon={<ShieldCheck className="h-5 w-5 text-cq-blue" />}
          >
            <div className="space-y-3">
              {[
                {
                  value: "standard",
                  icon: Shield,
                  label: "Estándar",
                  description: "AES-256",
                  color: "text-cq-blue",
                },
                {
                  value: "high",
                  icon: Lock,
                  label: "Alto",
                  description: "RSA + AES-256",
                  color: "text-purple-600",
                },
                {
                  value: "maximum",
                  icon: Key,
                  label: "Máximo",
                  description: "RSA + AES + 2FA",
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
                    className={`w-full flex items-center gap-3 p-3 rounded-cq-md border-2 transition-all ${
                      isActive
                        ? "border-cq-blue bg-cq-blue-50 shadow-soft"
                        : "border-cq-line hover:border-cq-blue-200"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${level.color}`} />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{level.label}</p>
                      <p className="text-[12.5px] text-cq-muted">{level.description}</p>
                    </div>
                    {isActive && <CheckCircle2 className="h-5 w-5 text-cq-blue" />}
                  </button>
                );
              })}
            </div>
          </CqPanel>

          {/* Password Protection */}
          <CqPanel
            visual="magic"
            title="Protección con contraseña"
            icon={<Key className="h-5 w-5 text-amber-600" />}
          >
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (opcional pero recomendado)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updatePassword(e.target.value, false)}
                  placeholder="Ingresa una contraseña segura"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={`${cqIconButton} h-10 w-10 shrink-0`}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {formData.password ? (
                  <button
                    type="button"
                    className={`${cqIconButton} h-10 w-10 shrink-0`}
                    aria-label="Copiar contraseña"
                    title="Copiar contraseña"
                    onClick={copyPassword}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className={`${cqSecondaryButton} w-full`}
                onClick={() => updatePassword(generateSecureDocumentPassword(), true)}
              >
                <Key className="w-4 h-4" />
                Generar contraseña segura — recomendado
              </button>
              <p className="text-[12.5px] text-cq-muted">
                La contraseña será requerida para descargar el documento. Compártela por separado
                con el destinatario.
              </p>
            </div>
          </CqPanel>

          {/* Access Control */}
          <CqPanel
            visual="magic"
            title="Control de acceso"
            icon={<Clock className="h-5 w-5 text-cq-blue" />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Descarga única</Label>
                  <p className="text-[12.5px] text-cq-muted">Auto-destruir después de 1 descarga</p>
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
          </CqPanel>

          {/* Submit Button */}
          <button
            type="submit"
            className={`${cqPrimaryButton} w-full`}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Encriptando...
              </>
            ) : (
              <>
                <QrCodeIcon className="w-5 h-5" />
                Crear Documento Seguro
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
