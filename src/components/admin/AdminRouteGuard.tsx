import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { isAdminEmail, isUserAdmin } from "../../lib/admin-check";

type GuardState = "checking" | "authorized" | "denied";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuardState>("checking");
  const navigate = useNavigate();
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setState("denied");
          navigate({ to: "/", replace: true });
        }
        return;
      }

      const hasAdminAccess =
        (await isUserAdmin(supabase, user.id)) || isAdminEmail(user.email || "");

      if (!active) return;

      if (!hasAdminAccess) {
        setState("denied");
        navigate({ to: "/", replace: true });
        return;
      }

      setState("authorized");
    };

    void verifyAccess();
    return () => {
      active = false;
    };
  }, [navigate, supabase]);

  if (state === "checking") {
    return <div className="flex min-h-screen items-center justify-center">Verificando acceso...</div>;
  }

  if (state === "denied") return null;

  return <>{children}</>;
}
