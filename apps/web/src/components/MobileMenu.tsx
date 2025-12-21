"use client";

import {
  Search,
  Handshake,
  Undo2,
  Settings,
  LogOut,
  User,
  Home,
  Clock,
  X,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  user: SupabaseUser | null;
  userName: string | null;
  isLoadingUserName: boolean;
}

export default function MobileMenu({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
  onLogout,
  user,
  userName,
  isLoadingUserName,
}: MobileMenuProps) {
  const handleNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  const menuItems = [
    {
      section: "Discover",
      items: [
        { icon: Home, label: "Dashboard", path: "/home", page: "home" },
        {
          icon: Search,
          label: "Discover Profiles",
          path: "/discover",
          page: "discover",
        },
      ],
    },
    {
      section: "History",
      items: [
        {
          icon: Clock,
          label: "Pending Requests",
          path: "/pending-requests",
          page: "pending-requests",
        },
        {
          icon: Handshake,
          label: "Matches",
          path: "/matches",
          page: "my-matches",
        },
        {
          icon: Undo2,
          label: "Skipped Profiles",
          path: "/skipped",
          page: "skipped",
        },
      ],
    },
    {
      section: "Account",
      items: [
        { icon: User, label: "Profile", path: "/profile", page: "profile" },
        {
          icon: Settings,
          label: "Account Settings",
          path: "/settings",
          page: "settings",
        },
      ],
    },
  ];

  return (
    <>
      {/* Full-screen Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-full z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "#FFFFFB" }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex flex-col">
              <span className="font-mono text-sm font-semibold text-gray-900">
                Menu
              </span>
              {user &&
                !isLoadingUserName &&
                (userName ? (
                  <span className="font-mono text-xs text-gray-600 mt-1">
                    {userName}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      onNavigate("/profile");
                    }}
                    className="font-mono text-xs text-gray-600 mt-1 text-left hover:text-gray-900 hover:underline transition-colors"
                  >
                    Create a Profile
                  </button>
                ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4">
            {menuItems.map((section) => (
              <div key={section.section} className="mb-6">
                <div className="px-6 mb-2">
                  <span className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.section}
                  </span>
                </div>
                <div className="space-y-1 px-3">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.page;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md font-mono text-sm transition-colors ${
                          isActive
                            ? "bg-gray-100 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer with Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-mono text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
