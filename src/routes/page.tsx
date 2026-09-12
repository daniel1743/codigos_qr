import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Eye, Globe, Pencil, QrCode, Share2 } from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PLATFORM_BRAND } from "../components/platform/platform-brand";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { getPublicProfileUrl } from "../lib/url";

interface PageSummary {
  display_name: string;
  profession?: string | null;
  bio: string | null;
  avatar_url: string | null;
  published: boolean;
  scan_count: number;
  public_id: string;
  slug: string;
}

const LOCAL_NAV = [
  { id: "resumen", label: "Resumen", icon: Globe },
  { id: "ver", label: "Ver página", icon: Eye },
  { id: "publicacion", label: "Publicación", icon: ArrowUpRight },
  { id: "qr", label: "QR", icon: QrCode },
  { id: "compartir", label: "Compartir", icon: Share2 },
] as const;

export const Route = createFileRoute("/page")({ component: MyPageHub });

function MyPageHub() {
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageSummary | null>(null);
  const [activeTab, setActiveTab] = useState("resumen");

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data: profiles } = await supabase
          .from("profiles")
          .select("public_id, slug, display_name, profession, bio, avatar_url, published, scan_count")
          .eq("user_id", auth.user.id);
        const p = profiles?.[0];
        if (p) setPage(p as PageSummary);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const publicUrl = page?.public_id ? getPublicProfileUrl(page.public_id) : null;
  const name = page?.display_name || "Mi página";
  const statusLabel = page ? (page.published ? "Publicada" : "Borrador") : "Sin crear";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-border">
              <AvatarImage src={page?.avatar_url ?? undefined} alt={name} />
              <AvatarFallback className="text-xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <p className="text-sm text-muted-foreground">{page?.profession || page?.bio || "Gestiona tu página pública"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={page?.published ? "default" : "secondary"}>{statusLabel}</Badge>
            <Button asChild variant="outline">
              <Link to="/pages">Ver todas mis páginas</Link>
            </Button>
            <Button asChild style={{ backgroundColor: PLATFORM_BRAND.colors.blue }}>
              <Link to="/editor"><Pencil className="mr-2 h-4 w-4" /> Editar</Link>
            </Button>
          </div>
        </header>

        <nav className="mt-6 flex gap-1 overflow-x-auto" aria-label="Navegación de la página">
          {LOCAL_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.6fr)]">
          <Card>
            <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {publicUrl ? (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">URL pública</p>
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 truncate text-sm font-medium hover:underline">
                    {publicUrl} <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aún no tienes una página pública.</p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button asChild style={{ backgroundColor: PLATFORM_BRAND.colors.blue }}>
                  <Link to="/editor"><Pencil className="mr-2 h-4 w-4" /> Editar página</Link>
                </Button>
                {publicUrl && page?.published && (
                  <Button asChild variant="outline">
                    <a href={publicUrl} target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" /> Ver página</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Estado</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado</span><span className="font-medium">{statusLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Escaneos</span><span className="font-medium">{page?.scan_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Enlace</span><span className="font-medium">{page?.slug ? `/${page.slug}` : "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
