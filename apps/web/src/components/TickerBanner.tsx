"use client";
import { ChartColumnStacked } from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import type { BannerData } from "@/types";

interface TickerBannerProps {
  data: BannerData | null;
}

export function TickerBanner({ data }: TickerBannerProps) {
  if (!data) {
    return (
      <div className="mb-8 flex justify-center">
        <InfinitySpin color="#c7defb" width="200" />
      </div>
    );
  }

  const bannerText = `Currently, there are ${data.total_profiles} profiles matching your location filter. ${data.related_topics} are working on related topics.`;

  const renderTickerSentence = () => (
    <div className="flex items-center gap-2 md:gap-3">
      <ChartColumnStacked
        className="w-5 h-5 md:w-6 md:h-6 text-gray-700"
        aria-hidden="true"
      />
      <p className="font-mono text-base md:text-2xl font-semibold text-gray-800">
        {bannerText}
      </p>
    </div>
  );

  return (
    <div className="mb-8 overflow-hidden">
      <div className="ticker-animate flex gap-8 md:gap-16 whitespace-nowrap">
        {renderTickerSentence()}
        {renderTickerSentence()}
      </div>
    </div>
  );
}
