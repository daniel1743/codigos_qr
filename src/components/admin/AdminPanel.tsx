import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  Shield,
  Users,
  Ticket,
  Crown,
  BarChart3,
  Sparkles,
  Image as ImageIcon,
  Settings,
  TrendingUp,
  MapPin,
  Monitor,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useNavigate } from "@tanstack/react-router";
import { UsersPanel } from "./UsersPanel";
import { PremiumPanel } from "./PremiumPanel";
import { InvitationCodesPanel } from "./InvitationCodesPanel";
import { LogosPanel } from "./LogosPanel";
import { AnalyticsGlobalPanel } from "./AnalyticsGlobalPanel";
import { TemplateLibraryPanel } from "./TemplateLibraryPanel";
import { isAdminEmail } from "../../lib/admin-check";

interface GlobalStats {
  totalUsers: number;
  premiumUsers: number;
  totalProfiles: number;
  totalScans: number;
  activeCodes: number;
  demoLogos: number;
}

export function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<GlobalStats>({
    totalUsers: 0,
    premiumUsers: 0,
    totalProfiles: 0,
    totalScans: 0,
    activeCodes: 0,
    demoLogos: 0,
  });

  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate({ to: "/" });
        return;
      }

      // Check if user is admin
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminData && !isAdminEmail(user.email || "")) {
        navigate({ to: "/" });
        return;
      }

      setIsAdmin(true);
      await loadGlobalStats();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate({ to: "/" });
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalStats = async () => {
    try {
      // Total users (from auth.users via admin API or count from profiles)
      const { count: profilesCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Premium users
      const { count: premiumCount } = await supabase
        .from("premium_users")
        .select("*", { count: "exact", head: true });

      // Total scans
      const { data: profilesData } = await supabase.from("profiles").select("scan_count");

      const totalScans =
        profilesData?.reduce(
          (sum: number, p: { scan_count?: number | null }) => sum + (p.scan_count || 0),
          0,
        ) || 0;

      // Active invitation codes
      const { count: codesCount } = await supabase
        .from("invitation_codes")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Demo logos
      const { count: logosCount } = await supabase
        .from("demo_logos")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: profilesCount || 0,
        premiumUsers: premiumCount || 0,
        totalProfiles: profilesCount || 0,
        totalScans,
        activeCodes: codesCount || 0,
        demoLogos: logosCount || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 animate-pulse text-purple-500" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-background p-8">
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
                <p className="text-sm text-muted-foreground">Gestión del sistema QR Generator</p>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-5">
            <Settings className="h-full w-full" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Perfiles registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Premium</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premiumUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUsers > 0
                ? `${((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}% del total`
                : "0% del total"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Escaneos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScans.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Views acumulados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Códigos Activos</CardTitle>
            <Ticket className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCodes}</div>
            <p className="text-xs text-muted-foreground">Invitaciones disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Logos Demo</CardTitle>
            <ImageIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.demoLogos}</div>
            <p className="text-xs text-muted-foreground">Biblioteca Premium</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">QR Codes</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProfiles}</div>
            <p className="text-xs text-muted-foreground">Códigos generados</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-7">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="premium" className="gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Premium</span>
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-2">
            <Ticket className="h-4 w-4" />
            <span className="hidden sm:inline">Códigos</span>
          </TabsTrigger>
          <TabsTrigger value="logos" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Logos</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <TemplateLibraryPanel />
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Crecimiento de Usuarios</CardTitle>
                <CardDescription>Últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Gráfico de crecimiento próximamente
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actividad de Escaneos</CardTitle>
                <CardDescription>Últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Gráfico de actividad próximamente
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Gestión del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setActiveTab("users")}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Ver Usuarios</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setActiveTab("premium")}
                >
                  <Crown className="h-6 w-6 text-amber-500" />
                  <span className="text-sm">Otorgar Premium</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setActiveTab("codes")}
                >
                  <Ticket className="h-6 w-6 text-blue-500" />
                  <span className="text-sm">Crear Código</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setActiveTab("logos")}
                >
                  <ImageIcon className="h-6 w-6 text-purple-500" />
                  <span className="text-sm">Subir Logo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => navigate({ to: "/admin/template-studio" })}
                >
                  <Settings className="h-6 w-6 text-purple-500" />
                  <span className="text-sm">Editor administrativo</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <UsersPanel />
        </TabsContent>

        {/* Premium Tab */}
        <TabsContent value="premium" className="space-y-6">
          <PremiumPanel />
        </TabsContent>

        {/* Codes Tab */}
        <TabsContent value="codes" className="space-y-6">
          <InvitationCodesPanel />
        </TabsContent>

        {/* Logos Tab */}
        <TabsContent value="logos" className="space-y-6">
          <LogosPanel />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsGlobalPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
