import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { Auth } from "../Auth";
import {
  User,
  Crown,
  Settings,
  BarChart3,
  QrCode,
  ExternalLink,
  Link2,
  PenLine,
  Shield,
  Camera,
  Mail,
  Calendar,
  Award,
  Sparkles,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isAdminEmail } from "../../lib/admin-check";
import { hasPremiumAccessByEmail } from "../../lib/entitlements";
import { getAliasProfileUrl, getPublicProfileUrl } from "../../lib/url";
import { Link, useNavigate } from "@tanstack/react-router";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  public_id?: string;
  slug?: string;
  created_at: string;
}

interface PremiumStatus {
  isPremium: boolean;
  tier?: string;
  source?: string;
  expires_at?: string;
}

interface UserStats {
  totalProfiles: number;
  totalScans: number;
  totalLinks: number;
}

export function MyProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({ isPremium: false });
  const [stats, setStats] = useState<UserStats>({ totalProfiles: 0, totalScans: 0, totalLinks: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Get auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      setUser(authUser);

      // Get profile data from auth.users metadata or create profile
      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email!,
        full_name: authUser.user_metadata?.full_name,
        avatar_url: authUser.user_metadata?.avatar_url,
        bio: authUser.user_metadata?.bio,
        created_at: authUser.created_at,
      };
      setProfile(userProfile);
      const hasPremiumOverride = hasPremiumAccessByEmail(authUser.email || "");

      // Check premium status
      const { data: premiumData } = await supabase
        .from("premium_users")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (premiumData) {
        const isActive = !premiumData.expires_at || new Date(premiumData.expires_at) > new Date();
        setPremiumStatus({
          isPremium: isActive || hasPremiumOverride,
          tier: premiumData.tier,
          source: premiumData.source,
          expires_at: premiumData.expires_at,
        });
      } else if (hasPremiumOverride) {
        setPremiumStatus({
          isPremium: true,
          tier: "premium_pro",
          source: "admin_test_override",
        });
      }

      // Check admin status
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", authUser.id)
        .maybeSingle();

      setIsAdmin(!!adminData || isAdminEmail(authUser.email || ""));

      // Get user stats
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, scan_count, public_id, slug")
        .eq("user_id", authUser.id);

      const primaryProfile = profilesData?.[0];
      if (primaryProfile) {
        setProfile((current) =>
          current
            ? {
                ...current,
                public_id: primaryProfile.public_id || undefined,
                slug: primaryProfile.slug || undefined,
              }
            : current,
        );
      }

      const totalProfiles = profilesData?.length || 0;
      const totalScans =
        profilesData?.reduce(
          (sum: number, p: { scan_count?: number | null }) => sum + (p.scan_count || 0),
          0,
        ) || 0;

      // Get total links
      if (profilesData && profilesData.length > 0) {
        const profileIds = profilesData.map((p: { id: string }) => p.id);
        const { count } = await supabase
          .from("profile_links")
          .select("*", { count: "exact", head: true })
          .in("profile_id", profileIds);

        setStats({
          totalProfiles,
          totalScans,
          totalLinks: count || 0,
        });
      } else {
        setStats({ totalProfiles: 0, totalScans: 0, totalLinks: 0 });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Error al cargar tu perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) return;

    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/profile/avatar-${Date.now()}.${fileExt}`;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl },
      });

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: data.publicUrl } : null));
      toast.success("Foto actualizada");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      toast.success("Perfil actualizado");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar perfil");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No se pudo cargar tu perfil</p>
      </div>
    );
  }

  const accountAge = Math.floor(
    (new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  const publicProfileUrl = profile.slug
    ? getAliasProfileUrl(profile.slug)
    : profile.public_id
      ? getPublicProfileUrl(profile.public_id)
      : "";
  const publicProfilePath = profile.slug
    ? `/${profile.slug}`
    : profile.public_id
      ? `/p/${profile.public_id}`
      : "";
  const navItems = [
    { value: "overview", label: "Datos", icon: User },
    { value: "premium", label: "Premium", icon: Crown },
    { value: "stats", label: "Estadísticas", icon: BarChart3 },
    ...(isAdmin ? [{ value: "admin", label: "Admin", icon: Shield }] : []),
  ];

  const ProfileNav = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Cuenta
          </p>
          <h2 className="text-lg font-semibold tracking-tight">Mi perfil principal</h2>
        </div>
        {mobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setActiveTab(item.value);
                setMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <Link
          to="/encrypted-documents"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 font-semibold"
        >
          <Lock className="h-4 w-4 text-blue-500" strokeWidth={1.8} />
          Documentos Seguros
        </Link>
        <Link
          to="/editor"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Volver al editor
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Button
        type="button"
        size="icon"
        className="fixed left-4 top-4 z-40 h-11 w-11 rounded-full shadow-lg md:hidden"
        onClick={() => setMenuOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute left-0 top-0 h-full w-[82vw] max-w-[320px] bg-background p-5 shadow-2xl">
            <ProfileNav mobile />
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-6 p-4 py-8 md:p-8">
        <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-64 shrink-0 rounded-2xl border bg-background p-5 shadow-lg md:block">
          <ProfileNav />
        </aside>

        <main className="min-w-0 flex-1">
          {/* Header Section */}
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8">
              <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                {/* Avatar and Info */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-xl md:h-32 md:w-32">
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile.full_name || profile.email}
                      />
                      <AvatarFallback className="text-2xl font-bold">
                        {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
                    >
                      {uploading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {profile.full_name || "Mi Perfil"}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {premiumStatus.isPremium ? (
                        <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                          <Crown className="h-3 w-3 fill-white" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                      {isAdmin && (
                        <Badge className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {accountAge} días
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.totalProfiles}</div>
                    <div className="text-xs text-muted-foreground">QR Creados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.totalScans}</div>
                    <div className="text-xs text-muted-foreground">Escaneos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.totalLinks}</div>
                    <div className="text-xs text-muted-foreground">Enlaces</div>
                  </div>
                </div>
              </div>

              {/* Background decoration */}
              <div className="absolute right-0 top-0 h-full w-1/3 opacity-5">
                <QrCode className="h-full w-full" />
              </div>
            </div>
          </div>

          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ExternalLink className="h-4 w-4" />
                  Perfil público
                </CardTitle>
                <CardDescription>Tu landing activa para compartir.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={publicProfileUrl || "/editor"} target="_blank" rel="noreferrer">
                    Ver mi perfil público
                  </a>
                </Button>
                <Button asChild className="w-full justify-start">
                  <Link to="/template-builder">
                    <PenLine className="mr-2 h-4 w-4" />
                    Editar landing
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-4 w-4" />
                  QR actual
                </CardTitle>
                <CardDescription>Vista y edición del QR principal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/editor" search={{ tab: "qr" }}>
                    Ver mi QR
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start">
                  <Link to="/editor" search={{ tab: "qr" }}>
                    <PenLine className="mr-2 h-4 w-4" />
                    Editar QR
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4" />
                  Enlace activo
                </CardTitle>
                <CardDescription>
                  {publicProfilePath || "Publica tu perfil para activar el enlace."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={publicProfileUrl || "/editor"} target="_blank" rel="noreferrer">
                    Ver mi enlace
                  </a>
                </Button>
                <Button asChild className="w-full justify-start">
                  <Link to="/editor" search={{ tab: "qr" }}>
                    <PenLine className="mr-2 h-4 w-4" />
                    Editar enlace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Tabs Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información Personal
                  </CardTitle>
                  <CardDescription>Actualiza tu información de perfil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      defaultValue={profile.full_name}
                      onBlur={(e) => handleUpdateProfile({ full_name: e.target.value })}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografía</Label>
                    <Input
                      id="bio"
                      defaultValue={profile.bio}
                      onBlur={(e) => handleUpdateProfile({ bio: e.target.value })}
                      placeholder="Cuéntanos sobre ti"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profile.email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      El email no puede ser cambiado desde aquí
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Premium Tab */}
            <TabsContent value="premium" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    Estado Premium
                  </CardTitle>
                  <CardDescription>Gestiona tu suscripción y beneficios Premium</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {premiumStatus.isPremium ? (
                    <>
                      <div className="rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-amber-500" />
                              <h3 className="text-lg font-semibold">Eres Premium</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Tier: <span className="font-medium">{premiumStatus.tier}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Origen: <span className="font-medium">{premiumStatus.source}</span>
                            </p>
                            {premiumStatus.expires_at && (
                              <p className="text-sm text-muted-foreground">
                                Expira:{" "}
                                <span className="font-medium">
                                  {new Date(premiumStatus.expires_at).toLocaleDateString()}
                                </span>
                              </p>
                            )}
                          </div>
                          <Award className="h-12 w-12 text-amber-500" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">Beneficios Activos:</h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Plantillas QR Premium (degradados, neón)
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Logos demo editables
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Analytics avanzados
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Soporte prioritario
                          </li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border-2 border-dashed p-6 text-center">
                        <Crown className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="mb-2 text-lg font-semibold">Desbloquea Premium</h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                          Accede a plantillas avanzadas, logos personalizados y analytics detallados
                        </p>
                        <Button className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          Ver Planes Premium
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">¿Tienes un código de invitación?</h4>
                        <Button variant="outline" className="w-full">
                          Canjear Código
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total QR Codes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalProfiles}</div>
                    <p className="text-xs text-muted-foreground">Códigos creados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Escaneos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalScans}</div>
                    <p className="text-xs text-muted-foreground">Vistas acumuladas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Enlaces Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalLinks}</div>
                    <p className="text-xs text-muted-foreground">Links configurados</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Actividad Reciente</CardTitle>
                  <CardDescription>Tus QR codes más activos</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Próximamente: gráficos de actividad y analytics detallados
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admin Tab (only for admins) */}
            {isAdmin && (
              <TabsContent value="admin" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      Panel de Administración
                    </CardTitle>
                    <CardDescription>
                      Gestión del sistema, usuarios y configuración global
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      onClick={() => (window.location.href = "/admin")}
                    >
                      <Settings className="h-4 w-4" />
                      Abrir Panel de Administración
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
