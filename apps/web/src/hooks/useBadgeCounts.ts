import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import type { BadgeCounts } from "@/types";

export function useBadgeCounts() {
  const [data, setData] = useState<BadgeCounts | null>(null);

  useEffect(() => {
    const fetchBadgeData = async () => {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      try {
        console.log("[home] Fetching badge data...");
        const response = await fetch("/api/badge-counts", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          console.error(
            "[home] Error fetching badge data, status:",
            response.status
          );
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("[home] Error fetching badge data:", error);
      }
    };

    fetchBadgeData();
  }, []);

  return data;
}
