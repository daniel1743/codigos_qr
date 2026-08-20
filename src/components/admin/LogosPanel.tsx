import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  ImageIcon,
  Plus,
  Trash2,
  Upload,
  Edit,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import { demoLogoService } from "../../services/demoLogoService";
import type { DemoLogo, DemoLogoCategory } from "../../types/demo-logo";

const CATEGORIES = [
  { value: "business", label: "Negocios" },
  { value: "food", label: "Comida" },
  { value: "beauty", label: "Belleza" },
  { value: "tech", label: "Tecnología" },
  { value: "creative", label: "Creativos" },
];

export function LogosPanel() {
  const [logos, setLogos] = useState<DemoLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<DemoLogo | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DemoLogoCategory>("business");
  const [tier, setTier] = useState<"free" | "premium">("premium");
  const [file, setFile] = useState<File | null>(null);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    loadLogos();
  }, []);

  const loadLogos = async () => {
    setLoading(true);
    try {
      const data = await demoLogoService.getAllLogos(supabase);
      setLogos(data);
    } catch (error) {
      console.error("Error loading logos:", error);
      toast.error("Error al cargar logos");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!name.trim()) {
      toast.error("Ingresa un nombre para el logo");
      return;
    }

    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/svg+xml", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos SVG, PNG, JPG o WEBP");
      return;
    }

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileUrl = await demoLogoService.uploadLogoFile(supabase, file, category);

      // Create logo entry
      await demoLogoService.createLogo(supabase, {
        name,
        category,
        file_url: fileUrl,
        preview_url: fileUrl, // Same URL for now
        tier,
      });

      toast.success("Logo subido exitosamente");
      setUploadDialogOpen(false);
      resetForm();
      loadLogos();
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Error al subir logo");
    } finally {
      setUploading(false);
    }
  };

  const handleEditLogo = async () => {
    if (!selectedLogo) return;

    if (!name.trim()) {
      toast.error("Ingresa un nombre para el logo");
      return;
    }

    try {
      await demoLogoService.updateLogo(supabase, selectedLogo.id, {
        name,
        category,
        tier,
      });

      toast.success("Logo actualizado");
      setEditDialogOpen(false);
      setSelectedLogo(null);
      resetForm();
      loadLogos();
    } catch (error) {
      console.error("Error updating logo:", error);
      toast.error("Error al actualizar logo");
    }
  };

  const handleDeleteLogo = async (id: string, logoName: string) => {
    if (!confirm(`¿Eliminar logo "${logoName}"?`)) return;

    try {
      await demoLogoService.deleteLogo(supabase, id);
      toast.success("Logo eliminado");
      loadLogos();
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast.error("Error al eliminar logo");
    }
  };

  const openEditDialog = (logo: DemoLogo) => {
    setSelectedLogo(logo);
    setName(logo.name);
    setCategory(logo.category);
    setTier(logo.tier);
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setName("");
    setCategory("business");
    setTier("premium");
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando logos...</p>
        </CardContent>
      </Card>
    );
  }

  const logosByCategory = logos.reduce((acc, logo) => {
    if (!acc[logo.category]) {
      acc[logo.category] = [];
    }
    acc[logo.category].push(logo);
    return acc;
  }, {} as Record<string, DemoLogo[]>);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-500" />
                Biblioteca de Logos Demo
              </CardTitle>
              <CardDescription>
                {logos.length} logo{logos.length !== 1 ? "s" : ""} disponible
                {logos.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4" />
              Subir Logo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay logos en la biblioteca
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map((cat) => {
                const categoryLogos = logosByCategory[cat.value] || [];
                if (categoryLogos.length === 0) return null;

                return (
                  <div key={cat.value} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat.label} ({categoryLogos.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {categoryLogos.map((logo) => (
                        <div
                          key={logo.id}
                          className="group relative rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md"
                        >
                          <div className="aspect-square overflow-hidden rounded-md bg-white p-3">
                            <img
                              src={logo.preview_url}
                              alt={logo.name}
                              className="h-full w-full object-contain"
                            />
                          </div>

                          <div className="mt-2 space-y-1">
                            <p className="text-sm font-medium truncate">{logo.name}</p>
                            <Badge
                              variant={logo.tier === "premium" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {logo.tier}
                            </Badge>
                          </div>

                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(logo.file_url, "_blank")}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(logo)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteLogo(logo.id, logo.name)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Logo Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-purple-500" />
              Subir Nuevo Logo
            </DialogTitle>
            <DialogDescription>
              Agrega un nuevo logo a la biblioteca Premium
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Logo</Label>
              <Input
                id="name"
                placeholder="Ej: Briefcase"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Acceso</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratis</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Archivo</Label>
              <Input
                id="file"
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                SVG recomendado. También PNG, JPG o WEBP (max 2MB)
              </p>
            </div>

            {file && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setUploadDialogOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleUploadLogo}
                disabled={uploading}
              >
                {uploading ? "Subiendo..." : "Subir Logo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Logo Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-500" />
              Editar Logo
            </DialogTitle>
            <DialogDescription>
              Actualiza la información del logo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Nombre del Logo</Label>
              <Input
                id="edit_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_category">Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_tier">Acceso</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratis</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedLogo(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleEditLogo}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
