import { useCallback } from "react";
import { supabaseClient } from "@/lib/supabase";

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
        console.error(
          "[mark-profile-seen] Failed to mark profile as seen:",
          response.status
        );
      }
    } catch (error) {
      console.error(
        "[mark-profile-seen] Error marking profile as seen:",
        error
      );
    }
  }, []);

  return { markAsSeen };
}
