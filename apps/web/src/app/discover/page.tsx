"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { DiscoverLoading } from "@/components/DiscoverLoading";
import { PageHeader } from "@/components/PageHeader";
import { MessageBanner } from "@/components/MessageBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProfileDetail } from "@/components/ProfileDetail";
import { ActionButtons } from "@/components/ActionButtons";
import { BlockButton, BlockConfirmation } from "@/components/BlockConfirmation";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useInteraction } from "@/hooks/useInteraction";
import { logClientMessage } from "@/lib/clientLogger";

export default function MatchesPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const {
    candidates,
    isLoading: matchesLoading,
    error: matchesError,
    isProfileIncomplete,
    reload,
  } = useMatches(user?.id);
  const { recordInteraction, isSubmitting } = useInteraction();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [errorUuid, setErrorUuid] = useState<string | null>(null);

  const currentCandidate = candidates[currentIndex];

  useEffect(() => {
    if (matchesError) {
      const uuid = crypto.randomUUID();
      setErrorUuid(uuid);
      logClientMessage(
        `Error loading discover profiles: ${matchesError}`,
        "error",
        uuid
      );
    } else {
      setErrorUuid(null);
    }
  }, [matchesError]);

  const handleAction = async (action: "like" | "pass") => {
    if (!currentCandidate) return;

    const success = await recordInteraction(currentCandidate.id, action);

    if (!success) {
      setMessage("There was an issue recording your interaction.");
      return;
    }

    if (action === "like") {
      setMessage(
        "Like recorded! If they like you back, you'll be matched automatically."
      );
    }

    setTimeout(async () => {
      await reload();
      setCurrentIndex(0);
      setMessage("");
    }, 800);
  };

  const handleBlock = async () => {
    if (!currentCandidate) return;

    const success = await recordInteraction(currentCandidate.id, "block");

    if (!success) {
      setMessage("There was an issue blocking this user.");
      setShowBlockConfirm(false);
      return;
    }

    setMessage("User blocked successfully.");
    setShowBlockConfirm(false);
    setTimeout(async () => {
      await reload();
      setCurrentIndex(0);
      setMessage("");
    }, 800);
  };

  if (isLoading || matchesLoading) {
    return (
      <DiscoverLoading
        width={260}
        height={180}
        currentPage="discover"
        user={user}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-background)] pb-10">
      <Navigation currentPage="discover" user={user} onLogout={logout} />

      <main className="px-6 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Discover Profiles"
            description="discover co-founders with similar ideas"
            highlight
          />

          {message && <MessageBanner message={message} />}

          {isProfileIncomplete ? (
            <div className="mb-6">
              <MessageBanner
                message={
                  matchesError && errorUuid
                    ? `An error occurred loading your profile. It was logged with reference: ${errorUuid.split("-")[0]}`
                    : "Please set-up your profile first to get started."
                }
                type="warning"
              />
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push("/profile")}
                  className="px-6 py-3 bg-blue-600 text-white font-mono text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Profile
                </button>
              </div>
            </div>
          ) : (
            matchesError &&
            errorUuid && (
              <MessageBanner
                message={`An error occurred loading discover profiles. It was logged with reference: ${errorUuid.split("-")[0]}`}
                type="error"
              />
            )
          )}

          {!isProfileIncomplete && (
            <>
              {candidates.length === 0 || currentIndex >= candidates.length ? (
                <EmptyState
                  title="No fresh profiles to view"
                  description="There are currently no more users matching your profile. You either have to relax your configured filters or wait for new users too join with novel ideas."
                  actionText="Return to Dashboard"
                  onAction={() => router.push("/home")}
                />
              ) : currentCandidate ? (
                <div className=" border rounded-md border-gray-400 shadow-md overflow-hidden">
                  <ProfileDetail profile={currentCandidate} />

                  <div className="p-6 border-t border-gray-100">
                    {!showBlockConfirm ? (
                      <>
                        <ActionButtons
                          onLike={() => handleAction("like")}
                          onSkip={() => handleAction("pass")}
                          isSubmitting={isSubmitting}
                        />
                        <div className="mt-4 flex justify-center">
                          <BlockButton
                            onClick={() => setShowBlockConfirm(true)}
                            isSubmitting={isSubmitting}
                          />
                        </div>
                      </>
                    ) : (
                      <BlockConfirmation
                        onConfirm={handleBlock}
                        onCancel={() => setShowBlockConfirm(false)}
                        isSubmitting={isSubmitting}
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
