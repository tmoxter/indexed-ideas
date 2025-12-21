"use client";

import { useEffect, useState, useMemo } from "react";
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
import { useSkippedProfiles } from "@/hooks/useSkippedProfiles";
import { useInteraction } from "@/hooks/useInteraction";

export default function SkippedProfilesPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const {
    profiles,
    isLoading: profilesLoading,
    error,
    reload,
  } = useSkippedProfiles(user?.id);
  const { recordInteraction, isSubmitting } = useInteraction();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const selectedProfile = useMemo(
    () => profiles.find((m) => m.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  useEffect(() => {
    if (profilesLoading) return;

    if (selectedProfileId && profiles.some((m) => m.id === selectedProfileId)) {
      return; // still valid, keep it
    }
    if (profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    } else {
      setSelectedProfileId(null);
    }
  }, [profiles, profilesLoading, selectedProfileId]);

  // Hard gate rendering until user + matches ready (prevents hydration mismatch)
  if (isLoading || profilesLoading) {
    return (
      <LoadingSpinner currentPage="skipped" user={user} onLogout={logout} />
    );
  }

  const handleLike = async () => {
    if (!selectedProfile) return;

    const success = await recordInteraction(selectedProfile.id, "like");

    if (!success) {
      setMessage("Failed to like user");
      return;
    }

    setMessage(
      "User liked! They'll be moved to matches if they like you back."
    );
    await reload();
  };

  const handleBlock = async () => {
    if (!selectedProfile) return;

    const success = await recordInteraction(selectedProfile.id, "block");

    if (!success) {
      setMessage("Failed to block user");
      setShowBlockConfirm(false);
      return;
    }

    setMessage("User blocked successfully");
    setShowBlockConfirm(false);
    await reload();
  };

  if (isLoading || profilesLoading) {
    return (
      <LoadingSpinner currentPage="skipped" user={user} onLogout={logout} />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-background)] pb-10 overflow-x-hidden">
      <Navigation currentPage="skipped" user={user} onLogout={logout} />

      <main className="px-6 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Skipped Profiles"
            highlight
            description="revist profiles you skipped on your first encounter"
          />

          {message && <MessageBanner message={message} />}
          {error && <MessageBanner message={error} type="error" />}

          {profiles.length === 0 ? (
            <EmptyState
              title="No skipped profiles"
              description="profiles you skip will appear here"
              actionText="Discover Co-Founders"
              onAction={() => router.push("/discover")}
            />
          ) : (
            <ProfileListLayout
              profiles={profiles}
              selectedProfile={selectedProfile}
              onSelectProfile={(m) => setSelectedProfileId(m.id)}
            >
              <div className="p-6 border-t border-gray-100">
                {!showBlockConfirm ? (
                  <>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleLike}
                        disabled={isSubmitting}
                        className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-0.5"
                      >
                        {isSubmitting ? "saving..." : "Let's connect"}
                      </button>
                    </div>
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
            </ProfileListLayout>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
