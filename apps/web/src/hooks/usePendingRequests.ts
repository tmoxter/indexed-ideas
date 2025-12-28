import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase";
import { logClientMessage } from "@/lib/clientLogger";
import type { PendingRequest } from "@/types";

export function usePendingRequests(limit = 20) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(`/api/pending-requests?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData?.error || "Unknown error");
        setRequests([]);
        return;
      }

      const result = await response.json();
      const pendingRequests = result?.items || [];

      await logClientMessage(
        `[pending-requests] Number of requests: ${pendingRequests.length}`,
        "info"
      );

      setRequests(pendingRequests);
    } catch (err) {
      setError("Failed to load pending requests");
      await logClientMessage(
        `Error loading pending requests: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return { requests, isLoading, error, reload: loadRequests };
}
