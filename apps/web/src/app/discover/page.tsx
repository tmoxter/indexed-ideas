"use client";

import { useState } from "react";
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

export default function MatchesPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const {
    candidates,
    isLoading: matchesLoading,
    error: matchesError,
    isProfileIncomplete,
  } = useMatches(user?.id);
  const { recordInteraction, isSubmitting } = useInteraction();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const currentCandidate = candidates[currentIndex];

  const goToNext = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowBlockConfirm(false);
    } else {
      setMessage("You've reviewed all available matches!");
    }
  };

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

    setTimeout(() => {
      goToNext();
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
    setTimeout(() => {
      goToNext();
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
      <Navigation
        currentPage="discover"
        user={user}
        onLogout={logout}
      />

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
                message={matchesError || "Please set-up your profile first to get started."}
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
          ) : matchesError && (
            <MessageBanner message={matchesError} type="error" />
          )}

          {!isProfileIncomplete && (
            <>
              {candidates.length === 0 ? (
                <EmptyState
                  title="no matches found"
                  description="make sure you've completed your profile and published it to start matching"
                  actionText="complete profile"
                  onAction={() => router.push("/profile")}
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
