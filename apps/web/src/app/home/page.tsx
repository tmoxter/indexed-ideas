"use client";

import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TickerBanner } from "@/components/TickerBanner";
import { NavigationCard } from "@/components/NavigationCard";
import { useAuth } from "@/hooks/useAuth";
import { useBannerCounts } from "@/hooks/useBannerCounts";
import { Search, Handshake, User, Settings, Undo2, Clock } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const bannerData = useBannerCounts();

  if (isLoading) {
    return (
      <LoadingSpinner
        currentPage="home"
        user={user}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-background)] pb-10">
      <Navigation
        currentPage="home"
        user={user}
        onLogout={logout}
      />

      <main className="pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <TickerBanner data={bannerData} />
        </div>

        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2"></h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NavigationCard
              Icon={Search}
              title="Discover Profiles"
              description="discover co-founders with similar ideas and send them a like if you want to connect"
              onClick={() => router.push("/discover")}
            />

            <NavigationCard
              Icon={Clock}
              title="Pending Requests"
              description="review and respond to people who have liked your profile and want to connect with you"
              onClick={() => router.push("/pending-requests")}
            />

            <NavigationCard
              Icon={Handshake}
              title="Matches"
              description="view your matches and connect with co-founders who are interested in collaborating"
              onClick={() => router.push("/matches")}
            />

            <NavigationCard
              Icon={Undo2}
              title="Revisit Skipped Profiles"
              description="review profiles you previously skipped and reconsider potential connections"
              onClick={() => router.push("/skipped")}
            />

            <NavigationCard
              Icon={User}
              title="My Profile"
              description="edit your user profile, venture ideas, and co-founder preferences"
              onClick={() => router.push("/profile")}
            />

            <NavigationCard
              Icon={Settings}
              title="Settings"
              description="manage your account settings, matching preferences, and blocked profiles"
              onClick={() => router.push("/settings")}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
