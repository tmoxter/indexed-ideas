import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import type { BannerData } from "@/types";

export function useBannerCounts() {
  const [data, setData] = useState<BannerData | null>(null);

  useEffect(() => {
    const fetchBannerData = async () => {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      try {
        console.log("[home] Fetching banner data...");
        const response = await fetch("/api/banner-counts", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          console.error(
            "[home] Error fetching banner data, status:",
            response.status
          );
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("[home] Error fetching banner data:", error);
      }
    };

    fetchBannerData();
  }, []); // Empty dependency array - only run once on mount

  return data;
}
