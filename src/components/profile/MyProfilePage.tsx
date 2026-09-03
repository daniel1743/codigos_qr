import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  ArrowRight,
  Award,
  BarChart3,
  Camera,
  Crown,
  ExternalLink,
  FileLock2,
  LogOut,
  Mail,
  Pencil,
  QrCode,
  Settings,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isAdminEmail } from "../../lib/admin-check";
import { hasPremiumAccessByEmail } from "../../lib/entitlements";
import { getPublicProfileUrl } from "../../lib/url";
import { Link, useNavigate } from "@tanstack/react-router";
import PlatformNavbar from "../brand/PlatformNavbar";
import { PLATFORM_BRAND } from "../platform/platform-brand";
import { PLATFORM_NAV_ITEMS } from "../platform/platform-navigation";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

interface PageProfileSummary {
  id: string;
  public_id: string;
  slug: string;
  display_name: string;
  profession?: string | null;
  bio: string | null;
  avatar_url: string | null;
  published: boolean;
  scan_count: number;
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
  const [pageProfile, setPageProfile] = useState<PageProfileSummary | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({ isPremium: false });
  const [stats, setStats] = useState<UserStats>({ totalProfiles: 0, totalScans: 0, totalLinks: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      setUser(authUser);

      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || "",
        full_name: authUser.user_metadata?.full_name,
        avatar_url: authUser.user_metadata?.avatar_url,
        bio: authUser.user_metadata?.bio,
        created_at: authUser.created_at,
      };
      setProfile(userProfile);
      const hasPremiumOverride = hasPremiumAccessByEmail(authUser.email || "");

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

      const { data: adminData } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", authUser.id)
        .maybeSingle();

      setIsAdmin(!!adminData || isAdminEmail(authUser.email || ""));

      const { data: profilesData } = await supabase
        .from("profiles")
        .select(
          "id, scan_count, public_id, slug, display_name, profession, bio, avatar_url, published",
        )
        .eq("user_id", authUser.id);

      const primaryProfile = profilesData?.[0];
      setPageProfile(
        primaryProfile
          ? {
              id: primaryProfile.id,
              public_id: primaryProfile.public_id,
              slug: primaryProfile.slug,
              display_name: primaryProfile.display_name,
              profession: primaryProfile.profession,
              bio: primaryProfile.bio,
              avatar_url: primaryProfile.avatar_url,
              published: primaryProfile.published,
              scan_count: primaryProfile.scan_count,
            }
          : null,
      );

      const totalProfiles = profilesData?.length || 0;
      const totalScans =
        profilesData?.reduce(
          (sum: number, currentProfile: { scan_count?: number | null }) =>
            sum + (currentProfile.scan_count || 0),
          0,
        ) || 0;

      if (profilesData && profilesData.length > 0) {
        const profileIds = profilesData.map((currentProfile: { id: string }) => currentProfile.id);
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
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl },
      });

      if (updateError) throw updateError;

      setProfile((previousProfile) =>
        previousProfile ? { ...previousProfile, avatar_url: data.publicUrl } : null,
      );
      setPageProfile((previousProfile) =>
        previousProfile ? { ...previousProfile, avatar_url: data.publicUrl } : null,
      );
      toast.success("Foto actualizada");
    } catch (error: unknown) {
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

      setProfile((previousProfile) =>
        previousProfile ? { ...previousProfile, ...updates } : null,
      );
      toast.success("Perfil actualizado");
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar perfil");
    }
  };

  const platformNavItems = PLATFORM_NAV_ITEMS.filter((item) => item.scope !== "admin" || isAdmin);

  const platformNavbar = (
    <>
      <style>{`
        .profile-user-hub-navbar [data-platform-nav-item="profile"] {
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
      `}</style>
      <PlatformNavbar
        variant="editor"
        brandHref="/profile"
        logoTheme="inverse"
        className="profile-user-hub-navbar sticky top-0 z-40 border-b border-white/10 bg-[#090909]/95 px-3 text-[#f5f2ea] backdrop-blur-xl lg:px-6"
        innerClassName="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4"
        brandClassName="shrink-0 transition-opacity hover:opacity-80"
        logoClassName="h-[34px] w-[34px] min-[420px]:w-[146px]"
        navItems={platformNavItems}
      />
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7f9]">
        {platformNavbar}
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">Cargando tu espacio...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-[#f6f7f9]">
        {platformNavbar}
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">No se pudo cargar tu perfil</p>
        </div>
      </div>
    );
  }

  const accountAge = Math.max(
    0,
    Math.floor(
      (new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const pageName = pageProfile?.display_name?.trim() || profile.full_name || "Mi página";
  const pageProfession = pageProfile?.profession?.trim();
  const pageAvatar = pageProfile?.avatar_url || profile.avatar_url;
  const publicUrl = pageProfile?.public_id ? getPublicProfileUrl(pageProfile.public_id) : null;

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
      {platformNavbar}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p
              className="text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: PLATFORM_BRAND.colors.blue }}
            >
              User Hub / Inicio
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Hola, {profile.full_name || "bienvenido"}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Este es el centro de tu cuenta: gestiona tu página pública, accede a tus documentos y
              mantén actualizada tu información.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Avatar className="h-10 w-10 border border-slate-200">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.email} />
              <AvatarFallback>
                {profile.full_name?.charAt(0) || profile.email.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-900">Tu cuenta</p>
              <p>{profile.email}</p>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{ color: PLATFORM_BRAND.colors.blue }}
                  >
                    Tu página pública
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Mi página</h2>
                </div>
                {pageProfile ? (
                  <Badge
                    variant={pageProfile.published ? "default" : "secondary"}
                    className={pageProfile.published ? "bg-emerald-700 hover:bg-emerald-700" : ""}
                  >
                    {pageProfile.published ? "Publicada" : "Borrador"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Sin crear</Badge>
                )}
              </div>
            </div>

            <CardContent className="p-5 sm:p-7">
              {pageProfile ? (
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="relative shrink-0 self-start">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-md sm:h-28 sm:w-28">
                      <AvatarImage src={pageAvatar || undefined} alt={pageName} />
                      <AvatarFallback className="bg-slate-100 text-2xl font-semibold text-slate-700">
                        {pageName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity hover:opacity-90"
                      style={{ backgroundColor: PLATFORM_BRAND.colors.blue }}
                      title="Cambiar foto"
                    >
                      {uploading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Camera className="h-4 w-4" />
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

                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h3 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                        {pageName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {pageProfession ||
                          pageProfile.bio ||
                          "Personaliza la identidad de tu página."}
                      </p>
                    </div>

                    {publicUrl && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="truncate text-xs text-slate-600" title={publicUrl}>
                          {publicUrl}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        asChild
                        className="w-full text-white hover:opacity-90 sm:w-auto"
                        style={{ backgroundColor: PLATFORM_BRAND.colors.blue }}
                      >
                        <Link to="/editor">
                          <Pencil className="h-4 w-4" />
                          Editar mi página
                        </Link>
                      </Button>
                      {pageProfile.published && publicUrl && (
                        <Button asChild variant="outline" className="w-full sm:w-auto">
                          <a href={publicUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Ver página
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight">
                      Aún no tienes una página
                    </h3>
                    <p className="max-w-lg text-sm leading-6 text-slate-600">
                      Crea tu primera página pública para compartir tu identidad y tus enlaces desde
                      un solo lugar.
                    </p>
                  </div>
                  <Button
                    asChild
                    className="w-full shrink-0 text-white hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: PLATFORM_BRAND.colors.blue }}
                  >
                    <Link to="/editor">
                      Crear mi página
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <section aria-labelledby="quick-actions-title" className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Accesos directos
              </p>
              <h2 id="quick-actions-title" className="mt-1 text-lg font-semibold tracking-tight">
                Sigue trabajando
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                to="/editor"
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <QrCode className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-4 font-semibold">Editar mi página</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Ajusta diseño, contenido y enlaces.
                </p>
              </Link>

              <Link
                to="/encrypted-documents"
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <FileLock2 className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-4 font-semibold">Documentos</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Accede a tus documentos seguros.
                </p>
              </Link>
            </div>
          </section>
        </div>

        <section className="mt-8" aria-labelledby="account-section-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Cuenta
              </p>
              <h2 id="account-section-title" className="mt-1 text-xl font-semibold tracking-tight">
                Configuración y estado
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 sm:grid-cols-4">
              <TabsTrigger value="overview" className="min-h-10 gap-2">
                <User className="h-4 w-4" />
                Datos
              </TabsTrigger>
              <TabsTrigger value="premium" className="min-h-10 gap-2">
                <Crown className="h-4 w-4" />
                Premium
              </TabsTrigger>
              <TabsTrigger value="stats" className="min-h-10 gap-2">
                <BarChart3 className="h-4 w-4" />
                Estadísticas
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="min-h-10 gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información personal
                  </CardTitle>
                  <CardDescription>Actualiza la información asociada a tu cuenta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre completo</Label>
                    <Input
                      id="full_name"
                      defaultValue={profile.full_name}
                      onBlur={(event) => handleUpdateProfile({ full_name: event.target.value })}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografía</Label>
                    <Input
                      id="bio"
                      defaultValue={profile.bio}
                      onBlur={(event) => handleUpdateProfile({ bio: event.target.value })}
                      placeholder="Cuéntanos sobre ti"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profile.email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      El email no puede ser cambiado desde aquí.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="premium" className="space-y-6">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    Estado Premium
                  </CardTitle>
                  <CardDescription>Gestiona tu suscripción y beneficios Premium.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {premiumStatus.isPremium ? (
                    <>
                      <div className="rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-6">
                        <div className="flex items-start justify-between gap-4">
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
                          <Award className="h-12 w-12 shrink-0 text-amber-500" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">Beneficios activos:</h4>
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
                          Accede a plantillas avanzadas, logos personalizados y analytics
                          detallados.
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

            <TabsContent value="stats" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total QR Codes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalProfiles}</div>
                    <p className="text-xs text-muted-foreground">Códigos creados</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total escaneos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalScans}</div>
                    <p className="text-xs text-muted-foreground">Vistas acumuladas</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Enlaces activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalLinks}</div>
                    <p className="text-xs text-muted-foreground">Links configurados</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Resumen de tu cuenta</CardTitle>
                  <CardDescription>Datos reales asociados a tus perfiles actuales.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Tu cuenta lleva activa {accountAge} días y tiene {stats.totalProfiles} perfil
                  {stats.totalProfiles === 1 ? "" : "es"} registrado
                  {stats.totalProfiles === 1 ? "" : "s"}.
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="space-y-6">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      Panel de administración
                    </CardTitle>
                    <CardDescription>
                      Gestión del sistema, usuarios y configuración global.
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
        </section>
      </main>
    </div>
  );
}
