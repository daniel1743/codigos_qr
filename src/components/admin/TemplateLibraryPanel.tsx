/**
 * Template Factory Admin Library - PASS B
 * Private administrative template library with workflow management
 */

import { useState, useEffect, useMemo } from "react";
import {
  Library,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Archive,
  RotateCcw,
  Trash2,
  Sparkles,
  AlertCircle,
  FileText,
  Loader2,
  ChevronRight,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  ArchiveX,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";
import {
  type AdminTemplateRecord,
  type PublicationStatus,
  getAdminTemplates,
  getStatusCounts,
  getTemplateCategories,
  getTemplateIndustries,
  sendToReview,
  approveTemplate,
  rejectTemplate,
  publishTemplate,
  unpublishTemplate,
  archiveTemplate,
  restoreTemplate,
  returnToReview,
  deleteAdminTemplate,
} from "../../services/template-factory-admin.service";

const STATUS_LABELS: Record<PublicationStatus | "all", string> = {
  all: "Todas",
  GENERATED_PRIVATE: "Generadas",
  REVIEW_PENDING: "En revisión",
  APPROVED: "Aprobadas",
  PUBLIC: "Publicadas",
  ARCHIVED: "Archivadas",
  REJECTED: "Rechazadas",
};

const STATUS_COLORS: Record<PublicationStatus, string> = {
  GENERATED_PRIVATE: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  REVIEW_PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/10 text-green-400 border-green-500/30",
  PUBLIC: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  ARCHIVED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<PublicationStatus, React.ReactNode> = {
  GENERATED_PRIVATE: <Sparkles className="h-3 w-3" />,
  REVIEW_PENDING: <Clock className="h-3 w-3" />,
  APPROVED: <CheckCircle2 className="h-3 w-3" />,
  PUBLIC: <Globe className="h-3 w-3" />,
  ARCHIVED: <ArchiveX className="h-3 w-3" />,
  REJECTED: <XCircle className="h-3 w-3" />,
};

export function TemplateLibraryPanel() {
  const [templates, setTemplates] = useState<AdminTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplateRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter, searchTerm]);

  async function loadData() {
    setLoading(true);
    try {
      const filters = {
        status: statusFilter,
        ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
      };

      const [templatesData, counts, cats] = await Promise.all([
        getAdminTemplates(filters),
        getStatusCounts(),
        getTemplateCategories(),
      ]);

      setTemplates(templatesData);
      setStatusCounts(counts);
      setCategories(cats);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    action: string,
    templateId: string,
    templateName: string
  ) {
    if (actionInProgress) return;

    setActionInProgress(true);
    try {
      switch (action) {
        case "sendToReview":
          await sendToReview(templateId);
          toast.success(`"${templateName}" enviada a revisión`);
          break;
        case "approve":
          await approveTemplate(templateId);
          toast.success(`"${templateName}" aprobada`);
          break;
        case "reject":
          await rejectTemplate(templateId);
          toast.success(`"${templateName}" rechazada`);
          break;
        case "publish":
          await publishTemplate(templateId);
          toast.success(`"${templateName}" publicada`);
          break;
        case "unpublish":
          await unpublishTemplate(templateId);
          toast.success(`"${templateName}" despublicada`);
          break;
        case "archive":
          await archiveTemplate(templateId);
          toast.success(`"${templateName}" archivada`);
          break;
        case "restore":
          await restoreTemplate(templateId);
          toast.success(`"${templateName}" restaurada`);
          break;
        case "returnToReview":
          await returnToReview(templateId);
          toast.success(`"${templateName}" devuelta a revisión`);
          break;
      }

      await loadData();
      if (selectedTemplate?.id === templateId) {
        const updated = await getAdminTemplates({ status: "all" });
        setSelectedTemplate(updated.find((t) => t.id === templateId) || null);
      }
    } catch (error: any) {
      console.error("Error performing action:", error);
      toast.error(error.message || "Error al realizar acción");
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleDelete() {
    if (!templateToDelete || actionInProgress) return;

    setActionInProgress(true);
    try {
      await deleteAdminTemplate(templateToDelete);
      toast.success("Plantilla eliminada");
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
      await loadData();
      if (selectedTemplate?.id === templateToDelete) {
        setSelectedTemplate(null);
        setPreviewOpen(false);
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error al eliminar plantilla");
    } finally {
      setActionInProgress(false);
    }
  }

  function getAvailableActions(status: PublicationStatus): string[] {
    const actions: Record<PublicationStatus, string[]> = {
      GENERATED_PRIVATE: ["sendToReview", "archive"],
      REVIEW_PENDING: ["approve", "reject", "archive"],
      APPROVED: ["publish", "returnToReview", "archive"],
      PUBLIC: ["unpublish", "archive"],
      REJECTED: ["returnToReview", "archive"],
      ARCHIVED: ["restore"],
    };

    return actions[status] || [];
  }

  const filteredTemplates = useMemo(() => {
    return templates;
  }, [templates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-background p-8">
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Biblioteca de Plantillas</h2>
              <p className="text-sm text-muted-foreground">
                Gestión administrativa del Template Factory
              </p>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-5">
          <Library className="h-full w-full" />
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
        {(
          [
            "all",
            "GENERATED_PRIVATE",
            "REVIEW_PENDING",
            "APPROVED",
            "PUBLIC",
            "ARCHIVED",
            "REJECTED",
          ] as const
        ).map((status) => {
          const count = statusCounts[status] || 0;
          const isActive = statusFilter === status;

          return (
            <Card
              key={status}
              className={`cursor-pointer transition-colors ${
                isActive ? "border-purple-500 bg-purple-500/5" : "hover:bg-accent"
              }`}
              onClick={() => setStatusFilter(status)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  {status !== "all" && STATUS_ICONS[status]}
                  {STATUS_LABELS[status]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, categoría, industria o batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Plantillas{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredTemplates.length})
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No se encontraron plantillas con los filtros aplicados
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setPreviewOpen(true);
                  }}
                >
                  <div className="relative aspect-[9/16] overflow-hidden bg-muted">
                    {template.preview_image ? (
                      <img
                        src={template.preview_image}
                        alt={template.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    <div className="absolute left-2 top-2">
                      <Badge
                        className={`gap-1 border ${
                          STATUS_COLORS[template.publication_status]
                        }`}
                      >
                        {STATUS_ICONS[template.publication_status]}
                        {STATUS_LABELS[template.publication_status]}
                      </Badge>
                    </div>

                    {template.batch_id && (
                      <div className="absolute right-2 top-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.batch_id}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="mb-2 truncate font-semibold">{template.name}</h3>
                    <div className="flex flex-wrap gap-1">
                      {template.category && (
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      )}
                      {template.industry && (
                        <Badge variant="outline" className="text-xs">
                          {template.industry}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview/Detail Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate?.name}
              {selectedTemplate && (
                <Badge
                  className={`gap-1 border ${
                    STATUS_COLORS[selectedTemplate.publication_status]
                  }`}
                >
                  {STATUS_ICONS[selectedTemplate.publication_status]}
                  {STATUS_LABELS[selectedTemplate.publication_status]}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || "Sin descripción"}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex justify-center rounded-lg bg-muted p-4">
                {selectedTemplate.preview_image ? (
                  <img
                    src={selectedTemplate.preview_image}
                    alt={selectedTemplate.name}
                    className="max-h-96 rounded-lg border"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoría:</span>
                  <span>{selectedTemplate.category || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industria:</span>
                  <span>{selectedTemplate.industry || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tema:</span>
                  <span>{selectedTemplate.theme || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schema Version:</span>
                  <span>{selectedTemplate.schema_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fuente:</span>
                  <span>{selectedTemplate.generation_source}</span>
                </div>
                {selectedTemplate.batch_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batch:</span>
                    <span className="font-mono text-xs">{selectedTemplate.batch_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validación:</span>
                  <Badge
                    variant={
                      selectedTemplate.validation_status === "valid"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {selectedTemplate.validation_status}
                  </Badge>
                </div>
                {selectedTemplate.qa_score != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">QA Score:</span>
                    <span>{(selectedTemplate.qa_score * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usos:</span>
                  <span>{selectedTemplate.usage_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creada:</span>
                  <span>{new Date(selectedTemplate.created_at).toLocaleDateString()}</span>
                </div>
                {selectedTemplate.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aprobada:</span>
                    <span>{new Date(selectedTemplate.approved_at).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedTemplate.published_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Publicada:</span>
                    <span>{new Date(selectedTemplate.published_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <DialogFooter className="flex flex-wrap gap-2">
                {getAvailableActions(selectedTemplate.publication_status).map((action) => {
                  const actionConfig: Record<
                    string,
                    { label: string; icon: React.ReactNode; variant?: any }
                  > = {
                    sendToReview: {
                      label: "Enviar a Revisión",
                      icon: <ChevronRight className="h-4 w-4" />,
                    },
                    approve: {
                      label: "Aprobar",
                      icon: <Check className="h-4 w-4" />,
                      variant: "default",
                    },
                    reject: {
                      label: "Rechazar",
                      icon: <X className="h-4 w-4" />,
                      variant: "destructive",
                    },
                    publish: {
                      label: "Publicar",
                      icon: <Globe className="h-4 w-4" />,
                      variant: "default",
                    },
                    unpublish: {
                      label: "Despublicar",
                      icon: <Globe className="h-4 w-4" />,
                      variant: "outline",
                    },
                    archive: {
                      label: "Archivar",
                      icon: <Archive className="h-4 w-4" />,
                      variant: "outline",
                    },
                    restore: {
                      label: "Restaurar",
                      icon: <RotateCcw className="h-4 w-4" />,
                      variant: "default",
                    },
                    returnToReview: {
                      label: "Devolver a Revisión",
                      icon: <RotateCcw className="h-4 w-4" />,
                      variant: "outline",
                    },
                  };

                  const config = actionConfig[action];
                  if (!config) return null;

                  return (
                    <Button
                      key={action}
                      variant={config.variant || "outline"}
                      size="sm"
                      disabled={actionInProgress}
                      onClick={() =>
                        handleAction(action, selectedTemplate.id, selectedTemplate.name)
                      }
                    >
                      {actionInProgress ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        config.icon
                      )}
                      {config.label}
                    </Button>
                  );
                })}

                <Button
                  variant="destructive"
                  size="sm"
                  disabled={actionInProgress}
                  onClick={() => {
                    setTemplateToDelete(selectedTemplate.id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar plantilla?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La plantilla será eliminada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={actionInProgress}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
