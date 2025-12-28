import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { logClientMessage } from "@/lib/clientLogger";
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
        await logClientMessage("[home] Fetching badge data...", "info");
        const response = await fetch("/api/badge-counts", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          await logClientMessage(
            `[home] Error fetching badge data, status: ${response.status}`,
            "error"
          );
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        await logClientMessage(
          `[home] Error fetching badge data: ${error instanceof Error ? error.message : String(error)}`,
          "error"
        );
      }
    };

    fetchBadgeData();
  }, []);

  return data;
}
