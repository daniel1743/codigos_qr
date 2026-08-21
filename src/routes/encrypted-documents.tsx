import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  Fingerprint,
} from "lucide-react";
import { toast } from "sonner";
import { EncryptionService } from "../lib/encryption";
import type { EncryptionLevel, CreateEncryptedDocumentRequest } from "../types/encrypted-documents";

export const Route = createFileRoute("/encrypted-documents")({
  component: EncryptedDocumentsPage,
});

function EncryptedDocumentsPage() {
  const supabase = getBrowserSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check session
  useState(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  });

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
              Comparte archivos confidenciales con encriptación de nivel militar
            </p>
          </div>
          <Auth />
        </div>
      </div>
    );
  }

  return <EncryptedDocumentsApp userId={session.user.id} />;
}

function EncryptedDocumentsApp({ userId }: { userId: string }) {
  const [view, setView] = useState<"list" | "create">("list");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Volver al inicio
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
        {view === "list" ? <DocumentsList userId={userId} /> : <CreateDocument userId={userId} />}
      </main>
    </div>
  );
}

function DocumentsList({ userId }: { userId: string }) {
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
              <p className="text-2xl font-bold">0</p>
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
              <p className="text-2xl font-bold">0</p>
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
              <p className="text-2xl font-bold">0</p>
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
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Intentos Bloqueados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 mb-6">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No tienes documentos encriptados</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Sube tu primer documento confidencial y genera un QR code seguro para compartirlo.
        </p>
        <Button size="lg" className="gap-2">
          <Upload className="w-5 h-5" />
          Subir Primer Documento
        </Button>
      </div>
    </div>
  );
}

function CreateDocument({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<CreateEncryptedDocumentRequest>>({
    name: "",
    description: "",
    encryption_level: "standard",
    password: "",
    two_factor_enabled: false,
    one_time_download: false,
    expire_hours: undefined,
    max_downloads: undefined,
  });
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.name) {
        setFormData((prev) => ({ ...prev, name: selectedFile.name }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setUploading(true);
    try {
      // Encrypt file
      const encrypted = await EncryptionService.encryptFile(file, formData.password);

      // TODO: Upload to Supabase Storage
      // TODO: Create database record
      // TODO: Generate QR code

      toast.success("Documento encriptado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al encriptar el documento");
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
                    Excel, PDF, Word, Imágenes, ZIP (Max 100MB)
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
          {/* Encryption Level */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${level.color}`} />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                    {isActive && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
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
                    Auto-destruir después de 1 descarga
                  </p>
                </div>
                <Switch
                  checked={formData.one_time_download}
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
                      expire_hours: value === "never" ? undefined : parseInt(value),
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
                      max_downloads: value === "unlimited" ? undefined : parseInt(value),
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
