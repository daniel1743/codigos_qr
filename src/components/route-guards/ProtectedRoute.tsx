import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { isUserAdmin } from "@/lib/admin-check";

type Access = "authenticated" | "admin";

/** Route-level access guard for internal surfaces that still have a purpose. */
export function ProtectedRoute({ access, children }: { access: Access; children: ReactNode }) {
  const navigate = useNavigate();
  const supabase = getBrowserSupabaseClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) void navigate({ to: "/login" });
        return;
      }

      if (access === "admin" && !(await isUserAdmin(supabase, data.session.user.id))) {
        if (active) void navigate({ to: "/profile" });
        return;
      }

      if (active) setAllowed(true);
    })();
    return () => {
      active = false;
    };
  }, [access, navigate, supabase]);

  if (allowed !== true) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-cq-subtle">Verificando acceso…</div>;
  }

  return children;
}
