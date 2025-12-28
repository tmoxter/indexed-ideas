import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { logClientMessage } from "@/lib/clientLogger";

type InteractionAction = "like" | "pass" | "block" | "unblock";

export function useInteraction() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recordInteraction = async (
    targetUserId: string,
    action: InteractionAction
  ): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId,
          action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        await logClientMessage(
          `Error recording interaction: ${JSON.stringify(errorData)}`,
          "error"
        );
        return false;
      }

      return true;
    } catch (error) {
      await logClientMessage(
        `Error recording interaction: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { recordInteraction, isSubmitting };
}
