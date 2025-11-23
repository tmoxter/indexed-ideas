"use client";

import type { ComponentProps } from "react";
import Image from "next/image";
import { Rings } from "react-loader-spinner";
import Navigation from "@/components/Navigation";

type NavigationProps = ComponentProps<typeof Navigation>;

type DiscoverLoadingProps = {
  width?: number;
  height?: number;
  currentPage?: NavigationProps["currentPage"];
  userEmail?: string;
  onLogout?: () => void;
};

export function DiscoverLoading({
  width = 120,
  height = 120,
  currentPage,
  userEmail,
  onLogout,
}: DiscoverLoadingProps) {
  const showNavigation = currentPage !== undefined && onLogout !== undefined;

  return (
    <div className="min-h-screen bg-[var(--page-background)]">
      {showNavigation ? (
        <Navigation
          currentPage={currentPage!}
          userEmail={userEmail}
          onLogout={onLogout!}
        />
      ) : null}
      <div className="flex flex-col items-center justify-center px-6 pt-32 pb-10 min-h-screen gap-6">
        <Image
          src="/eyes.gif"
          alt="Searching animation"
          width={width}
          height={height}
          priority
        />
        <div className="flex items-center gap-3">
          <Rings
            height="28"
            width="28"
            color="#1f2937"
            ariaLabel="Searching"
            visible
          />
          <p className="text-xl font-mono text-gray-800">Searching...</p>
        </div>
      </div>
    </div>
  );
}
