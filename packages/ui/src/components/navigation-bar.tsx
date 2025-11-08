"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { Home, Users, Circle, Bot, User } from "lucide-react";

// BlueWell Navigation Bar
export interface NavigationBarProps {
  className?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ className }) => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    { id: "plan", label: "Plan", icon: Users, path: "/plan" },
    { id: "log", label: "Log", icon: Circle, path: "/log" },
    { id: "ai", label: "AI", icon: Bot, path: "/ai" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-neutral-white border-t border-neutral-border z-50",
        className
      )}
    >
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
                  active
                    ? "text-bluewell-royal"
                    : "text-neutral-muted hover:text-neutral-dark"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    active && "bg-bluewell-light/20"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

