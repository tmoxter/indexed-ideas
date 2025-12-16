import { useState, useEffect, useCallback } from "react";
import type { MatchCandidate } from "@/types";

export function useMatches(userId: string | undefined, limit = 20) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setIsProfileIncomplete(false);

    try {
      const response = await fetch(
        `/api/embeddings?userId=${userId}&limit=${limit}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData?.error || "Unknown error";

        if (errorData?.code === "PROFILE_INCOMPLETE" || errorMessage.includes("PROFILE_INCOMPLETE:")) {
          setIsProfileIncomplete(true);
          setError(errorMessage.replace("PROFILE_INCOMPLETE: ", ""));
        } else {
          setError(errorMessage);
        }
        setCandidates([]);
        return;
      }

      const result = await response.json();
      const matchCandidates = result?.items || [];

      if (!matchCandidates || matchCandidates.length === 0) {
        setError(
          "No potential matches found. Make sure you have published your profile and there are other users with similar ventures."
        );
        setCandidates([]);
        return;
      }

      setCandidates(matchCandidates);
    } catch (err) {
      setError("Failed to load matches");
      console.error("Error loading matches:", err);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    if (userId) {
      loadMatches();
    }
  }, [userId, loadMatches]);

  return { candidates, isLoading, error, isProfileIncomplete, reload: loadMatches };
}
