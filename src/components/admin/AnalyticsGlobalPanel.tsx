import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface GlobalAnalytics {
  totalViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
    unknown: number;
  };
  browserBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  topCountries: Array<{ country: string; count: number }>;
  recentActivity: Array<{
    event_type: string;
    created_at: string;
    country?: string;
    device_type?: string;
  }>;
}

export function AnalyticsGlobalPanel() {
  const [analytics, setAnalytics] = useState<GlobalAnalytics>({
    totalViews: 0,
    totalClicks: 0,
    uniqueVisitors: 0,
    deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0, unknown: 0 },
    browserBreakdown: {},
    countryBreakdown: {},
    topCountries: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    loadGlobalAnalytics();
  }, []);

  const loadGlobalAnalytics = async () => {
    setLoading(true);
    try {
      // Get all analytics events
      const { data: events } = await supabase
        .from("qr_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000); // Last 1000 events

      if (!events || events.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate metrics
      const views = events.filter((e) => e.event_type === "view").length;
      const clicks = events.filter((e) => e.event_type === "link_click").length;
      const uniqueVisitors = new Set(events.map((e) => e.ip_hash).filter(Boolean)).size;

      // Device breakdown
      const deviceBreakdown = {
        mobile: 0,
        desktop: 0,
        tablet: 0,
        unknown: 0,
      };
      events.forEach((e) => {
        const device = e.device_type || "unknown";
        if (device in deviceBreakdown) {
          deviceBreakdown[device as keyof typeof deviceBreakdown]++;
        }
      });

      // Browser breakdown
      const browserBreakdown: Record<string, number> = {};
      events.forEach((e) => {
        if (e.browser) {
          browserBreakdown[e.browser] = (browserBreakdown[e.browser] || 0) + 1;
        }
      });

      // Country breakdown
      const countryBreakdown: Record<string, number> = {};
      events.forEach((e) => {
        if (e.country) {
          countryBreakdown[e.country] = (countryBreakdown[e.country] || 0) + 1;
        }
      });

      // Top 10 countries
      const topCountries = Object.entries(countryBreakdown)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Recent activity
      const recentActivity = events.slice(0, 20);

      setAnalytics({
        totalViews: views,
        totalClicks: clicks,
        uniqueVisitors,
        deviceBreakdown,
        browserBreakdown,
        countryBreakdown,
        topCountries,
        recentActivity,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando analytics...</p>
        </CardContent>
      </Card>
    );
  }

  const totalEvents = analytics.totalViews + analytics.totalClicks;
  const totalDevices =
    analytics.deviceBreakdown.mobile +
    analytics.deviceBreakdown.desktop +
    analytics.deviceBreakdown.tablet;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalEvents > 0
                ? ((analytics.totalViews / totalEvents) * 100).toFixed(1)
                : 0}
              % del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalEvents > 0
                ? ((analytics.totalClicks / totalEvents) * 100).toFixed(1)
                : 0}
              % del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Visitantes Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.uniqueVisitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">IPs únicas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Views + Clicks</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Dispositivos
            </CardTitle>
            <CardDescription>Distribución por tipo de dispositivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    <span>Mobile</span>
                  </div>
                  <span className="font-medium">
                    {analytics.deviceBreakdown.mobile} (
                    {totalDevices > 0
                      ? ((analytics.deviceBreakdown.mobile / totalDevices) * 100).toFixed(1)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${totalDevices > 0 ? (analytics.deviceBreakdown.mobile / totalDevices) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-green-500" />
                    <span>Desktop</span>
                  </div>
                  <span className="font-medium">
                    {analytics.deviceBreakdown.desktop} (
                    {totalDevices > 0
                      ? ((analytics.deviceBreakdown.desktop / totalDevices) * 100).toFixed(1)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width: `${totalDevices > 0 ? (analytics.deviceBreakdown.desktop / totalDevices) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Tablet className="h-4 w-4 text-purple-500" />
                    <span>Tablet</span>
                  </div>
                  <span className="font-medium">
                    {analytics.deviceBreakdown.tablet} (
                    {totalDevices > 0
                      ? ((analytics.deviceBreakdown.tablet / totalDevices) * 100).toFixed(1)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{
                      width: `${totalDevices > 0 ? (analytics.deviceBreakdown.tablet / totalDevices) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Países
            </CardTitle>
            <CardDescription>Ubicaciones más activas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay datos de ubicación</p>
              ) : (
                analytics.topCountries.map((country, index) => (
                  <div
                    key={country.country}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 justify-center">
                        {index + 1}
                      </Badge>
                      <span>{country.country || "Desconocido"}</span>
                    </div>
                    <span className="font-medium">{country.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>Últimos 20 eventos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay actividad registrada
              </p>
            ) : (
              analytics.recentActivity.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    {event.event_type === "view" ? (
                      <Eye className="h-4 w-4 text-blue-500" />
                    ) : (
                      <MousePointerClick className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {event.event_type === "view" ? "Vista de página" : "Click en enlace"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.country || "Ubicación desconocida"} •{" "}
                        {event.device_type || "Dispositivo desconocido"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
