import { useState, useEffect } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  Users,
  Search,
  Crown,
  Shield,
  Calendar,
  MoreVertical,
  Mail,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { toast } from "sonner";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string;
  isPremium: boolean;
  isAdmin: boolean;
  profileCount: number;
  totalScans: number;
}

export function UsersPanel() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email.toLowerCase().includes(query) || u.full_name?.toLowerCase().includes(query),
        ),
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, scan_count, created_at")
        .order("created_at", { ascending: false });

      if (!profiles) {
        setUsers([]);
        return;
      }

      // Get unique user_ids
      const userIds = [...new Set(profiles.map((p) => p.user_id))];

      // Get auth users data (we need to query auth.users via admin API or use profiles)
      // For now, we'll aggregate from profiles

      // Get premium status for all users
      const { data: premiumData } = await supabase
        .from("premium_users")
        .select("user_id, tier")
        .in("user_id", userIds);

      const premiumMap = new Map(premiumData?.map((p) => [p.user_id, true]) || []);

      // Get admin status
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("user_id, role")
        .in("user_id", userIds);

      const adminMap = new Map(adminData?.map((a) => [a.user_id, true]) || []);

      // Aggregate user data
      const userDataMap = new Map<string, UserData>();

      for (const profile of profiles) {
        if (!userDataMap.has(profile.user_id)) {
          // Since we can't directly access auth.users, we'll use email from the first profile
          // In production, you'd use Supabase Admin API to get user details
          userDataMap.set(profile.user_id, {
            id: profile.user_id,
            email: `user-${profile.user_id.slice(0, 8)}@...`, // Placeholder
            created_at: profile.created_at,
            isPremium: premiumMap.has(profile.user_id),
            isAdmin: adminMap.has(profile.user_id),
            profileCount: 0,
            totalScans: 0,
          });
        }

        const userData = userDataMap.get(profile.user_id)!;
        userData.profileCount++;
        userData.totalScans += profile.scan_count || 0;
      }

      setUsers(Array.from(userDataMap.values()));
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPremium = async (userId: string) => {
    toast.info("Funcionalidad disponible en Panel Premium");
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("admin_users").insert({
        user_id: userId,
        email: users.find((u) => u.id === userId)?.email || "",
        role: "admin",
        created_by: currentUser?.id,
      });

      if (error) throw error;

      toast.success("Usuario convertido a Admin");
      loadUsers();
    } catch (error: any) {
      console.error("Error making admin:", error);
      toast.error("Error al otorgar permisos de admin");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando usuarios...</p>
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
                <Users className="h-5 w-5" />
                Usuarios del Sistema
              </CardTitle>
              <CardDescription>
                {users.length} usuario{users.length !== 1 ? "s" : ""} registrado
                {users.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery ? "No se encontraron usuarios" : "No hay usuarios registrados"}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.full_name || user.email}</p>
                        {user.isAdmin && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-purple-500 text-purple-600"
                          >
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {user.isPremium && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500 text-amber-600"
                          >
                            <Crown className="h-3 w-3" />
                            Premium
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden text-right text-sm sm:block">
                      <div className="font-medium">{user.profileCount} QR</div>
                      <div className="text-xs text-muted-foreground">{user.totalScans} scans</div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleGrantPremium(user.id)}>
                          <Crown className="mr-2 h-4 w-4" />
                          Otorgar Premium
                        </DropdownMenuItem>
                        {!user.isAdmin && (
                          <DropdownMenuItem onClick={() => handleMakeAdmin(user.id)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Hacer Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Perfil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
