import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  Ticket,
  Plus,
  Copy,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Sparkles,
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
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface InvitationCode {
  id: string;
  code: string;
  max_uses: number;
  current_uses: number;
  tier: string;
  duration_days: number | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function InvitationCodesPanel() {
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [maxUses, setMaxUses] = useState("1");
  const [tier, setTier] = useState<"premium" | "premium_pro">("premium");
  const [durationDays, setDurationDays] = useState("");
  const [codeExpiresDays, setCodeExpiresDays] = useState("");

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invitation_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCodes(data || []);
    } catch (error) {
      console.error("Error loading codes:", error);
      toast.error("Error al cargar códigos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!maxUses || parseInt(maxUses) < 1) {
      toast.error("Ingresa un número válido de usos");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Generate code
      const { data: codeData, error: codeError } = await supabase.rpc(
        "generate_invitation_code"
      );

      if (codeError) throw codeError;

      // Calculate code expiration
      let codeExpiresAt = null;
      if (codeExpiresDays && parseInt(codeExpiresDays) > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + parseInt(codeExpiresDays));
        codeExpiresAt = expDate.toISOString();
      }

      // Insert code
      const { error } = await supabase.from("invitation_codes").insert({
        code: codeData,
        max_uses: parseInt(maxUses),
        tier,
        duration_days: durationDays ? parseInt(durationDays) : null,
        expires_at: codeExpiresAt,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success(`Código creado: ${codeData}`);
      setCreateDialogOpen(false);
      setMaxUses("1");
      setDurationDays("");
      setCodeExpiresDays("");
      loadCodes();
    } catch (error: any) {
      console.error("Error creating code:", error);
      toast.error("Error al crear código");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado al portapapeles");
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("invitation_codes")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentActive ? "Código desactivado" : "Código activado");
      loadCodes();
    } catch (error) {
      console.error("Error toggling code:", error);
      toast.error("Error al actualizar código");
    }
  };

  const isCodeExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isCodeExhausted = (code: InvitationCode) => {
    return code.current_uses >= code.max_uses;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando códigos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-blue-500" />
                Códigos de Invitación
              </CardTitle>
              <CardDescription>
                {codes.length} código{codes.length !== 1 ? "s" : ""} creado
                {codes.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              <Plus className="h-4 w-4" />
              Crear Código
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {codes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay códigos de invitación creados
              </div>
            ) : (
              codes.map((code) => {
                const expired = isCodeExpired(code.expires_at);
                const exhausted = isCodeExhausted(code);
                const isInactive = !code.is_active || expired || exhausted;

                return (
                  <div
                    key={code.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      isInactive ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-sm font-mono font-semibold">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyCode(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Badge
                          variant="outline"
                          className={
                            code.is_active && !expired && !exhausted
                              ? "border-green-500 text-green-600"
                              : "border-gray-400 text-gray-600"
                          }
                        >
                          {code.is_active && !expired && !exhausted ? (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-3 w-3" />
                              Inactivo
                            </>
                          )}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {code.tier}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {code.current_uses}/{code.max_uses} usos
                        </span>
                        {code.duration_days && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {code.duration_days} días de Premium
                          </span>
                        )}
                        {!code.duration_days && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Sparkles className="h-3 w-3" />
                            Premium permanente
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Creado{" "}
                          {formatDistanceToNow(new Date(code.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                        {code.expires_at && (
                          <span className={expired ? "text-red-600" : ""}>
                            {expired ? "Expiró" : "Expira"}{" "}
                            {formatDistanceToNow(new Date(code.expires_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                        )}
                        {exhausted && (
                          <span className="text-red-600 font-medium">Agotado</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={code.is_active}
                        onCheckedChange={() => handleToggleActive(code.id, code.is_active)}
                        disabled={expired || exhausted}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Code Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-blue-500" />
              Crear Código de Invitación
            </DialogTitle>
            <DialogDescription>
              Configura el código para otorgar acceso Premium
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_uses">Número de Usos</Label>
              <Input
                id="max_uses"
                type="number"
                min="1"
                placeholder="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cuántas veces se puede usar este código
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Tier Premium</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="premium_pro">Premium Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duración Premium (días)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="30 (vacío = permanente)"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cuántos días de Premium otorga el código
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code_expires">Expiración del Código (días)</Label>
              <Input
                id="code_expires"
                type="number"
                placeholder="90 (vacío = nunca expira)"
                value={codeExpiresDays}
                onChange={(e) => setCodeExpiresDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cuándo expira el código mismo (no el Premium)
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                onClick={handleCreateCode}
                disabled={creating}
              >
                {creating ? "Creando..." : "Crear Código"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
