import { useCallback } from "react";
import { supabaseClient } from "@/lib/supabase";
import { logClientMessage } from "@/lib/clientLogger";

export function useMarkProfileSeen() {
  const markAsSeen = useCallback(async (profileId: string) => {
    try {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn("[mark-profile-seen] No active session");
        return;
      }

      const response = await fetch("/api/mark-profile-seen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        await logClientMessage(
          `[mark-profile-seen] Failed to mark profile as seen: ${response.status}`,
          "error"
        );
      }
    } catch (error) {
      await logClientMessage(
        `[mark-profile-seen] Error marking profile as seen: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
    }
  }, []);

  return { markAsSeen };
}
