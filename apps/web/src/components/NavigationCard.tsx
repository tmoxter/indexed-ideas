"use client";
import { LucideIcon } from "lucide-react";

interface NavigationCardProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  badgeCount?: number;
}

export function NavigationCard({
  Icon,
  title,
  description,
  onClick,
  badgeCount,
}: NavigationCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-6 rounded border border-gray-900 text-left shadow-md hover:border-gray-950 hover:shadow-xl transition-all duration-200 group relative"
    >
      {badgeCount !== undefined && badgeCount > 0 && (
        <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-mono font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {badgeCount > 99 ? "99+" : badgeCount}
        </div>
      )}
      <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient group-hover:scale-110 transition-transform duration-200">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 text-sm font-mono">{description}</p>
    </button>
  );
}
