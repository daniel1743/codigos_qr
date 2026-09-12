import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CreditCard,
  ExternalLink,
  HelpCircle,
  LogOut,
  Pencil,
  QrCode,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { hasPremiumAccessByEmail } from "../lib/entitlements";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { getPublicProfileUrl } from "../lib/url";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const supabase = getBrowserSupabaseClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [premium, setPremium] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUser(data.user);
          setPremium(hasPremiumAccessByEmail(data.user.email || ""));
          const { data: profiles } = await supabase
            .from("profiles")
            .select("public_id")
            .eq("user_id", data.user.id);
          const publicId = profiles?.[0]?.public_id;
          if (publicId) setPublicUrl(getPublicProfileUrl(publicId));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando tu cuenta…</p>
        </div>
      </AppShell>
    );
  }

  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Usuario";
  const email = user?.email || "";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-border">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            <Badge variant={premium ? "default" : "secondary"} className="mt-1">
              {premium ? "Premium" : "Gratis"}
            </Badge>
          </div>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link to="/editor" className="no-underline">
            <Button variant="outline" className="w-full justify-start">
              <Pencil className="mr-2 h-4 w-4" /> Editar página
            </Button>
          </Link>
          {publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="no-underline">
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" /> Ver página
              </Button>
            </a>
          ) : (
            <Button variant="outline" className="w-full justify-start" disabled>
              <ExternalLink className="mr-2 h-4 w-4" /> Ver página
            </Button>
          )}
          <Link to="/page" className="no-underline">
            <Button variant="outline" className="w-full justify-start">
              <QrCode className="mr-2 h-4 w-4" /> Ver QR
            </Button>
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
          <MenuItem icon={User} label="Mis datos" />
          <MenuItem icon={Shield} label="Seguridad" />
          <MenuItem icon={CreditCard} label="Plan" />
          <MenuItem icon={Settings} label="Ajustes" />
          <MenuItem icon={HelpCircle} label="Ayuda" />
        </div>

        <Separator className="my-4" />
        <Button variant="ghost" onClick={signOut} className="w-full justify-start text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>

        <p className="mt-8 text-center text-xs text-muted-foreground">Cripqer version 1.0.0</p>
      </main>
    </AppShell>
  );
}

function MenuItem({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 text-sm last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span>{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
    </div>
  );
}
