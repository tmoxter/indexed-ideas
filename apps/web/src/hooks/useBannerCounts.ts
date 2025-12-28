import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { logClientMessage } from "@/lib/clientLogger";
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
        await logClientMessage("[home] Fetching banner data...", "info");
        const response = await fetch("/api/banner-counts", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          await logClientMessage(
            `[home] Error fetching banner data, status: ${response.status}`,
            "error"
          );
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        await logClientMessage(
          `[home] Error fetching banner data: ${error instanceof Error ? error.message : String(error)}`,
          "error"
        );
      }
    };

    fetchBannerData();
  }, []); // Empty dependency array - only run once on mount

  return data;
}
