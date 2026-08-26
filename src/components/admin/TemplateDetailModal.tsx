import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { AdminTemplateRecord } from "../../services/template-factory-admin.service";
import { Smartphone, Monitor, Info, Code, ShieldAlert, Check } from "lucide-react";
import { CleanTemplatePreview } from "./CleanTemplatePreview";

interface TemplateDetailModalProps {
  template: AdminTemplateRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDetailModal({ template, open, onOpenChange }: TemplateDetailModalProps) {
  const [deviceMode, setDeviceMode] = useState<"mobile" | "desktop">("mobile");

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {template.name || ("Template " + template.id.slice(0, 8))}
            </DialogTitle>
            <Badge variant="outline" className="font-mono">{template.id}</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Clean Preview — same renderer as production */}
          <div className="flex-1 bg-muted/20 border-r flex flex-col relative">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background border shadow-sm rounded-full p-1 flex items-center z-10 gap-1">
              <button
                onClick={() => setDeviceMode("mobile")}
                className={"p-2 rounded-full transition-colors " + (deviceMode === "mobile" ? "bg-secondary" : "hover:bg-secondary/50")}
                title="Vista Movil"
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceMode("desktop")}
                className={"p-2 rounded-full transition-colors " + (deviceMode === "desktop" ? "bg-secondary" : "hover:bg-secondary/50")}
                title="Vista Desktop"
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden p-4 pt-16 bg-gray-50 dark:bg-gray-950">
              <CleanTemplatePreview
                config={template.config_json}
                deviceMode={deviceMode}
              />
            </div>
          </div>

          {/* Right panel: Data & Metadata */}
          <div className="w-[400px] flex flex-col bg-background">
            <Tabs defaultValue="metadata" className="flex-1 flex flex-col">
              <div className="p-4 border-b shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="metadata" className="flex-1 gap-2"><Info className="h-4 w-4"/> Detalles</TabsTrigger>
                  <TabsTrigger value="qa" className="flex-1 gap-2"><ShieldAlert className="h-4 w-4"/> QA</TabsTrigger>
                  <TabsTrigger value="json" className="flex-1 gap-2"><Code className="h-4 w-4"/> Config</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto p-6 text-sm">
                <TabsContent value="metadata" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div className="text-muted-foreground">Estado</div>
                    <div><Badge>{template.publication_status}</Badge></div>
                    
                    <div className="text-muted-foreground">Industria</div>
                    <div className="font-medium capitalize">{template.industry || "-"}</div>
                    
                    <div className="text-muted-foreground">Categora</div>
                    <div>{template.category || "-"}</div>
                    
                    <div className="text-muted-foreground">Batch ID</div>
                    <div className="font-mono text-xs">{template.batch_id || "-"}</div>
                    
                    <div className="text-muted-foreground">Fuente (Gen)</div>
                    <div>{template.generation_source}</div>
                    
                    <div className="text-muted-foreground">Versin Gen</div>
                    <div className="font-mono">{template.generator_version || "-"}</div>
                    
                    <div className="text-muted-foreground">Receta</div>
                    <div>{template.config_json?.recipe || "-"}</div>
                    
                    <div className="text-muted-foreground">Paleta</div>
                    <div className="flex items-center gap-2">
                      {template.config_json?.paletteId || template.config_json?.palette || "-"}
                      {(template.config_json?.paletteTokens?.background || template.config_json?.tokens?.background) && (
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{
                            background:
                              template.config_json?.paletteTokens?.background ||
                              template.config_json.tokens.background,
                          }}
                        />
                      )}
                    </div>
                    
                    <div className="text-muted-foreground">Semilla</div>
                    <div className="font-mono text-xs truncate" title={template.config_json?.seed}>
                      {template.config_json?.seed || "-"}
                    </div>

                    <div className="text-muted-foreground">Creada</div>
                    <div>{new Date(template.created_at).toLocaleString()}</div>
                  </div>
                </TabsContent>

                <TabsContent value="qa" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Evaluacin de Calidad</h3>
                    <Badge variant={template.qa_score && template.qa_score >= 0.85 ? "default" : "destructive"}>
                      Score: {((template.qa_score || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  {template.qa_findings && template.qa_findings.length > 0 ? (
                    <div className="space-y-2">
                      {template.qa_findings.map((finding: any, idx: number) => (
                        <div key={idx} className={"p-3 rounded-md border text-xs " + (finding.severity === 'error' ? 'bg-red-50/50 border-red-200 text-red-900 dark:bg-red-900/20 dark:text-red-200' : 'bg-yellow-50/50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200')}>
                          <strong>{finding.rule || 'Hallazgo'}:</strong> {finding.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/10">
                      <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>Sin hallazgos de QA. La plantilla es perfecta.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="json" className="mt-0">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto font-mono text-muted-foreground max-h-[600px]">
                    {JSON.stringify(template.config_json, null, 2)}
                  </pre>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
