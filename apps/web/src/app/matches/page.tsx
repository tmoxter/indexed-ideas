"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { MessageBanner } from "@/components/MessageBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProfileListLayout } from "@/components/ProfileListLayout";
import { BlockButton, BlockConfirmation } from "@/components/BlockConfirmation";
import { useAuth } from "@/hooks/useAuth";
import { useMyMatches } from "@/hooks/useMyMatches";
import { useInteraction } from "@/hooks/useInteraction";
import { ExternalLink } from "lucide-react";

export default function MyMatchesPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const {
    matches,
    isLoading: matchesLoading,
    error,
    reload,
  } = useMyMatches(user?.id);
  const { recordInteraction, isSubmitting } = useInteraction();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );

  useEffect(() => {
    if (matchesLoading) return;

    if (selectedMatchId && matches.some((m) => m.id === selectedMatchId)) {
      return; // still valid, keep it
    }
    if (matches.length > 0) {
      setSelectedMatchId(matches[0].id);
    } else {
      setSelectedMatchId(null);
    }
  }, [matches, matchesLoading, selectedMatchId]);

  // Hard gate rendering until user + matches ready (prevents hydration mismatch)
  if (isLoading || matchesLoading) {
    return (
      <LoadingSpinner
        currentPage="my-matches"
        user={user}
        onLogout={logout}
      />
    );
  }

  const handleBlock = async () => {
    if (!selectedMatch) return;
    const success = await recordInteraction(selectedMatch.id, "block");
    if (!success) {
      setMessage("Failed to block user");
      setShowBlockConfirm(false);
      return;
    }
    setMessage("User blocked successfully");
    setShowBlockConfirm(false);
    await reload();
  };

  return (
    <div className="min-h-screen bg-[var(--page-background)] pb-10 overflow-x-hidden">
      <Navigation
        currentPage="my-matches"
        user={user}
        onLogout={logout}
      />

      <main className="px-6 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
          title="Matches" highlight
          description="view your matches and connect with co-founders"
          />

          {message && <MessageBanner message={message} />}
          {error && <MessageBanner message={error} type="error" />}

          {matches.length === 0 ? (
            <EmptyState
              title="No matches yet"
              description="browse user profiles to find potential co-founders"
              actionText="Discover Co-Founders"
              onAction={() => router.push("/discover")}
            />
          ) : (
            <ProfileListLayout
              profiles={matches}
              selectedProfile={selectedMatch}
              onSelectProfile={(m) => setSelectedMatchId(m.id)}
            >
              <div className="p-6 border-t border-gray-100">
                {!showBlockConfirm ? (
                  <div className="flex flex-col gap-3">
                    {selectedMatch?.profile?.avatarurl && (
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            window.open(
                              selectedMatch.profile.avatarurl,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-0.5"
                        >
                          Connect on LinkedIn
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex justify-center">
                      <BlockButton
                        onClick={() => setShowBlockConfirm(true)}
                        isSubmitting={isSubmitting}
                      />
                    </div>
                  </div>
                ) : (
                  <BlockConfirmation
                    onConfirm={handleBlock}
                    onCancel={() => setShowBlockConfirm(false)}
                    isSubmitting={isSubmitting}
                  />
                )}
              </div>
            </ProfileListLayout>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
