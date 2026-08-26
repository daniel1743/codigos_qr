/**
 * Template Factory Admin Library - PASS B
 * Private administrative template library with workflow management
 */

import { useState, useEffect } from "react";
import {
  Library,
  Search,
  Check,
  X,
  Archive,
  Download,
  RotateCcw,
  Trash2,
  Sparkles,
  Loader2,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  ArchiveX,
  ChevronRight,
  LayoutGrid,
  Maximize2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
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
  type AdminBatchSummary,
  type PublicationStatus,
  archiveBatch,
  getAdminTemplates,
  getTemplateBatchSummaries,
  getStatusCounts,
  getTemplateCategories,
  getTemplateIndustries,
  getTemplateBatches,
  sendToReviewBulk,
  approveTemplatesBulk,
  rejectTemplatesBulk,
  archiveTemplatesBulk,
  publishTemplatesBulk,
} from "../../services/template-factory-admin.service";
import { TemplateDetailModal } from "./TemplateDetailModal";

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
  
  // View states
  const [viewMode, setViewMode] = useState<"grid" | "large">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Metadata options
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [batchSummaries, setBatchSummaries] = useState<AdminBatchSummary[]>([]);
  
  // Modal states
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplateRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Bulk Publish explicit confirmation
  const [bulkPublishConfirmOpen, setBulkPublishConfirmOpen] = useState(false);
  const [batchToArchive, setBatchToArchive] = useState<AdminBatchSummary | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter, industryFilter, batchFilter, sortBy, searchTerm]);

  async function loadData() {
    setLoading(true);
    try {
      const filters = {
        status: statusFilter,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        industry: industryFilter !== "all" ? industryFilter : undefined,
        batch_id: batchFilter !== "all" ? batchFilter : undefined,
        search: searchTerm || undefined,
        sortBy: sortBy as any,
        sortOrder: "desc" as const,
      };

      const [templatesData, counts, cats, inds, bats, batchData] = await Promise.all([
        getAdminTemplates(filters),
        getStatusCounts(),
        getTemplateCategories(),
        getTemplateIndustries(),
        getTemplateBatches(),
        getTemplateBatchSummaries()
      ]);

      setTemplates(templatesData);
      setStatusCounts(counts);
      setCategories(cats);
      setIndustries(inds);
      setBatches(bats);
      setBatchSummaries(batchData);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(templates.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleInspectBatch = (batchId: string) => {
    setBatchFilter(batchId);
    setStatusFilter("all");
  };

  const handleArchiveBatch = async () => {
    if (!batchToArchive || actionInProgress) return;
    setActionInProgress(true);
    try {
      await archiveBatch(batchToArchive.id);
      toast.success("Batch archivado: " + batchToArchive.id);
      setBatchToArchive(null);
      await loadData();
    } catch (error) {
      console.error("Batch archive failed", error);
      toast.error("Fallo al archivar el batch.");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleExportBatchManifest = async (batch: AdminBatchSummary) => {
    try {
      const batchTemplates = await getAdminTemplates({
        status: "all",
        batch_id: batch.id,
        sortBy: "created_at",
        sortOrder: "asc",
      });
      const manifest = {
        batch,
        templates: batchTemplates.map((template) => ({
          id: template.id,
          name: template.name,
          industry: template.industry,
          publication_status: template.publication_status,
          qa_score: template.qa_score,
          generator_version: template.generator_version,
          created_at: template.created_at,
        })),
      };
      const blob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = batch.id + "-manifest.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Batch manifest export failed", error);
      toast.error("No se pudo exportar el manifest.");
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleBulkAction = async (action: "approve" | "review" | "reject" | "archive" | "publish") => {
    if (selectedIds.size === 0 || actionInProgress) return;
    
    if (action === "publish" && !bulkPublishConfirmOpen) {
      setBulkPublishConfirmOpen(true);
      return;
    }

    setActionInProgress(true);
    const ids = Array.from(selectedIds);
    try {
      if (action === "approve") await approveTemplatesBulk(ids);
      else if (action === "review") await sendToReviewBulk(ids);
      else if (action === "reject") await rejectTemplatesBulk(ids);
      else if (action === "archive") await archiveTemplatesBulk(ids);
      if (action === "publish") {
        await publishTemplatesBulk(ids);
        setBulkPublishConfirmOpen(false);
      }
      
      toast.success("Accin " + action + " completada en " + ids.length + " plantillas.");
      await loadData();
    } catch (error) {
      console.error("Bulk action failed", error);
      toast.error("Fallo al ejecutar la accin.");
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Center</h2>
          <p className="text-muted-foreground">
            Control de calidad y publicacin (Total: {statusCounts.all || 0})
          </p>
        </div>
        
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={viewMode === "grid" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "large" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("large")}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Filtros Avanzados</CardTitle>
              <CardDescription>Explora los resultados generados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID, nombre..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ({statusCounts.all || 0})</SelectItem>
                  <SelectItem value="GENERATED_PRIVATE">Generadas ({statusCounts.GENERATED_PRIVATE || 0})</SelectItem>
                  <SelectItem value="REVIEW_PENDING">En Revisin ({statusCounts.REVIEW_PENDING || 0})</SelectItem>
                  <SelectItem value="APPROVED">Aprobadas ({statusCounts.APPROVED || 0})</SelectItem>
                  <SelectItem value="PUBLIC">Publicadas ({statusCounts.PUBLIC || 0})</SelectItem>
                  <SelectItem value="REJECTED">Rechazadas ({statusCounts.REJECTED || 0})</SelectItem>
                  <SelectItem value="ARCHIVED">Archivadas ({statusCounts.ARCHIVED || 0})</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Industria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Industrias</SelectItem>
                  {industries.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Batches</SelectItem>
                  {batches.map(b => <SelectItem key={b} value={b} className="font-mono text-xs">{b.slice(0, 8)}...</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Ms recientes</SelectItem>
                  <SelectItem value="qa_score">QA Score</SelectItem>
                  <SelectItem value="industry">Industria</SelectItem>
                  <SelectItem value="batch_id">Lote (Batch)</SelectItem>
                </SelectContent>
              </Select>
            </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestin de Batches</CardTitle>
              <CardDescription>Inspecciona lotes, filtra plantillas, archiva batches y exporta manifests.</CardDescription>
            </CardHeader>
            <CardContent>
              {batchSummaries.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay batches registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-2 font-medium">ID</th>
                        <th className="p-2 font-medium">Fecha</th>
                        <th className="p-2 font-medium">Industrias</th>
                        <th className="p-2 font-medium text-right">Solic.</th>
                        <th className="p-2 font-medium text-right">Gen.</th>
                        <th className="p-2 font-medium text-right">Fall.</th>
                        <th className="p-2 font-medium text-right">Aprob.</th>
                        <th className="p-2 font-medium text-right">Rech.</th>
                        <th className="p-2 font-medium text-right">Publ.</th>
                        <th className="p-2 font-medium text-right">QA</th>
                        <th className="p-2 font-medium">Versin</th>
                        <th className="p-2 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchSummaries.map((batch) => (
                        <tr key={batch.id} className="border-b">
                          <td className="max-w-[180px] truncate p-2 font-mono text-xs" title={batch.id}>{batch.id}</td>
                          <td className="p-2">{new Date(batch.generationDate).toLocaleDateString()}</td>
                          <td className="max-w-[220px] truncate p-2 capitalize" title={batch.industries.join(", ")}>{batch.industries.join(", ")}</td>
                          <td className="p-2 text-right">{batch.requestedQuantity}</td>
                          <td className="p-2 text-right">{batch.generated}</td>
                          <td className="p-2 text-right">{batch.failed}</td>
                          <td className="p-2 text-right">{batch.approved}</td>
                          <td className="p-2 text-right">{batch.rejected}</td>
                          <td className="p-2 text-right">{batch.published}</td>
                          <td className="p-2 text-right">{batch.averageQaScore == null ? "-" : Math.round(batch.averageQaScore * 100) + "%"}</td>
                          <td className="p-2 font-mono text-xs">{batch.generatorVersion}</td>
                          <td className="p-2">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleInspectBatch(batch.id)}>
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleInspectBatch(batch.id)}>
                                <Search className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setBatchToArchive(batch)}>
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleExportBatchManifest(batch)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary text-primary-foreground p-3 rounded-lg flex items-center justify-between sticky top-4 z-10 shadow-lg">
          <div className="font-medium px-2">
            {selectedIds.size} plantillas seleccionadas
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction("review")}>
              <Clock className="h-4 w-4 mr-2" /> A Revisin
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction("approve")}>
              <Check className="h-4 w-4 mr-2" /> Aprobar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction("reject")}>
              <X className="h-4 w-4 mr-2" /> Rechazar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction("archive")}>
              <Archive className="h-4 w-4 mr-2" /> Archivar
            </Button>
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white ml-4"
              onClick={() => handleBulkAction("publish")}
            >
              <Globe className="h-4 w-4 mr-2" /> Publicar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground bg-muted/20">
          <Library className="h-12 w-12 mb-4 opacity-50" />
          <p>No se encontraron plantillas</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Checkbox 
              checked={selectedIds.size === templates.length && templates.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">Seleccionar todas</span>
          </div>
          
          <div className={"grid gap-4 " + (viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2")}>
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className={"overflow-hidden transition-all " + (selectedIds.has(template.id) ? "ring-2 ring-primary" : "")}
              >
                <div className="p-3 border-b flex items-center gap-2 bg-muted/20">
                  <Checkbox 
                    checked={selectedIds.has(template.id)}
                    onCheckedChange={(c) => handleSelect(template.id, !!c)}
                  />
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {STATUS_ICONS[template.publication_status]}
                    <span className="ml-1">{template.publication_status.replace("_", " ")}</span>
                  </Badge>
                </div>
                
                <div
                  className={"relative bg-muted/10 p-3 " + (viewMode === "grid" ? "h-56" : "h-80")}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setPreviewOpen(true);
                  }}
                >
                  <CleanTemplatePreview
                    config={template.config_json}
                    deviceMode="mobile"
                    className="cursor-pointer"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-3 top-3 h-8 w-8 shadow"
                    title="Abrir preview detallado"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold truncate">{template.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{template.industry || "General"}  {template.config_json?.recipe}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted p-2 rounded flex flex-col">
                      <span className="text-muted-foreground">QA Score</span>
                      <span className="font-medium text-sm text-green-600">{((template.qa_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-muted p-2 rounded flex flex-col">
                      <span className="text-muted-foreground">Paleta</span>
                      <span className="font-medium truncate">{template.config_json?.paletteId || template.config_json?.palette || "-"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <TemplateDetailModal 
        template={selectedTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <Dialog open={bulkPublishConfirmOpen} onOpenChange={setBulkPublishConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Publicacin Masiva</DialogTitle>
            <DialogDescription>
              Est a punto de publicar {selectedIds.size} plantillas. Estas plantillas sern visibles de inmediato para todos los usuarios finales en el Template Builder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPublishConfirmOpen(false)} disabled={actionInProgress}>
              Cancelar
            </Button>
            <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleBulkAction("publish")} disabled={actionInProgress}>
              {actionInProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
              S, publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!batchToArchive} onOpenChange={(open) => !open && setBatchToArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar batch</DialogTitle>
            <DialogDescription>
              Esta accin archivar todas las plantillas del batch seleccionado. No publica ni aprueba plantillas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchToArchive(null)} disabled={actionInProgress}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleArchiveBatch} disabled={actionInProgress}>
              {actionInProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
              Archivar batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
