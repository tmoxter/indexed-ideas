import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export function useAuth(redirectOnUnauthenticated = true) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const supabase = supabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && redirectOnUnauthenticated) {
      router.push("/");
      return;
    }

    setUser(session?.user || null);
    setIsLoading(false);
  }, [router, redirectOnUnauthenticated]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    const supabase = supabaseClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return { user, isLoading, logout };
}
