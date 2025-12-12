"use client";
import { ProfileListItem } from "./ProfileListItem";
import { ProfileDetail } from "./ProfileDetail";
import type { ProfileWithDetails } from "@/types";

interface ProfileListLayoutProps {
  profiles: ProfileWithDetails[];
  selectedProfile: ProfileWithDetails | null;
  onSelectProfile: (profile: ProfileWithDetails) => void;
  children?: React.ReactNode;
}

export function ProfileListLayout({
  profiles,
  selectedProfile,
  onSelectProfile,
  children,
}: ProfileListLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Mobile: Horizontal scroll at top, Desktop: Left sidebar */}
      <div className="lg:col-span-4 lg:p-4 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
        <h2 className="font-mono font-semibold text-gray-900 mb-4 lg:mb-4 px-4 lg:px-0">
          {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}
        </h2>

        {/* Mobile: Horizontal scroll carousel */}
        <div className="lg:hidden overflow-hidden -mx-6">
          <div className="flex gap-3 overflow-x-auto pb-4 px-6 snap-x snap-mandatory scroll-smooth">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex-shrink-0 w-64 snap-center">
                <ProfileListItem
                  profile={profile}
                  isSelected={selectedProfile?.id === profile.id}
                  onClick={() => onSelectProfile(profile)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Vertical list */}
        <div className="hidden lg:block space-y-2">
          {profiles.map((profile) => (
            <ProfileListItem
              key={profile.id}
              profile={profile}
              isSelected={selectedProfile?.id === profile.id}
              onClick={() => onSelectProfile(profile)}
            />
          ))}
        </div>
      </div>

      {/* Selected profile detail */}
      <div className="col-span-1 lg:col-span-8 rounded-xl border border-gray-500 shadow-lg overflow-hidden">
        <ProfileDetail profile={selectedProfile} />
        {children}
      </div>
    </div>
  );
}
