import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  Crown,
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
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
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface PremiumUser {
  id: string;
  user_id: string;
  email: string;
  tier: string;
  source: string;
  expires_at: string | null;
  created_at: string;
}

export function PremiumPanel() {
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState<"premium" | "premium_pro">("premium");
  const [durationDays, setDurationDays] = useState<string>("");
  const [granting, setGranting] = useState(false);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    loadPremiumUsers();
  }, []);

  const loadPremiumUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("premium_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPremiumUsers(data || []);
    } catch (error) {
      console.error("Error loading premium users:", error);
      toast.error("Error al cargar usuarios Premium");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPremium = async () => {
    if (!selectedEmail.trim()) {
      toast.error("Ingresa un email válido");
      return;
    }

    setGranting(true);
    try {
      // Get user by email
      const { data: authData } = await supabase.auth.admin.listUsers();
      const user = authData?.users.find((u) => u.email === selectedEmail);

      if (!user) {
        toast.error("Usuario no encontrado con ese email");
        return;
      }

      // Check if already premium
      const { data: existing } = await supabase
        .from("premium_users")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast.error("Este usuario ya tiene Premium");
        return;
      }

      // Calculate expiration
      let expiresAt = null;
      if (durationDays && parseInt(durationDays) > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + parseInt(durationDays));
        expiresAt = expDate.toISOString();
      }

      // Get current admin
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Insert premium user
      const { error } = await supabase.from("premium_users").insert({
        user_id: user.id,
        email: user.email!,
        tier: selectedTier,
        source: "admin_grant",
        granted_by: currentUser?.id,
        expires_at: expiresAt,
      });

      if (error) throw error;

      toast.success("Premium otorgado exitosamente");
      setGrantDialogOpen(false);
      setSelectedEmail("");
      setDurationDays("");
      loadPremiumUsers();
    } catch (error: any) {
      console.error("Error granting premium:", error);
      toast.error("Error al otorgar Premium");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokePremium = async (userId: string, email: string) => {
    if (!confirm(`¿Revocar Premium de ${email}?`)) return;

    try {
      const { error } = await supabase
        .from("premium_users")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Premium revocado");
      loadPremiumUsers();
    } catch (error) {
      console.error("Error revoking premium:", error);
      toast.error("Error al revocar Premium");
    }
  };

  const handleExtendPremium = async (userId: string, currentExpiry: string | null) => {
    const days = prompt("¿Cuántos días extender? (dejar vacío para permanente)");
    if (days === null) return;

    try {
      let newExpiry = null;
      if (days.trim() !== "") {
        const expDate = currentExpiry ? new Date(currentExpiry) : new Date();
        expDate.setDate(expDate.getDate() + parseInt(days));
        newExpiry = expDate.toISOString();
      }

      const { error } = await supabase
        .from("premium_users")
        .update({ expires_at: newExpiry })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Duración actualizada");
      loadPremiumUsers();
    } catch (error) {
      console.error("Error extending premium:", error);
      toast.error("Error al extender Premium");
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando usuarios Premium...</p>
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
                <Crown className="h-5 w-5 text-amber-500" />
                Usuarios Premium
              </CardTitle>
              <CardDescription>
                {premiumUsers.length} usuario{premiumUsers.length !== 1 ? "s" : ""} con acceso
                Premium
              </CardDescription>
            </div>
            <Button
              onClick={() => setGrantDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
            >
              <Plus className="h-4 w-4" />
              Otorgar Premium
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {premiumUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay usuarios Premium todavía
              </div>
            ) : (
              premiumUsers.map((user) => {
                const expired = isExpired(user.expires_at);

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.email}</p>
                        <Badge
                          variant="outline"
                          className={
                            expired
                              ? "border-red-500 text-red-600"
                              : "border-amber-500 text-amber-600"
                          }
                        >
                          {user.tier}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {user.source === "admin_grant"
                            ? "Admin"
                            : user.source === "invitation"
                            ? "Invitación"
                            : "Compra"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Otorgado{" "}
                          {formatDistanceToNow(new Date(user.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                        {user.expires_at ? (
                          <span
                            className={`flex items-center gap-1 ${expired ? "text-red-600" : ""}`}
                          >
                            {expired ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {expired ? "Expirado" : "Expira"}{" "}
                            {formatDistanceToNow(new Date(user.expires_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Permanente
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtendPremium(user.user_id, user.expires_at)}
                      >
                        <Clock className="mr-2 h-3 w-3" />
                        Extender
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokePremium(user.user_id, user.email)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Revocar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grant Premium Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Otorgar Acceso Premium
            </DialogTitle>
            <DialogDescription>
              Ingresa el email del usuario y configura la duración del acceso Premium
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email del Usuario</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Tier Premium</Label>
              <Select
                value={selectedTier}
                onValueChange={(v) => setSelectedTier(v as "premium" | "premium_pro")}
              >
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
              <Label htmlFor="duration">Duración (días)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="30 (dejar vacío para permanente)"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Si está vacío, el acceso será permanente
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setGrantDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                onClick={handleGrantPremium}
                disabled={granting}
              >
                {granting ? "Otorgando..." : "Otorgar Premium"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
