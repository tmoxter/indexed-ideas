"use client";

import type { ComponentProps } from "react";
import Navigation from "@/components/Navigation";
import { Circles } from "react-loader-spinner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type NavigationProps = ComponentProps<typeof Navigation>;

type LoadingSpinnerProps = {
  currentPage?: NavigationProps["currentPage"];
  user?: SupabaseUser | null;
  onLogout?: () => void;
};

export function LoadingSpinner({
  currentPage,
  user,
  onLogout,
}: LoadingSpinnerProps = {}) {
  const showNavigation = currentPage !== undefined && onLogout !== undefined;

  return (
    <div className="min-h-screen bg-[var(--page-background)]">
      {showNavigation ? (
        <Navigation
          currentPage={currentPage!}
          user={user ?? null}
          onLogout={onLogout!}
        />
      ) : null}

      <div className="flex items-center justify-center px-6 pt-32 pb-10 min-h-screen">
        <Circles color="#111827" width="24" height="24" visible={true} />
      </div>
    </div>
  );
}
