"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { Home, User, ClipboardList, MessageSquare } from "lucide-react";

// BlueWell Navigation Bar
export interface NavigationBarProps {
  className?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ className }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show nav on welcome/onboarding pages
  if (pathname === "/welcome" || pathname === "/onboarding" || pathname === "/") {
    return null;
  }

  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    { id: "plan", label: "Plan", icon: User, path: "/plan" },
    { id: "ai", label: "AI", icon: MessageSquare, path: "/ai" },
    { id: "log", label: "Log", icon: ClipboardList, path: "/log" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-neutral-white border-t-2 border-neutral-border z-50 shadow-lg",
        className
      )}
    >
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isAI = item.id === "ai";
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
                  active
                    ? "text-bluewell-light"
                    : "text-neutral-muted hover:text-neutral-dark"
                )}
              >
                {isAI && active ? (
                  // Special styling for active AI icon with blue circular border
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-10 h-10 rounded-full border-2 border-bluewell-light" />
                    <Icon className="h-5 w-5 relative z-10 text-bluewell-light" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      active && "bg-bluewell-light/20"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

