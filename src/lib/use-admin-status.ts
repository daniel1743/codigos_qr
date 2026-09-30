import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "./supabase/client";
import { isUserAdmin } from "./admin-check";

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const allowed = data.user ? await isUserAdmin(supabase, data.user.id) : false;
        if (active) setIsAdmin(allowed);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  return { isAdmin, loading };
}
